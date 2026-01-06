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
                outstandingBalance: true,
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
                deletedAt: null,
                meterReading: {
                    customerId: customerId,
                    deletedAt: null,
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

        const formattedBills = bills.map((bill) => ({
            id: bill.id,
            period: bill.meterReading.period,
            meterStart: bill.meterReading.meterStart,
            meterEnd: bill.meterReading.meterEnd,
            usage: bill.meterReading.usage,
            totalAmount: Number(bill.totalAmount),
            amountPaid: Number(bill.amountPaid),
            remaining: Number(bill.remaining),
            paymentStatus: bill.paymentStatus,
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
            data: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    customerNumber: customer.customerNumber,
                    phone: customer.phone,
                    totalBill: Number(customer.totalBill),
                    totalPaid: Number(customer.totalPaid),
                    outstandingBalance: Number(customer.outstandingBalance),
                },
                bills: formattedBills,
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
