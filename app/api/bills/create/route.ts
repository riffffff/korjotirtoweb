import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createBulkBillsForPeriod } from '@/services/server/bill.service';

/**
 * POST /api/bills/create
 * Create bills for all customers for a specific period
 * Based on previous month's meter readings
 */
export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);
        const body = await request.json();
        const { period } = body;

        // Validate period format
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json(
                { success: false, error: 'Invalid period format. Use YYYY-MM' },
                { status: 400 }
            );
        }

        const result = await createBulkBillsForPeriod(period);

        return NextResponse.json({
            success: true,
            count: result.billsCreated,
            skipped: result.skippedCustomers.length,
            skippedCustomers: result.skippedCustomers.slice(0, 10),
            message: `Berhasil membuat ${result.billsCreated} tagihan untuk periode ${period}`,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error creating bills:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal membuat tagihan' },
            { status: 500 }
        );
    }
}
