import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * DELETE /api/bills/:id
 * Hard delete a bill (admin only)
 * Also deletes related meter reading and bill items
 * Recalculates customer totals
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const billId = parseInt(id, 10);
        const body = await request.json();
        const { role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get bill with meter reading to find customer
        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: {
                meterReading: true,
                items: true,
            },
        });

        if (!bill) {
            return NextResponse.json(
                { success: false, error: 'Bill not found' },
                { status: 404 }
            );
        }

        const customerId = bill.meterReading.customerId;

        // Hard delete in transaction
        await prisma.$transaction(async (tx) => {
            // Delete bill items first (foreign key constraint)
            await tx.billItem.deleteMany({
                where: { billId: billId },
            });

            // Delete bill
            await tx.bill.delete({
                where: { id: billId },
            });

            // Delete meter reading
            await tx.meterReading.delete({
                where: { id: bill.meterReadingId },
            });

            // Recalculate customer totals
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

            // Update customer totals
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    totalBill: totalBill,
                    totalPaid: totalPaid,
                    outstandingBalance: outstandingBalance,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Bill deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting bill:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete bill' },
            { status: 500 }
        );
    }
}
