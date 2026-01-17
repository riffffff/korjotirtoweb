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

    const totalPaid = data?.periods.reduce((sum, p) => sum + p.paidCount, 0) || 0;
    const totalUnpaid = data?.periods.reduce((sum, p) => sum + p.unpaidCount, 0) || 0;
    const totalBills = totalPaid + totalUnpaid;
    const paidRate = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

    const getPaymentRate = (period: PeriodStats) => {
        if (period.totalBills === 0) return 100;
        return Math.round((period.paidCount / period.totalBills) * 100);
    };

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
                    <div className="space-y-8">
                        {/* Stats Cards Row */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Total Pelanggan</p>
                                        <p className="text-3xl font-bold text-neutral-800">{data.totalCustomers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Sudah Bayar</p>
                                        <p className="text-3xl font-bold text-emerald-600">{totalPaid}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Belum Bayar</p>
                                        <p className="text-3xl font-bold text-rose-600">{totalUnpaid}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart & Table Section */}
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-neutral-100">
                                <h2 className="text-lg font-semibold text-neutral-800">Statistik Pembayaran</h2>
                                <p className="text-sm text-neutral-500">Perbandingan pembayaran per bulan</p>
                            </div>

                            {/* Horizontal Bar Chart */}
                            <div className="p-6">
                                {data.periods.length === 0 ? (
                                    <div className="py-12 text-center text-neutral-400">
                                        Belum ada data tagihan
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {data.periods.map((period) => {
                                            const rate = getPaymentRate(period);
                                            return (
                                                <div key={period.period} className="flex items-center gap-6">
                                                    <div className="w-28 flex-shrink-0">
                                                        <p className="font-medium text-neutral-800 text-sm">{period.periodLabel}</p>
                                                        <p className="text-xs text-neutral-400">{period.totalBills} tagihan</p>
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="h-8 bg-neutral-100 rounded-lg overflow-hidden flex">
                                                            <div
                                                                className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                                                                style={{ width: `${rate}%` }}
                                                            >
                                                                {rate >= 10 && <span className="text-xs text-white font-medium">{period.paidCount}</span>}
                                                            </div>
                                                            <div
                                                                className="bg-rose-400 flex items-center justify-center transition-all duration-500"
                                                                style={{ width: `${100 - rate}%` }}
                                                            >
                                                                {(100 - rate) >= 10 && <span className="text-xs text-white font-medium">{period.unpaidCount}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-16 text-right">
                                                        <span className={`text-sm font-bold ${
                                                            rate >= 80 ? 'text-emerald-600' :
                                                            rate >= 50 ? 'text-amber-600' :
                                                            'text-rose-600'
                                                        }`}>
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-center gap-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-emerald-500" />
                                    <span className="text-sm text-neutral-600">Sudah Bayar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-rose-400" />
                                    <span className="text-sm text-neutral-600">Belum Bayar</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-4">Menu Cepat</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <button
                                    onClick={() => router.push('/')}
                                    className="bg-white rounded-xl p-4 border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center gap-3"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">Pelanggan</span>
                                </button>
                                <button
                                    onClick={() => router.push('/admin/import')}
                                    className="bg-white rounded-xl p-4 border border-neutral-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center gap-3"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">Import</span>
                                </button>
                                <button
                                    onClick={() => router.push('/admin/customer/new')}
                                    className="bg-white rounded-xl p-4 border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center gap-3"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">Tambah</span>
                                </button>
                                <button
                                    onClick={() => router.push('/admin/settings')}
                                    className="bg-white rounded-xl p-4 border border-neutral-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col items-center gap-3"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">Setting</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
