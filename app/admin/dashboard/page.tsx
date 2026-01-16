'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingState from '@/components/state/LoadingState';
import { formatCurrency } from '@/lib/formatCurrency';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
    unpaidCount: number;
    paidCount: number;
    totalAmount: number;
    paidAmount: number;
}

interface DashboardData {
    totalCustomers: number;
    totalRevenue: number;
    totalOutstanding: number;
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

    return (
        <>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
                    <p className="text-sm text-neutral-500">Ringkasan data & statistik</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Pelanggan */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Pelanggan</p>
                                        <p className="text-4xl font-bold mt-2">{data.totalCustomers}</p>
                                        <p className="text-blue-200 text-xs mt-1">pelanggan aktif</p>
                                    </div>
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Total Pendapatan */}
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm font-medium">Total Pendapatan</p>
                                        <p className="text-3xl font-bold mt-2">{formatCurrency(data.totalRevenue || 0)}</p>
                                        <p className="text-green-200 text-xs mt-1">sudah terbayar</p>
                                    </div>
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Total Tunggakan */}
                            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-orange-100 text-sm font-medium">Total Tunggakan</p>
                                        <p className="text-3xl font-bold mt-2">{formatCurrency(data.totalOutstanding || 0)}</p>
                                        <p className="text-orange-200 text-xs mt-1">belum terbayar</p>
                                    </div>
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Period Stats */}
                        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-100">
                                <h2 className="font-semibold text-neutral-800">Status Pembayaran per Periode</h2>
                                <p className="text-sm text-neutral-500">12 periode terakhir</p>
                            </div>
                            <div className="divide-y divide-neutral-100">
                                {data.periods.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-neutral-400">
                                        Belum ada data tagihan
                                    </div>
                                ) : (
                                    data.periods.map((period) => {
                                        const rate = getPaymentRate(period);
                                        return (
                                            <div key={period.period} className="px-6 py-4 hover:bg-neutral-50 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <span className="font-medium text-neutral-800">{period.periodLabel}</span>
                                                        <span className="text-sm text-neutral-500 ml-2">
                                                            ({period.totalBills} tagihan)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-sm font-medium ${rate === 100 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {rate}% lunas
                                                        </span>
                                                        {period.unpaidCount > 0 && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                                {period.unpaidCount} belum bayar
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            rate === 100 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${rate}%` }}
                                                    />
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
                                className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-neutral-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                    <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Pelanggan</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/import')}
                                className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-neutral-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                                    <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Import</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/customer/new')}
                                className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-neutral-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                                    <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Tambah</span>
                            </button>

                            <button
                                onClick={() => router.push('/admin/settings')}
                                className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-neutral-200 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                    <svg className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
