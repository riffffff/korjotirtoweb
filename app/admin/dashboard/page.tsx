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

    // Calculate overall stats
    const totalPaid = data?.periods.reduce((sum, p) => sum + p.paidCount, 0) || 0;
    const totalUnpaid = data?.periods.reduce((sum, p) => sum + p.unpaidCount, 0) || 0;
    const totalBills = totalPaid + totalUnpaid;
    const paidRate = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

    return (
        <>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
                    <p className="text-sm text-neutral-500">Ringkasan statistik pembayaran</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <>
                        {/* Top Row: Pelanggan Card + Donut Chart */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Total Pelanggan */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Pelanggan</p>
                                        <p className="text-5xl font-bold mt-2">{data.totalCustomers}</p>
                                        <p className="text-blue-200 text-sm mt-2">pelanggan terdaftar</p>
                                    </div>
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Donut Chart: Sudah Bayar vs Belum Bayar */}
                            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                                <h3 className="text-sm font-medium text-neutral-500 mb-4">Status Pembayaran Keseluruhan</h3>
                                <div className="flex items-center justify-center gap-8">
                                    {/* Donut Chart */}
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            {/* Background circle */}
                                            <circle
                                                cx="18" cy="18" r="15.915"
                                                fill="none"
                                                stroke="#fee2e2"
                                                strokeWidth="3"
                                            />
                                            {/* Paid portion */}
                                            <circle
                                                cx="18" cy="18" r="15.915"
                                                fill="none"
                                                stroke="url(#greenGradient)"
                                                strokeWidth="3"
                                                strokeDasharray={`${paidRate} ${100 - paidRate}`}
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#22c55e" />
                                                    <stop offset="100%" stopColor="#10b981" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        {/* Center text */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-neutral-800">{paidRate}%</span>
                                            <span className="text-xs text-neutral-500">Lunas</span>
                                        </div>
                                    </div>
                                    {/* Legend */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-800">{totalPaid} Lunas</p>
                                                <p className="text-xs text-neutral-500">{paidRate}% dari total</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-red-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-800">{totalUnpaid} Belum</p>
                                                <p className="text-xs text-neutral-500">{100 - paidRate}% dari total</p>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-neutral-100">
                                            <p className="text-xs text-neutral-500">Total {totalBills} tagihan</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Period Stats with Bar Chart Style */}
                        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-100">
                                <h2 className="font-semibold text-neutral-800">Persentase Pembayaran per Bulan</h2>
                                <p className="text-sm text-neutral-500">Perbandingan lunas vs belum bayar</p>
                            </div>
                            <div className="p-6 space-y-4">
                                {data.periods.length === 0 ? (
                                    <div className="py-8 text-center text-neutral-400">
                                        Belum ada data tagihan
                                    </div>
                                ) : (
                                    data.periods.map((period) => {
                                        const rate = getPaymentRate(period);
                                        return (
                                            <div key={period.period} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium text-neutral-700">{period.periodLabel}</span>
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <span className="text-green-600">
                                                            ✓ {period.paidCount} lunas
                                                        </span>
                                                        <span className="text-red-600">
                                                            ✗ {period.unpaidCount} belum
                                                        </span>
                                                        <span className="font-bold text-neutral-800 w-12 text-right">
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Stacked Bar */}
                                                <div className="h-5 bg-neutral-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-gradient-to-r from-green-400 to-green-500 transition-all flex items-center justify-center"
                                                        style={{ width: `${rate}%` }}
                                                    >
                                                        {rate >= 15 && (
                                                            <span className="text-[10px] text-white font-medium">{period.paidCount}</span>
                                                        )}
                                                    </div>
                                                    <div
                                                        className="bg-gradient-to-r from-red-400 to-red-500 transition-all flex items-center justify-center"
                                                        style={{ width: `${100 - rate}%` }}
                                                    >
                                                        {(100 - rate) >= 15 && (
                                                            <span className="text-[10px] text-white font-medium">{period.unpaidCount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-neutral-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
                            >
                                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                    <svg className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Pelanggan</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/import')}
                                className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-neutral-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-500/10 transition-all group"
                            >
                                <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                                    <svg className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Import</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/customer/new')}
                                className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-neutral-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 transition-all group"
                            >
                                <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                                    <svg className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Tambah</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/settings')}
                                className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-neutral-200 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 transition-all group"
                            >
                                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                    <svg className="w-5 h-5 text-orange-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Pengaturan</span>
                            </button>
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
