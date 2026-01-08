import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to format period "2026-01" to "Januari 2026"
function formatPeriodName(period: string): string {
    const [year, month] = period.split('-');
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};


/**
 * PATCH /api/customers/:id/pay
 * Process payment for a customer using FIFO allocation
 * Allocates payment to oldest unpaid bills first
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id, 10);
        const body = await request.json();
        const { amount, role } = body;

        // Validate admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Only admin can process payments' },
                { status: 403 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid payment amount' },
                { status: 400 }
            );
        }

        // Get customer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Get all unpaid bills for this customer, ordered by period (oldest first = FIFO)
        const unpaidBills = await prisma.bill.findMany({
            where: {
                deletedAt: null,
                paymentStatus: { not: 'paid' },
                meterReading: {
                    customerId: customerId,
                    deletedAt: null,
                },
            },
            include: {
                meterReading: true,
            },
            orderBy: {
                meterReading: {
                    period: 'asc',
                },
            },
        });

        let remainingPayment = amount;
        const updatedBills: Array<{
            id: number;
            period: string;
            totalAmount: number;
            amountPaid: number;
            remaining: number;
            status: string;
        }> = [];

        // FIFO allocation - pay oldest bills first
        for (const bill of unpaidBills) {
            if (remainingPayment <= 0) break;

            const billRemaining = Number(bill.totalAmount) - Number(bill.amountPaid);
            const paymentForThisBill = Math.min(remainingPayment, billRemaining);

            const newAmountPaid = Number(bill.amountPaid) + paymentForThisBill;
            const newRemaining = Number(bill.totalAmount) - newAmountPaid;
            const newStatus = newRemaining === 0 ? 'paid' : 'partial';

            // Update bill
            await prisma.bill.update({
                where: { id: bill.id },
                data: {
                    amountPaid: newAmountPaid,
                    remaining: newRemaining,
                    paymentStatus: newStatus,
                    paidAt: newStatus === 'paid' ? new Date() : null,
                },
            });

            updatedBills.push({
                id: bill.id,
                period: bill.meterReading.period,
                totalAmount: Number(bill.totalAmount),
                amountPaid: newAmountPaid,
                remaining: newRemaining,
                status: newStatus,
            });

            remainingPayment -= paymentForThisBill;
        }

        // Update customer totals
        const newTotalPaid = Number(customer.totalPaid) + amount;
        const newOutstanding = Number(customer.totalBill) - newTotalPaid;

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                totalPaid: newTotalPaid,
                outstandingBalance: Math.max(0, newOutstanding),
            },
        });

        // Generate payment description - only mention fully paid (Lunas) bills
        const paidPeriods = updatedBills
            .filter(b => b.status === 'paid')
            .map(b => formatPeriodName(b.period))
            .join(', ');

        let description = paidPeriods ? `Lunas: ${paidPeriods}` : 'Pembayaran';


        // Create Payment Record
        await prisma.payment.create({
            data: {
                customerId,
                amount,
                description: description.trim(),
            }
        });

        // Calculate change (if payment exceeds total outstanding)
        const change = remainingPayment > 0 ? remainingPayment : 0;

        return NextResponse.json({
            success: true,
            data: {
                customer: {
                    id: updatedCustomer.id,
                    name: updatedCustomer.name,
                    totalBill: Number(updatedCustomer.totalBill),
                    totalPaid: Number(updatedCustomer.totalPaid),
                    outstandingBalance: Number(updatedCustomer.outstandingBalance),
                },
                payment: {
                    amount: amount,
                    allocated: amount - change,
                    change: change,
                },
                billsUpdated: updatedBills,
            },
            message: change > 0
                ? `Payment complete! Change: Rp ${change.toLocaleString()}`
                : updatedBills.some(b => b.status === 'paid')
                    ? `Payment processed. ${updatedBills.filter(b => b.status === 'paid').length} bill(s) paid.`
                    : 'Partial payment recorded.',
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process payment' },
            { status: 500 }
        );
    }
}
