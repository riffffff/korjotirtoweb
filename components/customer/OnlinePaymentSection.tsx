'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { paymentProofClient, type CustomerPaymentProofStatus } from '@/services/client/payment-proof.client';
import { SkeletonOnlinePaymentStatus } from '@/components/ui/Skeleton';
import { compressImage } from '@/lib/compressImage';
import FileUpload from '@/components/ui/FileUpload';

// In-memory cache to prevent reloading every time tab or page opens
const proofStatusCache = new Map<string, { data: CustomerPaymentProofStatus | null; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds fresh cache

interface OnlinePaymentSectionProps {
    customerId: string;
    customerName: string;
    customerNumber: number;
    defaultPhone?: string | null;
    totalAmount: number;
    settings: Record<string, string>;
    embedded?: boolean;
}

export default function OnlinePaymentSection({
    customerId,
    customerName,
    customerNumber,
    defaultPhone,
    settings,
    embedded = false,
}: OnlinePaymentSectionProps) {
    const cached = proofStatusCache.get(customerId);
    const isCacheFresh = cached && Date.now() - cached.timestamp < CACHE_TTL;

    const [phone, setPhone] = useState(defaultPhone || '');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [proof, setProof] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ id: string; phone: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; message: string } | null>(() => {
        if (cached?.data?.status === 'PENDING') {
            return {
                id: cached.data.id,
                phone: cached.data.phone,
                status: cached.data.status,
                message: 'Bukti pembayaran sedang menunggu konfirmasi admin.',
            };
        }
        return null;
    });
    const [error, setError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(!isCacheFresh);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let active = true;
        const cachedEntry = proofStatusCache.get(customerId);
        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
            setCheckingStatus(false);
            return;
        }

        void paymentProofClient.latestForCustomer(customerId)
            .then((latest) => {
                if (!active) return;
                proofStatusCache.set(customerId, { data: latest, timestamp: Date.now() });
                if (!latest) {
                    setResult(null);
                    return;
                }
                if (latest.status === 'PENDING') {
                    setAmount(String(latest.amount));
                    setPhone(latest.phone);
                    setResult({
                        id: latest.id,
                        phone: latest.phone,
                        status: latest.status,
                        message: 'Bukti pembayaran sedang menunggu konfirmasi admin.',
                    });
                } else if (latest.status === 'APPROVED') {
                    setPhone(latest.phone);
                    setResult({
                        id: latest.id,
                        phone: latest.phone,
                        status: latest.status,
                        message: 'Pembayaran telah dikonfirmasi admin.',
                    });
                } else {
                    setResult(null);
                }
            })
            .catch(() => {
                if (active) setError('Status pembayaran online tidak dapat dimuat');
            })
            .finally(() => {
                if (active) setCheckingStatus(false);
            });
        return () => {
            active = false;
        };
    }, [customerId]);

    const formattedAmount = amount ? formatCurrency(Number(amount)) : '';

    const handleAmountChange = (value: string) => {
        const digits = value.replace(/\D/g, '');
        setAmount(digits);
    };

    const whatsappUrl = useMemo(() => {
        const rawNumber = (settings.payment_whatsapp_number || '').replace(/\D/g, '');
        const whatsappNumber = rawNumber.startsWith('0') ? `62${rawNumber.slice(1)}` : rawNumber;
        if (!whatsappNumber || !result) return null;
        const message = [
            'Halo Admin Korjo Tirto,',
            '',
            'Saya sudah mengirim bukti pembayaran.',
            `Nama: ${customerName}`,
            `Nomor pelanggan: ${customerNumber}`,
            `Nominal: ${formattedAmount || '-'}`,
            `ID pengajuan: ${result.id}`,
        ].join('\n');
        return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }, [customerName, customerNumber, formattedAmount, result, settings.payment_whatsapp_number]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        const trimmedPhone = phone.trim();
        if (!trimmedPhone || !/^[0-9+\-\s()]{8,20}$/.test(trimmedPhone)) {
            setError('Nomor WhatsApp tidak valid (minimal 8 digit)');
            return;
        }
        if (!proof) {
            setError('Pilih gambar bukti pembayaran terlebih dahulu');
            return;
        }
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            setError('Masukkan nominal transfer yang valid');
            return;
        }
        setSubmitting(true);
        try {
            const finalProof = await compressImage(proof);
            const response = await paymentProofClient.create({
                customerId,
                phone: trimmedPhone,
                amount: numericAmount,
                proof: finalProof,
                note,
            });
            proofStatusCache.set(customerId, {
                data: {
                    id: response.data.id,
                    phone,
                    amount: numericAmount,
                    status: 'PENDING',
                    rejectionReason: null,
                    createdAt: new Date().toISOString(),
                },
                timestamp: Date.now(),
            });
            setResult({ id: response.data.id, phone, status: 'PENDING', message: response.message });
            setProof(null);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Gagal mengirim bukti pembayaran');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={embedded ? 'space-y-3.5' : 'bg-white border border-blue-200 rounded-xl p-4 space-y-3.5 shadow-sm'}>
            {!embedded && (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-700">Pembayaran Online</p>
                        <p className="text-xs text-neutral-500">Kirim bukti transfer untuk diverifikasi admin</p>
                    </div>
                </div>
            )}

            {/* Rekening Info - Ringkas & Elegan */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                            {settings.payment_bank_name || 'Bank Transfer'}
                        </span>
                        {settings.payment_account_name && (
                            <>
                                <span className="text-[10px] text-blue-300">•</span>
                                <span className="text-xs text-neutral-600 truncate">
                                    a.n. {settings.payment_account_name}
                                </span>
                            </>
                        )}
                    </div>
                    <p className="text-sm font-bold text-blue-950 font-mono tracking-tight mt-0.5">
                        {settings.payment_account_number || '-'}
                    </p>
                </div>
                {settings.payment_account_number && (
                    <button
                        type="button"
                        onClick={() => {
                            void navigator.clipboard?.writeText(settings.payment_account_number || '');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-medium flex items-center gap-1 shadow-xs shrink-0 transition-colors"
                        title="Salin nomor rekening"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                )}
            </div>

            {checkingStatus ? (
                <SkeletonOnlinePaymentStatus />
            ) : result?.status === 'PENDING' ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{result.message}</span>
                    </div>
                    {whatsappUrl ? (
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" /> Konfirmasi via WhatsApp
                        </a>
                    ) : (
                        <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                            Nomor WhatsApp admin belum tersedia. Hubungi admin untuk melakukan konfirmasi pembayaran.
                        </p>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label htmlFor="online-payment-phone" className="text-xs font-semibold text-neutral-600 block mb-1">
                                Nomor Telepon
                            </label>
                            <input
                                id="online-payment-phone"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="online-payment-amount" className="text-xs font-semibold text-neutral-600 block mb-1">
                                Nominal Transfer
                            </label>
                            <input
                                id="online-payment-amount"
                                type="text"
                                inputMode="numeric"
                                placeholder="Contoh: 50.000"
                                value={formattedAmount}
                                onChange={(event) => handleAmountChange(event.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <FileUpload
                        id="online-payment-proof"
                        label="Bukti Pembayaran"
                        file={proof}
                        onFileSelect={setProof}
                        accept="image/jpeg,image/png,image/webp"
                        placeholder="Pilih gambar JPG, PNG, atau WEBP"
                        compact
                        disabled={submitting}
                        onError={setError}
                    />

                    <div>
                        <label htmlFor="online-payment-note" className="text-xs font-semibold text-neutral-600 block mb-1">
                            Catatan (opsional)
                        </label>
                        <input
                            id="online-payment-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Keterangan singkat jika ada"
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold text-sm transition-colors"
                    >
                        {submitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                    </button>
                </form>
            )}
        </div>
    );
}

