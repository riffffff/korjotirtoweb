import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerId } from '@/lib/customerIdentifier';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createSingleCustomerBill } from '@/services/server/bill.service';

type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * POST /api/customers/:id/bills
 * Create a new bill for a specific customer
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const { id } = await params;
        const customerId = await resolveCustomerId(id);
        const body = await request.json();
        const { period, meterStart: inputMeterStart, meterEnd } = body;

        if (!customerId) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Validate inputs
        if (!period || meterEnd === undefined) {
            return NextResponse.json(
                { success: false, error: 'Period dan meter akhir wajib diisi' },
                { status: 400 }
            );
        }

        const result = await createSingleCustomerBill(customerId, period, Number(meterEnd), inputMeterStart);

        return NextResponse.json({
            success: true,
            data: {
                billId: result.bill.id,
                period,
                meterStart: result.meterReading.meterStart,
                meterEnd: result.meterReading.meterEnd,
                usage: result.calculation.usage,
                totalAmount: result.calculation.totalAmount,
            },
            message: 'Tagihan berhasil dibuat',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error creating bill:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal membuat tagihan' },
            { status: 500 }
        );
    }
}
