import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const billId = parseInt(id, 10);
        const body = await request.json();
        const { amountPaid, penalty = 0 } = body;

        if (typeof amountPaid !== 'number' || amountPaid <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount paid' },
                { status: 400 }
            );
        }

        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: {
                meterReading: {
                    include: {
                        customer: true,
                    },
                },
            },
        });

        if (!bill) {
            return NextResponse.json(
                { success: false, error: 'Bill not found' },
                { status: 404 }
            );
        }

        const totalDue = Number(bill.totalAmount) + Number(penalty) - Number(bill.amountPaid);
        const newAmountPaid = Number(bill.amountPaid) + amountPaid;
        const totalWithPenalty = Number(bill.totalAmount) + Number(penalty);

        let paymentStatus = 'pending';
        let change = 0;
        let remaining = totalWithPenalty - newAmountPaid;

        if (newAmountPaid >= totalWithPenalty) {
            paymentStatus = 'paid';
            change = newAmountPaid - totalWithPenalty;
            remaining = 0;
        } else if (newAmountPaid > 0) {
            paymentStatus = 'partial';
        }

        const updatedBill = await prisma.bill.update({
            where: { id: billId },
            data: {
                amountPaid: newAmountPaid,
                penalty: Number(bill.penalty) + penalty,
                paymentStatus,
                remaining,
                change,
                paidAt: paymentStatus === 'paid' ? new Date() : null,
            },
            include: {
                meterReading: {
                    include: {
                        customer: true,
                    },
                },
                items: true,
            },
        });

        // Update customer outstanding balance
        if (remaining > 0) {
            await prisma.customer.update({
                where: { id: bill.meterReading.customerId },
                data: {
                    outstandingBalance: remaining,
                },
            });
        } else {
            await prisma.customer.update({
                where: { id: bill.meterReading.customerId },
                data: {
                    outstandingBalance: 0,
                },
            });
        }

        const formattedBill = {
            id: updatedBill.id,
            customer: {
                id: updatedBill.meterReading.customerId,
                name: updatedBill.meterReading.customer.name,
                customerNumber: updatedBill.meterReading.customer.customerNumber,
            },
            meterReading: {
                period: updatedBill.meterReading.period,
                meterStart: updatedBill.meterReading.meterStart,
                meterEnd: updatedBill.meterReading.meterEnd,
                usage: updatedBill.meterReading.usage,
            },
            totalAmount: Number(updatedBill.totalAmount),
            paymentStatus: updatedBill.paymentStatus,
            penalty: Number(updatedBill.penalty),
            amountPaid: Number(updatedBill.amountPaid),
            remaining: Number(updatedBill.remaining),
            change: Number(updatedBill.change),
            paidAt: updatedBill.paidAt,
            items: updatedBill.items.map((item) => ({
                type: item.type,
                usage: item.usage,
                rate: item.rate,
                amount: Number(item.amount),
            })),
        };

        return NextResponse.json({
            success: true,
            data: formattedBill,
            message: paymentStatus === 'paid'
                ? `Payment complete! Change: Rp ${change.toLocaleString()}`
                : `Partial payment recorded. Remaining: Rp ${remaining.toLocaleString()}`,
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process payment' },
            { status: 500 }
        );
    }
}
