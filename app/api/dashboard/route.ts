import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/services/server/dashboard.service';

/**
 * GET /api/dashboard
 * Get summary statistics for admin dashboard
 * Returns: total customers, revenue, outstanding, and stats per period
 */
export async function GET() {
    try {
        const stats = await getDashboardStats();

        return NextResponse.json({
            success: true,
            data: stats,
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
