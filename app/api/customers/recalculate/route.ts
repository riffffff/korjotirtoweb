import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { recalculateCustomerTotals } from '@/services/server/customer.service';

/**
 * POST /api/customers/recalculate
 * Recalculate all customer balances based on payment savedToBalance
 * This fixes corrupted balance data from old incorrect logic
 * Admin only
 */
export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);

        const { fixedCount, total, results } = await recalculateCustomerTotals();

        return NextResponse.json({
            success: true,
            message: `Recalculated ${fixedCount} customers`,
            count: fixedCount,
            total,
            results,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error recalculating balances:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to recalculate balances' },
            { status: 500 }
        );
    }
}
