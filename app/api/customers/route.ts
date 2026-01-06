import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 * List all customers with their outstanding balance
 */
export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            where: { deletedAt: null },
            orderBy: { customerNumber: 'asc' },
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

        const formattedCustomers = customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            customerNumber: customer.customerNumber,
            phone: customer.phone,
            totalBill: Number(customer.totalBill),
            totalPaid: Number(customer.totalPaid),
            outstandingBalance: Number(customer.outstandingBalance),
        }));

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
