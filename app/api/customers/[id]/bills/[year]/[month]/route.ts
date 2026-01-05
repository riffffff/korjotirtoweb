import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteParams = {
    params: Promise<{
        id: string;
        year: string;
        month: string;
    }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id, year, month } = await params;
        const customerId = parseInt(id, 10);
        const period = `${year}-${month.padStart(2, '0')}`;

        const bill = await prisma.bill.findFirst({
            where: {
                deletedAt: null,
                meterReading: {
                    customerId: customerId,
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
        });

        if (!bill) {
            return NextResponse.json(
                { success: false, error: 'Bill not found' },
                { status: 404 }
            );
        }

        const formattedBill = {
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
            change: Number(bill.change),
            paidAt: bill.paidAt,
            items: bill.items.map((item) => ({
                type: item.type,
                usage: item.usage,
                rate: item.rate,
                amount: Number(item.amount),
            })),
        };

        return NextResponse.json({
            success: true,
            data: formattedBill,
        });
    } catch (error) {
        console.error('Error fetching customer bill:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch bill' },
            { status: 500 }
        );
    }
}
