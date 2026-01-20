import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 * List all customers with their outstanding balance
 * Phone numbers are hidden for non-admin users
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const isAdmin = role === 'admin';

        const customers = await prisma.customer.findMany({
            orderBy: { customerNumber: 'asc' },
            select: {
                id: true,
                name: true,
                customerNumber: true,
                phone: true,
                totalBill: true,
                totalPaid: true,
                balance: true,
                lastNotifiedAt: true,
                meterReadings: {
                    where: {
                        bill: {
                            paymentStatus: { not: 'paid' }
                        }
                    },
                    select: {
                        period: true,
                        bill: {
                            select: {
                                remaining: true,
                                paymentStatus: true,
                            }
                        }
                    }
                }
            },
        });

        const now = new Date();
        const PENALTY_AMOUNT = 5000;

        const formattedCustomers = customers.map((customer) => {
            // Calculate outstanding from actual unpaid bills + penalties
            let realOutstanding = 0;

            customer.meterReadings.forEach((mr) => {
                const bill = mr.bill;
                if (!bill) return;

                realOutstanding += Number(bill.remaining);

                // Calculate penalty using period from MeterReading
                const [year, month] = mr.period.split('-').map(Number);
                const dueDate = new Date(year, month, 0); // Last day of month
                dueDate.setHours(23, 59, 59, 999);

                // If overdue, add penalty
                if (now > dueDate) {
                    realOutstanding += PENALTY_AMOUNT;
                }
            });

            return {
                id: customer.id,
                name: customer.name,
                customerNumber: customer.customerNumber,
                phone: isAdmin ? customer.phone : null, // Hide phone for non-admin
                totalBill: Number(customer.totalBill),
                totalPaid: Number(customer.totalPaid),
                outstanding: realOutstanding, // Uses calculated value with penalties
                balance: Number(customer.balance), // saldo simpanan
                lastNotifiedAt: customer.lastNotifiedAt,
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedCustomers,
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/customers
 * Create a new customer (admin only)
 * Customer number is auto-generated
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, role } = body;

        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Nama wajib diisi' },
                { status: 400 }
            );
        }

        // Auto-generate customer number (max + 1)
        const maxCustomer = await prisma.customer.findFirst({
            orderBy: { customerNumber: 'desc' },
            select: { customerNumber: true },
        });
        const newCustomerNumber = (maxCustomer?.customerNumber || 0) + 1;

        const customer = await prisma.customer.create({
            data: {
                name,
                customerNumber: newCustomerNumber,
                phone: phone || null,
            },
        });

        return NextResponse.json({
            success: true,
            data: customer,
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}
