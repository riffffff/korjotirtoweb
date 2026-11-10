'use client';

import Link from 'next/link';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Droplets,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/Icons';
import { formatCurrency } from '@/lib/formatCurrency';
import { openWhatsAppLink } from '@/lib/whatsapp';
import type {
    DelinquentCustomerDTO,
    PendingProofsSummaryDTO,
    WaterUsageInsightDTO,
} from '@/types';

interface PendingProofsAlertProps {
    pendingProofs?: PendingProofsSummaryDTO;
}

export function PendingProofsAlert({ pendingProofs }: PendingProofsAlertProps) {
    if (!pendingProofs || pendingProofs.count <= 0) return null;

    return (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-neutral-800">
                        Terdapat <span className="text-amber-800 font-bold">{pendingProofs.count} bukti pembayaran</span> menunggu verifikasi
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        Total nominal transfer:{' '}
                        <span className="font-semibold text-neutral-700">
                            {formatCurrency(pendingProofs.totalAmount)}
                        </span>
                    </p>
                </div>
            </div>
            <Link
                href="/admin/payment-proofs"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
                Periksa Sekarang
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}

interface DashboardInsightsProps {
    topDelinquents?: DelinquentCustomerDTO[];
    waterUsageInsight?: WaterUsageInsightDTO | null;
}

export default function DashboardInsights({
    topDelinquents = [],
    waterUsageInsight,
}: DashboardInsightsProps) {
    const handleSendReminderWA = (delinquent: DelinquentCustomerDTO) => {
        if (!delinquent.phone) return;
        const message = [
            `Yth. Bpk/Ibu *${delinquent.name}*,`,
            '',
            `Kami dari Korjo Tirto menginformasikan bahwa Anda memiliki tunggakan tagihan air sebanyak *${delinquent.monthsUnpaid} bulan* dengan total tagihan *${formatCurrency(delinquent.totalUnpaid)}*.`,
            '',
            `Mohon untuk segera menyelesaikan pembayaran atau cek rincian melalui tautan berikut:`,
            `https://www.korjotirto.my.id/customerNumber/${delinquent.customerNumber}`,
            '',
            `Terima kasih atas perhatian dan kerjasamanya.`,
            `Salam,`,
            `Pengelola Korjo Tirto`,
        ].join('\n');

        openWhatsAppLink(delinquent.phone, message);
    };

    const anomalies = waterUsageInsight?.anomalies || [];

    return (
        <section className="space-y-3.5">
            <div>
                <h2 className="text-base font-bold text-neutral-800">Insight Operasional</h2>
                <p className="text-xs text-neutral-500">
                    Prioritas tindak lanjut penagihan dan deteksi lonjakan kebocoran air
                </p>
            </div>

            {/* Atas bawah di mobile, 2 kolom di desktop (tanpa tab) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panel A: Prioritas Penagihan (Top 5 Penunggak) */}
                <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-neutral-800">
                                        Prioritas Penagihan
                                    </h3>
                                    <p className="text-[11px] text-neutral-400">Tunggakan beruntun terlama</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                                Top {topDelinquents.length}
                            </span>
                        </div>

                        {topDelinquents.length === 0 ? (
                            <div className="py-8 text-center text-xs text-neutral-400">
                                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                                Tidak ada pelanggan dengan tunggakan beruntun.
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100">
                                {topDelinquents.map((cust) => (
                                    <div
                                        key={cust.customerId}
                                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                                <span className="text-neutral-600 font-bold text-xs">
                                                    {cust.customerNumber}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/customerNumber/${cust.customerNumber}`}
                                                    className="text-xs font-semibold text-neutral-800 hover:text-blue-600 truncate block transition-colors"
                                                >
                                                    {cust.name}
                                                </Link>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                                                        {cust.monthsUnpaid} bln
                                                    </span>
                                                    {cust.phone && (
                                                        <span className="text-[11px] text-neutral-400 truncate">
                                                            · {cust.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-bold text-neutral-800">
                                                {formatCurrency(cust.totalUnpaid)}
                                            </span>
                                            {cust.phone && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendReminderWA(cust)}
                                                    className="w-7 h-7 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors shadow-xs"
                                                    title={`Kirim WA Tagihan ke ${cust.name}`}
                                                    aria-label={`Kirim WA Tagihan ke ${cust.name}`}
                                                >
                                                    <WhatsAppIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel B: Deteksi Lonjakan Air & Anomali */}
                <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                                    <Droplets className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-neutral-800">
                                        Deteksi Lonjakan Air
                                    </h3>
                                    <p className="text-[11px] text-neutral-400">Pipa bocor atau meter macet</p>
                                </div>
                            </div>
                            {waterUsageInsight && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                                    {waterUsageInsight.periodLabel}
                                </span>
                            )}
                        </div>

                        {anomalies.length === 0 ? (
                            <div className="py-8 text-center text-xs text-neutral-400">
                                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                                Semua pencatatan meter normal pada periode ini.
                                <p className="text-[11px] text-neutral-400 mt-1">Tidak terdeteksi lonjakan kebocoran atau meteran macet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100">
                                {anomalies.map((anom) => (
                                    <div
                                        key={anom.customerId}
                                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    anom.type === 'SPIKE'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-neutral-100 text-neutral-600'
                                                }`}
                                            >
                                                {anom.type === 'SPIKE' ? (
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                ) : (
                                                    <span className="text-xs font-bold">0</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/customerNumber/${anom.customerNumber}`}
                                                    className="text-xs font-semibold text-neutral-800 hover:text-blue-600 truncate block transition-colors"
                                                >
                                                    #{anom.customerNumber} {anom.name}
                                                </Link>
                                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                                    {anom.type === 'SPIKE'
                                                        ? `Naik ${anom.previousUsage} m³ ➔ ${anom.currentUsage} m³ (+${anom.percentChange}%)`
                                                        : `Tercatat 0 m³ (bulan lalu ${anom.previousUsage ?? 0} m³)`}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 border ${
                                                anom.type === 'SPIKE'
                                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                    : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                            }`}
                                        >
                                            {anom.type === 'SPIKE' ? 'Lonjakan' : '0 m³'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
