import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { getBillsByPeriod, softDeleteBillsByPeriod } from '@/services/server/bill.service';

type RouteParams = {
    params: Promise<{
        period: string;
    }>;
};

/**
 * GET /api/bills/period/:period
 * Get bill details for a specific period grouped by payment status
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { period } = await params;

        if (!/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json(
                { success: false, error: 'Invalid period format. Use YYYY-MM' },
                { status: 400 }
            );
        }

        const data = await getBillsByPeriod(period);

        return NextResponse.json({
            success: true,
            data,
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('Error getting bills by period:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get bills by period' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/bills/period/:period
 * Hard delete all bills for a given period (admin only)
 * Period format: YYYY-MM (e.g., "2026-01")
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const { period } = await params;

        // Validate period format
        if (!/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json(
                { success: false, error: 'Invalid period format. Use YYYY-MM' },
                { status: 400 }
            );
        }

        const count = await softDeleteBillsByPeriod(period);

        return NextResponse.json({
            success: true,
            message: `Deleted ${count} bills for period ${period}`,
            count,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error deleting bills by period:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete bills' },
            { status: 500 }
        );
    }
}
