'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import LoadingState from '@/components/state/LoadingState';
import { billClient } from '@/services/client/bill.client';
import RingChart from '@/components/dashboard/RingChart';
import PaymentTrendChart from '@/components/dashboard/PaymentTrendChart';
import { ChevronRight, Loader2, Settings, Upload, Users, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import PageHeader from '@/components/layout/PageHeader';
import AppLayout from '@/components/layout/AppLayout';

interface PeriodBillDetail {
    id: string;
    customerId: string;
    customerName: string;
    customerNumber: number;
    paymentStatus: string;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { data, loading } = useDashboard();
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [expandedPeriods, setExpandedPeriods] = useState<string[]>([]);
    const [periodDetailsMap, setPeriodDetailsMap] = useState<Record<string, { paid: PeriodBillDetail[]; unpaid: PeriodBillDetail[] }>>({});
    const [loadingPeriods, setLoadingPeriods] = useState<Record<string, boolean>>({});
    const [errorPeriods, setErrorPeriods] = useState<Record<string, string>>({});
    const [historyRange, setHistoryRange] = useState<'3' | '6' | '12' | 'all'>('3');
    const periodCache = useRef<Record<string, { paid: PeriodBillDetail[]; unpaid: PeriodBillDetail[] }>>({});

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            router.push('/');
            return;
        }
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (data?.periods.length && !selectedPeriod) {
            setSelectedPeriod(data.periods[0].period);
        }
    }, [data, selectedPeriod]);

    const fetchPeriodDetail = useCallback(async (period: string) => {
        if (periodCache.current[period]) {
            setPeriodDetailsMap((prev) => (prev[period] ? prev : { ...prev, [period]: periodCache.current[period] }));
            return;
        }

        setLoadingPeriods((prev) => ({ ...prev, [period]: true }));
        setErrorPeriods((prev) => {
            const next = { ...prev };
            delete next[period];
            return next;
        });

        try {
            const result = await billClient.getByPeriod(period);
            const details = {
                paid: result.paid || [],
                unpaid: result.unpaid || [],
            };
            periodCache.current[period] = details;
            setPeriodDetailsMap((prev) => ({ ...prev, [period]: details }));
        } catch {
            setErrorPeriods((prev) => ({ ...prev, [period]: 'Gagal memuat rincian periode' }));
        } finally {
            setLoadingPeriods((prev) => ({ ...prev, [period]: false }));
        }
    }, []);

    const togglePeriodDetail = useCallback((period: string) => {
        setExpandedPeriods((prev) => {
            const isExpanded = prev.includes(period);
            if (isExpanded) {
                return prev.filter((p) => p !== period);
            }
            void fetchPeriodDetail(period);
            return [...prev, period];
        });
    }, [fetchPeriodDetail]);

    const dashboardLoading = (
        <AppLayout>
            <PageHeader title="Dashboard" subtitle="Ringkasan statistik pembayaran" />
            <main className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:py-8 md:pb-8">
                <LoadingState variant="skeleton-dashboard" />
            </main>
        </AppLayout>
    );

    if (authLoading) return dashboardLoading;
    if (!isAdmin) return dashboardLoading;

    const currentPeriod = data?.periods.find(p => p.period === selectedPeriod);
    const paidCount = currentPeriod?.paidCount || 0;
    const unpaidCount = currentPeriod?.unpaidCount || 0; 
    const totalBills = currentPeriod?.totalBills || 0;
    const paymentRate = totalBills > 0 ? Math.round((paidCount / totalBills) * 100) : 0;

    return (
        <AppLayout>
            {/* Header */}
            <PageHeader title="Dashboard" subtitle="Ringkasan statistik pembayaran" />

            <main className="relative max-w-7xl mx-auto px-4 py-6 pb-28 md:px-6 md:py-8 md:pb-8">
                {loading ? (
                    <LoadingState variant="skeleton-dashboard" />
                ) : data && (
                    <div className="space-y-6 md:space-y-8">
                        {/* Stats Section */}
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                            {/* Ring Chart Card - Per Period */}
                            <div className="bg-white rounded-xl p-2.5 md:p-4 border border-neutral-200">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 md:mb-4">
                                    <h3 className="text-sm md:text-sm font-medium text-neutral-600">Per Periode</h3>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="w-full md:w-auto min-h-10 px-2 py-2 bg-neutral-100 border-0 rounded-lg text-sm md:text-xs font-medium text-neutral-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {data.periods.map((p) => (
                                            <option key={p.period} value={p.period}>
                                                {p.periodLabel}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col items-center">
                                    <RingChart percentage={paymentRate} size={100} strokeWidth={8} />
                                    <div className="mt-2 md:mt-3 flex gap-2 md:gap-4 text-center">
                                        <div>
                                            <p className="text-sm md:text-lg font-bold text-emerald-600">{paidCount}</p>
                                            <p className="text-xs md:text-xs text-neutral-500">Lunas</p>
                                        </div>
                                        <div className="w-px bg-neutral-200" />
                                        <div>
                                            <p className="text-sm md:text-lg font-bold text-rose-500">{unpaidCount}</p>
                                            <p className="text-xs md:text-xs text-neutral-500">Belum</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ring Chart Card - All Periods */}
                            <div className="bg-white rounded-xl p-2.5 md:p-4 border border-neutral-200">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 md:mb-4">
                                    <h3 className="text-sm md:text-sm font-medium text-neutral-600">Semua Periode</h3>
                                    <div className="w-full md:w-auto min-h-10 px-2 py-2 bg-neutral-100 rounded-lg flex items-center text-sm md:text-xs font-medium text-neutral-500">
                                        Semua bulan
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    {(() => {
                                        const allPaid = data.periods.reduce((sum, p) => sum + p.paidCount, 0);
                                        const allUnpaid = data.periods.reduce((sum, p) => sum + p.unpaidCount, 0);
                                        const allTotal = allPaid + allUnpaid;
                                        const allRate = allTotal > 0 ? Math.round((allPaid / allTotal) * 100) : 0;
                                        return (
                                            <>
                                                <RingChart percentage={allRate} size={100} strokeWidth={8} />
                                                <div className="mt-2 md:mt-3 flex gap-2 md:gap-4 text-center">
                                                    <div>
                                                        <p className="text-sm md:text-lg font-bold text-emerald-600">{allPaid}</p>
                                                        <p className="text-xs md:text-xs text-neutral-500">Lunas</p>
                                                    </div>
                                                    <div className="w-px bg-neutral-200" />
                                                    <div>
                                                        <p className="text-sm md:text-lg font-bold text-rose-500">{allUnpaid}</p>
                                                        <p className="text-xs md:text-xs text-neutral-500">Belum</p>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Total Pelanggan Card */}
                            <div className="col-start-1 row-start-2 bg-white rounded-xl p-2.5 md:p-4 border border-neutral-200 flex items-center gap-2 md:gap-4 md:col-auto md:row-auto">
                                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-600 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm text-neutral-500">Total Pelanggan</p>
                                    <p className="text-lg md:text-2xl font-bold text-neutral-800">{data.totalCustomers}</p>
                                </div>
                            </div>

                            {/* Customer Balance Card */}
                            <div className="col-start-2 row-start-2 bg-white rounded-xl p-2.5 md:p-4 border border-neutral-200 flex items-center gap-2 md:gap-4 md:col-auto md:row-auto">
                                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                                    <Wallet className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm text-neutral-500">Saldo Pelanggan</p>
                                    <p className="text-sm md:text-2xl font-bold text-emerald-600 truncate">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.totalOutstanding)}
                                    </p>
                                </div>
                            </div>

                            <div className="col-start-1 row-start-3 col-span-2 md:col-span-2 md:row-auto lg:col-span-4 lg:col-start-auto lg:row-start-auto">
                                <PaymentTrendChart periods={data.periods} />
                            </div>
                        </div>

                        {/* Period History */}
                        <div 
                            className="rounded-3xl overflow-hidden bg-white shadow-sm"
                            style={{ 
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <h2 className="text-base md:text-lg font-bold text-slate-800">
                                    Riwayat per Bulan
                                </h2>
                                <select
                                    value={historyRange}
                                    onChange={(event) => setHistoryRange(event.target.value as typeof historyRange)}
                                    className="w-full sm:w-auto min-h-10 px-3 py-2 bg-neutral-100 border-0 rounded-lg text-sm md:text-xs font-medium text-neutral-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    aria-label="Rentang riwayat pembayaran"
                                >
                                    <option value="3">3 bulan terakhir</option>
                                    <option value="6">6 bulan terakhir</option>
                                    <option value="12">12 bulan terakhir</option>
                                    <option value="all">Semua periode</option>
                                </select>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {(historyRange === 'all'
                                    ? data.periods
                                    : data.periods.slice(0, Number(historyRange))
                                ).map((period) => {
                                    const rate = period.totalBills > 0 ? Math.round((period.paidCount / period.totalBills) * 100) : 0;
                                    const isExpanded = expandedPeriods.includes(period.period);
                                    const isLoading = loadingPeriods[period.period];
                                    const errorMsg = errorPeriods[period.period];
                                    const details = periodDetailsMap[period.period] || { paid: [], unpaid: [] };

                                    return (
                                        <div key={period.period} className="transition-colors">
                                            <button
                                                type="button"
                                                onClick={() => togglePeriodDetail(period.period)}
                                                className={`w-full px-4 md:px-6 py-3.5 flex items-center gap-3 md:gap-4 transition-colors duration-150 text-left hover:bg-slate-50 ${
                                                    isExpanded ? 'bg-slate-50/90 font-medium' : ''
                                                }`}
                                                aria-expanded={isExpanded}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                                    rate >= 80 ? 'bg-emerald-600' :
                                                    rate >= 50 ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`}>
                                                    {rate}%
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-800 whitespace-nowrap truncate">{period.periodLabel}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{period.totalBills} tagihan</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                                        {period.paidCount}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                                        {period.unpaidCount}
                                                    </span>
                                                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-slate-700' : 'text-slate-300'}`} />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/60 px-4 md:px-6 py-4 animate-formal-fade-in">
                                                    {isLoading ? (
                                                        <div className="py-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                            <span>Memuat rincian {period.periodLabel}...</span>
                                                        </div>
                                                    ) : errorMsg ? (
                                                        <div className="py-4 text-center text-sm text-rose-600">{errorMsg}</div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Kolom Pembayaran Lunas */}
                                                            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
                                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pembayaran Lunas</h4>
                                                                        <p className="text-[11px] text-slate-400">Tagihan terselesaikan</p>
                                                                    </div>
                                                                    <span className="min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                                                                        {details.paid.length}
                                                                    </span>
                                                                </div>
                                                                {details.paid.length === 0 ? (
                                                                    <p className="text-xs text-slate-400 py-4 text-center">Belum ada pembayaran lunas.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                                                        {details.paid.map((item) => (
                                                                            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs flex items-center justify-between">
                                                                                <span className="font-medium text-slate-800 truncate mr-2">{item.customerNumber} - {item.customerName}</span>
                                                                                <span className="font-semibold text-emerald-700 shrink-0">{formatCurrency(item.totalAmount)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Kolom Belum Lunas */}
                                                            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
                                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Belum Lunas</h4>
                                                                        <p className="text-[11px] text-slate-400">Masih memiliki saldo tagihan</p>
                                                                    </div>
                                                                    <span className="min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                                                                        {details.unpaid.length}
                                                                    </span>
                                                                </div>
                                                                {details.unpaid.length === 0 ? (
                                                                    <p className="text-xs text-slate-400 py-4 text-center">Semua tagihan periode ini telah lunas.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                                                        {details.unpaid.map((item) => (
                                                                            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs flex items-center justify-between">
                                                                                <span className="font-medium text-slate-800 truncate mr-2">{item.customerNumber} - {item.customerName}</span>
                                                                                <span className="font-semibold text-rose-600 shrink-0">{formatCurrency(item.remaining)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="hidden md:block">
                            <h3 className="text-base font-bold text-slate-800 mb-3">Menu Cepat</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Pelanggan', desc: 'Kelola data pelanggan', href: '/', icon: Users, color: 'bg-slate-700 text-white' },
                                    { label: 'Import Data', desc: 'Upload tagihan bulanan', href: '/admin/import', icon: Upload, color: 'bg-blue-600 text-white' },
                                    { label: 'Pengaturan', desc: 'Konfigurasi sistem', href: '/admin/settings', icon: Settings, color: 'bg-slate-600 text-white' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="flex items-center justify-between rounded-xl p-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-colors duration-150 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-slate-800 block">{item.label}</span>
                                                    <span className="text-xs text-slate-500">{item.desc}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </AppLayout>
    );
}
