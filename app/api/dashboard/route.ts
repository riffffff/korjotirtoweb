import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard
 * Get summary statistics for admin dashboard
 * Returns: total customers, revenue, outstanding, and stats per period
 */
export async function GET() {
    try {
        // Get total customers
        const totalCustomers = await prisma.customer.count();

        // Get total revenue (sum of all payments)
        const revenueResult = await prisma.payment.aggregate({
            _sum: { amount: true }
        });
        const totalRevenue = Number(revenueResult._sum.amount || 0);

        // Get total customer balance (saldo yang tersimpan di sistem dari semua pelanggan)
        const balanceResult = await prisma.customer.aggregate({
            _sum: { balance: true }
        });
        const totalCustomerBalance = Number(balanceResult._sum.balance || 0);

        // Get all unique periods with bills
        const periods = await prisma.meterReading.findMany({
            select: { period: true },
            distinct: ['period'],
            orderBy: { period: 'desc' },
            take: 12,
        });

        // For each period, get stats
        const periodStats = await Promise.all(
            periods.map(async ({ period }) => {
                const bills = await prisma.bill.findMany({
                    where: { meterReading: { period } },
                    select: {
                        paymentStatus: true,
                        totalAmount: true,
                        amountPaid: true,
                    }
                });

                const totalBills = bills.length;
                const paidCount = bills.filter(b => b.paymentStatus === 'paid').length;
                const unpaidCount = totalBills - paidCount;
                const totalAmount = bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
                const paidAmount = bills.reduce((sum, b) => sum + Number(b.amountPaid), 0);

                // Format period to Indonesian
                const [year, month] = period.split('-');
                const months = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                const periodLabel = `${months[parseInt(month) - 1]} ${year}`;

                return {
                    period,
                    periodLabel,
                    totalBills,
                    paidCount,
                    unpaidCount,
                    totalAmount,
                    paidAmount,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                totalCustomers,
                totalRevenue,
                totalOutstanding: totalCustomerBalance,
                periods: periodStats,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
