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

        // Logic copied exactly from app/api/customers/[id]/route.ts
        const PENALTY_PER_BILL = 5000;
        const calculatePenalty = (period: string, paymentStatus: string, paidAt: Date | null): number => {
            const [year, month] = period.split('-').map(Number);
            const dueDate = new Date(year, month, 0);
            dueDate.setHours(23, 59, 59, 999);

            if (paymentStatus === 'paid') {
                if (paidAt && new Date(paidAt) > dueDate) {
                    return PENALTY_PER_BILL;
                }
                return 0;
            }

            const today = new Date();
            if (today <= dueDate) return 0;

            return PENALTY_PER_BILL;
        };

        const formattedCustomers = customers.map((customer) => {
            let realOutstanding = 0;

            customer.meterReadings.forEach((mr) => {
                const bill = mr.bill;
                if (!bill) return;

                // Only calculate outstanding for UNPAID bills (matching detail page logic)
                if (bill.paymentStatus !== 'paid') {
                   const penalty = calculatePenalty(mr.period, bill.paymentStatus, null); // passing null for paidAt since it's unpaid
                   realOutstanding += Number(bill.remaining) + penalty;
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
