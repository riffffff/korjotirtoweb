import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { approvePaymentProof } from '@/services/server/payment-proof.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = requireAdmin(request);
        const result = await approvePaymentProof((await params).id, session.sub);
        return NextResponse.json({ success: true, data: result.proof, message: 'Pembayaran berhasil dikonfirmasi' });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error approving payment proof:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Gagal mengonfirmasi pembayaran' }, { status: 400 });
    }
}
