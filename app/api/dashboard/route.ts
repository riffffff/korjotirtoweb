import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard
 * Get summary statistics for admin dashboard
 * Returns: total customers and unpaid count per period
 */
export async function GET() {
    try {
        // Get total customers
        const totalCustomers = await prisma.customer.count();

        // Get all unique periods with bills
        const periods = await prisma.meterReading.findMany({
            select: {
                period: true,
            },
            distinct: ['period'],
            orderBy: {
                period: 'desc',
            },
            take: 12, // Last 12 months
        });

        // For each period, get unpaid count
        const periodStats = await Promise.all(
            periods.map(async ({ period }) => {
                const totalBills = await prisma.bill.count({
                    where: {
                        meterReading: {
                            period: period,
                        },
                    },
                });

                const unpaidCount = await prisma.bill.count({
                    where: {
                        meterReading: {
                            period: period,
                        },
                        paymentStatus: { not: 'paid' },
                    },
                });

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
                    unpaidCount,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                totalCustomers,
                periods: periodStats,
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
