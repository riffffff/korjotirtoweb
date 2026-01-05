import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        period: string;
    }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { period } = await params;

        const bills = await prisma.bill.findMany({
            where: {
                deletedAt: null,
                meterReading: {
                    period: period,
                    deletedAt: null,
                },
            },
            include: {
                meterReading: {
                    include: {
                        customer: true,
                    },
                },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedBills = bills.map((bill) => ({
            id: bill.id,
            customer: {
                id: bill.meterReading.customerId,
                name: bill.meterReading.customer.name,
                customerNumber: bill.meterReading.customer.customerNumber,
            },
            meterReading: {
                period: bill.meterReading.period,
                meterStart: bill.meterReading.meterStart,
                meterEnd: bill.meterReading.meterEnd,
                usage: bill.meterReading.usage,
            },
            totalAmount: Number(bill.totalAmount),
            paymentStatus: bill.paymentStatus,
            penalty: Number(bill.penalty),
            amountPaid: Number(bill.amountPaid),
            remaining: Number(bill.remaining),
            paidAt: bill.paidAt,
            items: bill.items.map((item) => ({
                type: item.type,
                usage: item.usage,
                rate: item.rate,
                amount: Number(item.amount),
            })),
        }));

        return NextResponse.json({
            success: true,
            data: formattedBills,
        });
    } catch (error) {
        console.error('Error fetching bills by period:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch bills' },
            { status: 500 }
        );
    }
}
