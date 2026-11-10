import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { markPaymentProofNotified } from '@/services/server/payment-proof.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        requireAdmin(request);
        const { id } = await params;
        const proof = await markPaymentProofNotified(id);
        return NextResponse.json({ success: true, data: proof, message: 'Status notifikasi WhatsApp berhasil diperbarui' });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error marking payment proof notified:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui status notifikasi' }, { status: 400 });
    }
}

export async function POST(request: NextRequest, context: RouteParams) {
    return PATCH(request, context);
}

