import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import {
    createPaymentProof,
    getLatestPaymentProofForCustomer,
    listPaymentProofs,
    PAYMENT_PROOF_STATUSES,
    type PaymentProofStatus,
} from '@/services/server/payment-proof.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export async function GET(request: NextRequest) {
    try {
        const customerId = request.nextUrl.searchParams.get('customerId');
        if (customerId) {
            return NextResponse.json({ success: true, data: await getLatestPaymentProofForCustomer(customerId) });
        }
        requireAdmin(request);
        const status = request.nextUrl.searchParams.get('status') as PaymentProofStatus | null;
        if (status && !PAYMENT_PROOF_STATUSES.includes(status)) {
            return NextResponse.json({ success: false, error: 'Status tidak valid' }, { status: 400 });
        }
        return NextResponse.json({ success: true, data: await listPaymentProofs(status || undefined) });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error('Error fetching payment proofs:', error);
        return NextResponse.json({ success: false, error: 'Gagal memuat bukti pembayaran' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const customerId = String(formData.get('customerId') || '');
        const phone = String(formData.get('phone') || '').trim();
        const amount = Number(formData.get('amount'));
        const note = String(formData.get('note') || '');
        const proof = formData.get('proof');

        if (!customerId || !phone || !/^[0-9+\-\s()]{8,20}$/.test(phone)) {
            return NextResponse.json({ success: false, error: 'Nomor telepon tidak valid' }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ success: false, error: 'Nominal pembayaran tidak valid' }, { status: 400 });
        }
        if (!(proof instanceof File) || !MIME_EXTENSIONS[proof.type]) {
            return NextResponse.json({ success: false, error: 'Bukti pembayaran harus berupa JPG, PNG, atau WEBP' }, { status: 400 });
        }
        if (proof.size <= 0 || proof.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, error: 'Ukuran bukti pembayaran maksimal 5 MB' }, { status: 400 });
        }

        const extension = MIME_EXTENSIONS[proof.type];
        const fileName = `${randomUUID()}.${extension}`;
        const uploadDirectory = path.join(process.cwd(), 'public', 'uploads', 'payment-proofs');
        await mkdir(uploadDirectory, { recursive: true });
        await writeFile(path.join(uploadDirectory, fileName), Buffer.from(await proof.arrayBuffer()));

        let result: Awaited<ReturnType<typeof createPaymentProof>>;
        try {
            result = await createPaymentProof({
                customerId,
                phone,
                amount,
                proofUrl: `/uploads/payment-proofs/${fileName}`,
                originalName: proof.name,
                mimeType: proof.type,
                note,
            });
        } catch (error) {
            await unlink(path.join(uploadDirectory, fileName)).catch((unlinkError) => {
                console.error('Failed to remove orphaned payment proof:', unlinkError);
            });
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: { id: result.id, status: result.status },
            message: 'Bukti pembayaran berhasil dikirim dan menunggu verifikasi admin',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating payment proof:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengirim bukti pembayaran';
        const status = message.includes('menunggu konfirmasi') ? 409 : 500;
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
