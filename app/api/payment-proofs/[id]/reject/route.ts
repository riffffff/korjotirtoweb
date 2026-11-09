import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { rejectPaymentProof } from '@/services/server/payment-proof.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = requireAdmin(request);
        const body = await request.json();
        const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
        if (!reason) {
            return NextResponse.json({ success: false, error: 'Alasan penolakan wajib diisi' }, { status: 400 });
        }
        const proof = await rejectPaymentProof((await params).id, session.sub, reason);
        return NextResponse.json({ success: true, data: proof, message: 'Bukti pembayaran ditolak' });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error rejecting payment proof:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Gagal menolak pembayaran' }, { status: 400 });
    }
}
