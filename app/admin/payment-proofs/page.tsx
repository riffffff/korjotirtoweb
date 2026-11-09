'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import AdminPageNavigation, { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import LoadingState from '@/components/state/LoadingState';
import EmptyState from '@/components/state/EmptyState';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { paymentProofClient, type PaymentProof } from '@/services/client/payment-proof.client';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDateTime } from '@/lib/formatDate';

// In-memory cache for payment proofs
const proofsCache = new Map<string, { data: PaymentProof[]; time: number }>();
let countsCache: Record<string, number> | null = null;

export default function PaymentProofsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [status, setStatus] = useState('PENDING');
    const [proofs, setProofs] = useState<PaymentProof[]>(() => proofsCache.get('PENDING')?.data || []);
    const [loading, setLoading] = useState(() => !proofsCache.has('PENDING'));
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewProof, setPreviewProof] = useState<PaymentProof | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>(() => countsCache || {});
    const [approveProof, setApproveProof] = useState<PaymentProof | null>(null);
    const [rejectProof, setRejectProof] = useState<PaymentProof | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadProofs = useCallback(async () => {
        const cached = proofsCache.get(status);
        if (!cached) {
            setLoading(true);
        }
        try {
            const [currentProofs, pending, approved, rejected] = await Promise.all([
                paymentProofClient.list(status),
                paymentProofClient.list('PENDING'),
                paymentProofClient.list('APPROVED'),
                paymentProofClient.list('REJECTED'),
            ]);
            const nextCounts = { PENDING: pending.length, APPROVED: approved.length, REJECTED: rejected.length };
            proofsCache.set(status, { data: currentProofs, time: Date.now() });
            proofsCache.set('PENDING', { data: pending, time: Date.now() });
            proofsCache.set('APPROVED', { data: approved, time: Date.now() });
            proofsCache.set('REJECTED', { data: rejected, time: Date.now() });
            countsCache = nextCounts;
            setProofs(currentProofs);
            setCounts(nextCounts);
        } catch {
            if (!cached) {
                setError('Gagal memuat pengajuan pembayaran');
            }
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        if (!authLoading && !isAdmin) router.push('/');
    }, [authLoading, isAdmin, router]);

    useEffect(() => {
        if (isAdmin) void loadProofs();
    }, [isAdmin, loadProofs]);

    const approve = async () => {
        if (!approveProof) return;
        setProcessingId(approveProof.id);
        setError(null);
        try {
            await paymentProofClient.approve(approveProof.id);
            proofsCache.clear();
            setStatus('APPROVED');
            setApproveProof(null);
            await loadProofs();
        } catch (approveError) {
            setError(approveError instanceof Error ? approveError.message : 'Gagal mengonfirmasi pembayaran');
        } finally {
            setProcessingId(null);
        }
    };

    const getCustomerConfirmationUrl = (proof: PaymentProof) => {
        const rawNumber = proof.phone.replace(/\D/g, '');
        const phoneNumber = rawNumber.startsWith('0') ? `62${rawNumber.slice(1)}` : rawNumber;
        if (!phoneNumber) return null;
        const message = [
            'Halo, pembayaran Anda telah dikonfirmasi.',
            '',
            `Nama: ${proof.customer.name}`,
            `Nomor pelanggan: ${proof.customer.customerNumber}`,
            `Nominal: ${formatCurrency(proof.amount)}`,
            `ID pengajuan: ${proof.id}`,
        ].join('\n');
        return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    };

    const reject = async () => {
        if (!rejectProof || !rejectionReason.trim()) return;
        setProcessingId(rejectProof.id);
        setError(null);
        try {
            await paymentProofClient.reject(rejectProof.id, rejectionReason.trim());
            proofsCache.clear();
            await loadProofs();
            setRejectProof(null);
            setRejectionReason('');
        } catch (rejectError) {
            setError(rejectError instanceof Error ? rejectError.message : 'Gagal menolak pembayaran');
        } finally {
            setProcessingId(null);
        }
    };

    if (authLoading || !isAdmin) {
        return (
            <AppLayout>
                <PageHeader title="Pengajuan Pembayaran" subtitle="Verifikasi bukti pembayaran online" actions={<DashboardNavigationButton />} />
                <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-4">
                    <AdminPageNavigation />
                    <LoadingState variant="skeleton-payment-proofs" />
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader title="Pengajuan Pembayaran" subtitle="Verifikasi bukti pembayaran online" actions={<DashboardNavigationButton />} />
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-4">
                <AdminPageNavigation />
                <div className="flex gap-2 overflow-x-auto">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((value) => (
                        <button
                            key={value}
                            onClick={() => {
                                setStatus(value);
                                const cached = proofsCache.get(value);
                                if (cached) {
                                    setProofs(cached.data);
                                }
                            }}
                            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${status === value ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}
                        >
                            {value === 'PENDING' ? 'Menunggu' : value === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                            <span className={`ml-1.5 inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[11px] ${status === value ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                                {counts[value] ?? 0}
                            </span>
                        </button>
                    ))}
                </div>
                {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
                {loading ? <LoadingState variant="skeleton-payment-proofs" /> : proofs.length === 0 ? (
                    <EmptyState
                        title={`Belum ada pengajuan ${status === 'PENDING' ? 'yang menunggu' : status === 'APPROVED' ? 'yang disetujui' : 'yang ditolak'}`}
                        description="Pengajuan pada status ini akan tampil di sini."
                    />
                ) : (
                    <div className="space-y-2">
                        {proofs.map((proof) => (
                            <article key={proof.id} className="bg-white rounded-xl border border-neutral-200 p-3">
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setPreviewProof(proof)} className="shrink-0" aria-label={`Lihat bukti pembayaran ${proof.customer.name}`}>
                                        <Image src={proof.proofUrl} alt={`Bukti pembayaran ${proof.customer.name}`} width={56} height={56} className="h-14 w-14 object-cover rounded-lg border border-neutral-200" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h2 className="truncate text-sm font-semibold text-neutral-800">{proof.customer.name}</h2>
                                            <p className="shrink-0 text-sm font-bold text-emerald-600">{formatCurrency(proof.amount)}</p>
                                        </div>
                                        <p className="mt-0.5 text-xs text-neutral-500">
                                            Pelanggan {proof.customer.customerNumber} · {formatDateTime(proof.createdAt)}
                                        </p>
                                        <button type="button" onClick={() => setPreviewProof(proof)} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600">
                                            <ExternalLink className="h-3 w-3" /> Lihat bukti
                                        </button>
                                    </div>
                                </div>
                                {(proof.note || proof.rejectionReason) && (
                                    <p className={`mt-2 truncate border-t border-neutral-100 pt-2 text-xs ${proof.rejectionReason ? 'text-red-600' : 'text-neutral-600'}`}>
                                        {proof.rejectionReason ? `Alasan: ${proof.rejectionReason}` : proof.note}
                                    </p>
                                )}
                                {proof.status === 'PENDING' && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button onClick={() => setApproveProof(proof)} disabled={processingId === proof.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:bg-neutral-300 inline-flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5" /> Setujui</button>
                                        <button onClick={() => { setRejectProof(proof); setRejectionReason(''); }} disabled={processingId === proof.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 disabled:bg-neutral-100 inline-flex items-center justify-center gap-1"><X className="h-3.5 w-3.5" /> Tolak</button>
                                    </div>
                                )}
                                {proof.status === 'APPROVED' && (
                                    getCustomerConfirmationUrl(proof) ? (
                                        <a
                                            href={getCustomerConfirmationUrl(proof) || undefined}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 w-full rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600 inline-flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" /> Konfirmasi Pembayaran via WhatsApp
                                        </a>
                                    ) : (
                                        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                                            Nomor telepon customer tidak tersedia.
                                        </p>
                                    )
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>
            <Modal
                isOpen={Boolean(previewProof)}
                onClose={() => setPreviewProof(null)}
                title={previewProof ? `Bukti Pembayaran - ${previewProof.customer.name}` : 'Bukti Pembayaran'}
            >
                {previewProof && (
                    <div className="space-y-3">
                        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                            <Image
                                src={previewProof.proofUrl}
                                alt={`Bukti pembayaran ${previewProof.customer.name}`}
                                width={800}
                                height={1000}
                                className="max-h-[65vh] w-full object-contain"
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Nominal transfer</span>
                            <strong className="text-emerald-600">{formatCurrency(previewProof.amount)}</strong>
                        </div>
                    </div>
                )}
            </Modal>
            <Modal isOpen={Boolean(approveProof)} onClose={() => setApproveProof(null)} title="Konfirmasi Pembayaran">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                        Setujui pembayaran dari <strong>{approveProof?.customer.name}</strong>? Tagihan akan diproses menggunakan FIFO.
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setApproveProof(null)} className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600">Batal</button>
                        <button type="button" onClick={() => void approve()} disabled={Boolean(processingId)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:bg-neutral-300">Setujui</button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={Boolean(rejectProof)} onClose={() => setRejectProof(null)} title="Tolak Pembayaran">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">Masukkan alasan penolakan untuk pengajuan {rejectProof?.customer.name}.</p>
                    <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} placeholder="Alasan penolakan" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setRejectProof(null)} className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600">Batal</button>
                        <button type="button" onClick={() => void reject()} disabled={!rejectionReason.trim() || Boolean(processingId)} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:bg-neutral-300">Tolak</button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
