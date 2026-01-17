'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingState from '@/components/state/LoadingState';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
    paidCount: number;
    unpaidCount: number;
}

interface DashboardData {
    totalCustomers: number;
    periods: PeriodStats[];
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            router.push('/');
            return;
        }
        fetchStats();
    }, [isAdmin, authLoading, router]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) return null;

    const getPaymentRate = (period: PeriodStats) => {
        if (period.totalBills === 0) return 100;
        return Math.round((period.paidCount / period.totalBills) * 100);
    };

    const totalPaid = data?.periods.reduce((sum, p) => sum + p.paidCount, 0) || 0;
    const totalUnpaid = data?.periods.reduce((sum, p) => sum + p.unpaidCount, 0) || 0;
    const totalBills = totalPaid + totalUnpaid;
    const paidRate = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

    return (
        <>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg md:max-w-none mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Dashboard</h1>
                </div>
            </header>

            <main className="max-w-lg md:max-w-none mx-auto px-4 py-6">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <div className="space-y-6">
                        {/* Top Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Total Pelanggan */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 text-violet-200 mb-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm font-medium">Total Pelanggan</span>
                                    </div>
                                    <p className="text-5xl font-bold">{data.totalCustomers}</p>
                                    <p className="text-violet-200 text-sm mt-1">pelanggan aktif</p>
                                </div>
                            </div>

                            {/* Card 2: Sudah Bayar */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 text-emerald-200 mb-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-medium">Sudah Bayar</span>
                                    </div>
                                    <p className="text-5xl font-bold">{totalPaid}</p>
                                    <p className="text-emerald-200 text-sm mt-1">{paidRate}% dari total tagihan</p>
                                </div>
                            </div>

                            {/* Card 3: Belum Bayar */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 text-rose-200 mb-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-medium">Belum Bayar</span>
                                    </div>
                                    <p className="text-5xl font-bold">{totalUnpaid}</p>
                                    <p className="text-rose-200 text-sm mt-1">{100 - paidRate}% dari total tagihan</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                            <div className="p-6 border-b border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-neutral-800">Statistik Pembayaran</h2>
                                        <p className="text-sm text-neutral-500">Perbandingan per bulan</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-neutral-600">Lunas</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-rose-400" />
                                            <span className="text-neutral-600">Belum</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                {data.periods.length === 0 ? (
                                    <div className="py-12 text-center text-neutral-400">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p>Belum ada data tagihan</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {data.periods.map((period) => {
                                            const rate = getPaymentRate(period);
                                            return (
                                                <div key={period.period} className="group">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                                                                <span className="text-sm font-bold text-indigo-600">
                                                                    {period.periodLabel.split(' ')[0].slice(0, 3)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-neutral-800">{period.periodLabel}</p>
                                                                <p className="text-xs text-neutral-500">{period.totalBills} tagihan</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-sm font-semibold text-emerald-600">{period.paidCount} lunas</p>
                                                                <p className="text-sm font-semibold text-rose-500">{period.unpaidCount} belum</p>
                                                            </div>
                                                            <div className="w-16 text-right">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold ${
                                                                    rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                    rate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                    {rate}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Progress Bar */}
                                                    <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
                                                            style={{ width: `${rate}%` }}
                                                        />
                                                        <div
                                                            className="bg-gradient-to-r from-rose-300 to-rose-400 transition-all duration-700 ease-out"
                                                            style={{ width: `${100 - rate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-200 p-5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-violet-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <svg className="w-6 h-6 text-violet-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-700 group-hover:text-white transition-colors">Pelanggan</span>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/import')}
                                className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-200 p-5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <svg className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-700 group-hover:text-white transition-colors">Import Data</span>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/customer/new')}
                                className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-200 p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-700 group-hover:text-white transition-colors">Tambah</span>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/admin/settings')}
                                className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-200 p-5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-amber-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <svg className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-700 group-hover:text-white transition-colors">Pengaturan</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
