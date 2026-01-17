import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * GET /api/customers/:id
 * Get customer details with all bill history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                name: true,
                customerNumber: true,
                phone: true,
                totalBill: true,
                totalPaid: true,
                balance: true,
                lastNotifiedAt: true,
                payments: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
        });

        if (!customer) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Get all bills for this customer, ordered by period (latest first)
        const bills = await prisma.bill.findMany({
            where: {
                meterReading: {
                    customerId: customerId,
                },
            },
            include: {
                meterReading: true,
                items: true,
            },
            orderBy: {
                meterReading: {
                    period: 'desc',
                },
            },
        });

        // Helper: Calculate penalty for overdue bills
        // Bills are due at end of their period month
        // Penalty = Rp 5,000 per month overdue
        const PENALTY_PER_MONTH = 5000;
        const calculatePenalty = (period: string, paymentStatus: string, paidAt: Date | null): number => {
            const [year, month] = period.split('-').map(Number);
            const dueDate = new Date(year, month, 0); // Last day of period month

            // For paid bills, calculate penalty based on when it was paid
            if (paymentStatus === 'paid' && paidAt) {
                if (paidAt <= dueDate) return 0; // Paid on time

                // Calculate months between due date and payment date
                const monthsOverdue =
                    (paidAt.getFullYear() - dueDate.getFullYear()) * 12 +
                    (paidAt.getMonth() - dueDate.getMonth());

                return Math.max(0, monthsOverdue) * PENALTY_PER_MONTH;
            }

            // For unpaid/partial bills, calculate based on current date
            const today = new Date();
            if (today <= dueDate) return 0;

            const monthsOverdue =
                (today.getFullYear() - dueDate.getFullYear()) * 12 +
                (today.getMonth() - dueDate.getMonth());

            return Math.max(0, monthsOverdue) * PENALTY_PER_MONTH;
        };

        const formattedBills = bills.map((bill) => {
            const penalty = calculatePenalty(bill.meterReading.period, bill.paymentStatus, bill.paidAt);

            const totalWithPenalty = Number(bill.totalAmount) + penalty;

            return {
                id: bill.id,
                period: bill.meterReading.period,
                meterStart: bill.meterReading.meterStart,
                meterEnd: bill.meterReading.meterEnd,
                usage: bill.meterReading.usage,
                totalAmount: Number(bill.totalAmount),
                penalty,
                totalWithPenalty,
                amountPaid: Number(bill.amountPaid),
                remaining: Number(bill.remaining) + penalty,
                paymentStatus: bill.paymentStatus,
                paidAt: bill.paidAt,
                items: bill.items.map((item) => ({
                    type: item.type,
                    usage: item.usage,
                    rate: item.rate,
                    amount: Number(item.amount),
                })),
            };
        });

        const formattedPayments = customer.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            description: p.description || '-',
            createdAt: p.createdAt.toISOString(),
        }));

        // Calculate totals including penalties
        const totalBillWithPenalty = formattedBills.reduce((sum, b) => sum + b.totalWithPenalty, 0);
        const totalPaid = Number(customer.totalPaid);
        const outstandingWithPenalty = formattedBills
            .filter(b => b.paymentStatus !== 'paid')
            .reduce((sum, b) => sum + (b.totalWithPenalty - b.amountPaid), 0);

        return NextResponse.json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    customerNumber: customer.customerNumber,
                    phone: customer.phone,
                    totalBill: totalBillWithPenalty,
                    totalPaid: totalPaid,
                    balance: outstandingWithPenalty,
                    lastNotifiedAt: customer.lastNotifiedAt,
                },
                bills: formattedBills,
                payments: formattedPayments,
            },
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch customer' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/customers/:id
 * Update customer data (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);
        const body = await request.json();
        const { name, phone, role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Nama wajib diisi' },
                { status: 400 }
            );
        }

        const customer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                name,
                phone: phone || null,
            },
        });

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update customer' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/customers/:id
 * Soft delete customer (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);
        const body = await request.json();
        const { role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Hard delete customer and related data
        await prisma.$transaction(async (tx) => {
            // Get all meter readings for this customer
            const readings = await tx.meterReading.findMany({
                where: { customerId: customerId },
                select: { id: true },
            });
            const readingIds = readings.map(r => r.id);

            // Delete bill items for all bills
            if (readingIds.length > 0) {
                await tx.billItem.deleteMany({
                    where: {
                        bill: {
                            meterReadingId: { in: readingIds },
                        },
                    },
                });

                // Delete bills
                await tx.bill.deleteMany({
                    where: {
                        meterReadingId: { in: readingIds },
                    },
                });

                // Delete meter readings
                await tx.meterReading.deleteMany({
                    where: { customerId: customerId },
                });
            }

            // Delete customer
            await tx.customer.delete({
                where: { id: customerId },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Customer deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete customer' },
            { status: 500 }
        );
    }
}
