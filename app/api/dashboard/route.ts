import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard
 * Get summary statistics for admin dashboard
 */
export async function GET() {
    try {
        // Get all non-deleted customers
        const customers = await prisma.customer.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                totalBill: true,
                totalPaid: true,
                outstandingBalance: true,
            },
        });

        // Calculate totals
        const totalCustomers = customers.length;
        const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalBill), 0);
        const totalPaid = customers.reduce((sum, c) => sum + Number(c.totalPaid), 0);
        const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstandingBalance), 0);
        const customersWithDebt = customers.filter(c => Number(c.outstandingBalance) > 0).length;
        const customersPaidFull = customers.filter(c => Number(c.outstandingBalance) === 0).length;

        // Get this month's bills
        const now = new Date();
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const thisMonthBills = await prisma.bill.count({
            where: {
                deletedAt: null,
                meterReading: {
                    period: currentPeriod,
                    deletedAt: null,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                totalCustomers,
                totalRevenue,
                totalPaid,
                totalOutstanding,
                customersWithDebt,
                customersPaidFull,
                thisMonthBills,
                currentPeriod,
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
