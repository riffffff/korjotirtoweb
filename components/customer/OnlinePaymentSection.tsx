'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Upload, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { paymentProofClient } from '@/services/client/payment-proof.client';
import { SkeletonOnlinePaymentStatus } from '@/components/ui/Skeleton';

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
    totalAmount,
    settings,
    embedded = false,
}: OnlinePaymentSectionProps) {
    const [phone, setPhone] = useState(defaultPhone || '');
    const [amount, setAmount] = useState(String(totalAmount));
    const [note, setNote] = useState('');
    const [proof, setProof] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ id: string; phone: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; message: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        let active = true;
        void paymentProofClient.latestForCustomer(customerId)
            .then((latest) => {
                if (!active || !latest) return;
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
                    setAmount(String(latest.amount));
                    setPhone(latest.phone);
                    setResult({
                        id: latest.id,
                        phone: latest.phone,
                        status: latest.status,
                        message: 'Pembayaran telah dikonfirmasi admin.',
                    });
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

    const formattedAmount = formatCurrency(Number(amount) || 0);

    const handleAmountChange = (value: string) => {
        const digits = value.replace(/\D/g, '');
        setAmount(digits || '0');
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
            `Nominal: ${formattedAmount}`,
            `ID pengajuan: ${result.id}`,
        ].join('\n');
        return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }, [customerName, customerNumber, formattedAmount, result, settings.payment_whatsapp_number]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!proof) {
            setError('Pilih gambar bukti pembayaran terlebih dahulu');
            return;
        }
        setSubmitting(true);
        try {
            const response = await paymentProofClient.create({
                customerId,
                phone,
                amount: Number(amount),
                proof,
                note,
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
        <div className={embedded ? 'space-y-4' : 'bg-white border border-blue-200 rounded-xl p-4 space-y-4 shadow-sm'}>
            {!embedded && <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-blue-700">Pembayaran Online</p>
                    <p className="text-xs text-neutral-500">Kirim bukti transfer untuk diverifikasi admin</p>
                </div>
            </div>
            }

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 space-y-1">
                <p className="font-semibold">{settings.payment_bank_name || 'Rekening pembayaran belum diatur'}</p>
                <p>Nomor rekening: <strong>{settings.payment_account_number || '-'}</strong></p>
                <p>Atas nama: <strong>{settings.payment_account_name || '-'}</strong></p>
                <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(settings.payment_account_number || '')}
                    disabled={!settings.payment_account_number}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 disabled:text-neutral-400"
                >
                    <Copy className="w-3.5 h-3.5" /> Salin nomor rekening
                </button>
            </div>

            {checkingStatus ? (
                <SkeletonOnlinePaymentStatus />
            ) : result?.status === 'PENDING' ? (
                <div className="space-y-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{result.message}</span>
                    </div>
                    {whatsappUrl ? (
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" /> Konfirmasi via WhatsApp
                        </a>
                    ) : (
                        <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            Nomor WhatsApp admin belum tersedia. Hubungi admin untuk melakukan konfirmasi pembayaran.
                        </p>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="online-payment-phone" className="text-xs text-neutral-600 block mb-1">Nomor telepon</label>
                        <input id="online-payment-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                    </div>
                    <div>
                        <label htmlFor="online-payment-amount" className="text-xs text-neutral-600 block mb-1">Nominal transfer</label>
                        <input id="online-payment-amount" type="text" inputMode="numeric" minLength={1} value={formattedAmount} onChange={(event) => handleAmountChange(event.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                    </div>
                    <div>
                        <label htmlFor="online-payment-proof" className="text-xs text-neutral-600 block mb-1">Bukti pembayaran</label>
                        <label htmlFor="online-payment-proof" className="w-full min-h-11 px-3 py-2.5 rounded-lg border border-dashed border-blue-300 text-sm text-blue-700 flex items-center gap-2 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span className="truncate">{proof?.name || 'Pilih gambar JPG, PNG, atau WEBP'}</span>
                        </label>
                        <input id="online-payment-proof" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProof(event.target.files?.[0] || null)} className="sr-only" />
                    </div>
                    <div>
                        <label htmlFor="online-payment-note" className="text-xs text-neutral-600 block mb-1">Catatan (opsional)</label>
                        <textarea id="online-payment-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold">
                        {submitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                    </button>
                </form>
            )}
        </div>
    );
}
