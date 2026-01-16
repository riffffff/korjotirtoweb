import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        period: string;
    }>;
};

/**
 * DELETE /api/bills/period/:period
 * Hard delete all bills for a given period (admin only)
 * Period format: YYYY-MM (e.g., "2026-01")
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { period } = await params;
        const body = await request.json();
        const { role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Validate period format
        if (!/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json(
                { success: false, error: 'Invalid period format. Use YYYY-MM' },
                { status: 400 }
            );
        }

        // Get all bills for this period
        const bills = await prisma.bill.findMany({
            where: {
                meterReading: {
                    period: period,
                },
            },
            include: {
                meterReading: true,
            },
        });

        if (bills.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No bills found for this period' },
                { status: 404 }
            );
        }

        // Get unique customer IDs affected
        const customerIds = [...new Set(bills.map(b => b.meterReading.customerId))];
        const billIds = bills.map(b => b.id);
        const meterReadingIds = bills.map(b => b.meterReadingId);

        // Hard delete in transaction
        await prisma.$transaction(async (tx) => {
            // Delete bill items
            await tx.billItem.deleteMany({
                where: { billId: { in: billIds } },
            });

            // Delete bills
            await tx.bill.deleteMany({
                where: { id: { in: billIds } },
            });

            // Delete meter readings
            await tx.meterReading.deleteMany({
                where: { id: { in: meterReadingIds } },
            });

            // Recalculate totals for each affected customer
            for (const customerId of customerIds) {
                const remainingBills = await tx.bill.findMany({
                    where: {
                        meterReading: {
                            customerId: customerId,
                        },
                    },
                });

                const totalBill = remainingBills.reduce(
                    (sum, b) => sum + Number(b.totalAmount),
                    0
                );
                const totalPaid = remainingBills.reduce(
                    (sum, b) => sum + Number(b.amountPaid),
                    0
                );
                const outstandingBalance = totalBill - totalPaid;

                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        totalBill: totalBill,
                        totalPaid: totalPaid,
                        outstandingBalance: outstandingBalance,
                    },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Deleted ${bills.length} bills for period ${period}`,
            count: bills.length,
        });
    } catch (error) {
        console.error('Error deleting bills by period:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete bills' },
            { status: 500 }
        );
    }
}
