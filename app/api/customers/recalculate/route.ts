import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/customers/recalculate
 * Recalculate all customer balances based on payment savedToBalance
 * This fixes corrupted balance data from old incorrect logic
 * Admin only
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all customers
        const customers = await prisma.customer.findMany({
            include: {
                payments: true,
                meterReadings: {
                    include: {
                        bill: true,
                    },
                },
            },
        });

        let fixedCount = 0;
        const results: Array<{
            id: number;
            name: string;
            oldBalance: number;
            newBalance: number;
            totalBill: number;
            totalPaid: number;
        }> = [];

        for (const customer of customers) {
            // Calculate correct totalBill from bills
            let totalBill = 0;
            let totalPaid = 0;

            for (const reading of customer.meterReadings) {
                if (reading.bill) {
                    totalBill += Number(reading.bill.totalAmount);
                    totalPaid += Number(reading.bill.amountPaid);
                }
            }

            // Parse payments to extract savedToBalance
            // Payment description format: "Lunas: Januari 2026 | +Rp 400 ke saldo"
            let savedBalance = 0;
            for (const payment of customer.payments) {
                const match = payment.description?.match(/\+Rp\s*([\d.,]+)\s*ke saldo/i);
                if (match) {
                    const amount = parseInt(match[1].replace(/[.,]/g, ''));
                    if (!isNaN(amount)) {
                        savedBalance += amount;
                    }
                }
            }

            const oldBalance = Number(customer.balance);
            const newBalance = savedBalance; // balance = only savedToBalance

            // Only update if values changed
            if (
                totalBill !== Number(customer.totalBill) ||
                totalPaid !== Number(customer.totalPaid) ||
                newBalance !== oldBalance
            ) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        totalBill: totalBill,
                        totalPaid: totalPaid,
                        balance: newBalance,
                    },
                });

                results.push({
                    id: customer.id,
                    name: customer.name,
                    oldBalance: oldBalance,
                    newBalance: newBalance,
                    totalBill: totalBill,
                    totalPaid: totalPaid,
                });

                fixedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Recalculated ${fixedCount} customers`,
            count: fixedCount,
            total: customers.length,
            results: results.slice(0, 20), // Show first 20
        });
    } catch (error) {
        console.error('Error recalculating balances:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to recalculate balances' },
            { status: 500 }
        );
    }
}
