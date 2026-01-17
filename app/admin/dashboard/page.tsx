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
                        {/* Top Row: Pelanggan + Donut Chart */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Total Pelanggan */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-violet-500/20">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <p className="text-violet-200 text-sm font-medium mb-1">Total Pelanggan</p>
                                        <p className="text-5xl font-bold tracking-tight">{data.totalCustomers}</p>
                                        <p className="text-violet-200/80 text-sm mt-2">pelanggan terdaftar</p>
                                    </div>
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status Pembayaran with Ring Chart */}
                            <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                                <p className="text-sm font-medium text-neutral-500 mb-4">Status Pembayaran</p>
                                <div className="flex items-center gap-8">
                                    {/* Ring Chart */}
                                    <div className="relative w-28 h-28 flex-shrink-0">
                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                            {/* Background ring */}
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#fee2e2" strokeWidth="12" />
                                            {/* Progress ring */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="none"
                                                stroke="url(#progressGradient)"
                                                strokeWidth="12"
                                                strokeLinecap="round"
                                                strokeDasharray={`${paidRate * 2.51} ${251 - paidRate * 2.51}`}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            <defs>
                                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#10b981" />
                                                    <stop offset="100%" stopColor="#34d399" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-neutral-800">{paidRate}%</span>
                                            <span className="text-xs text-neutral-500">Lunas</span>
                                        </div>
                                    </div>
                                    {/* Legend */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <span className="text-sm font-medium text-neutral-700">Lunas</span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-600">{totalPaid}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                                <span className="text-sm font-medium text-neutral-700">Belum</span>
                                            </div>
                                            <span className="text-sm font-bold text-rose-500">{totalUnpaid}</span>
                                        </div>
                                        <p className="text-xs text-neutral-400 text-center pt-1">Total {totalBills} tagihan</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Progress by Month */}
                        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                                <h2 className="font-semibold text-neutral-800">Pembayaran per Bulan</h2>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-neutral-500">Lunas</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                        <span className="text-neutral-500">Belum</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                {data.periods.length === 0 ? (
                                    <div className="py-10 text-center text-neutral-400">
                                        Belum ada data tagihan
                                    </div>
                                ) : (
                                    data.periods.map((period) => {
                                        const rate = getPaymentRate(period);
                                        return (
                                            <div key={period.period}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-neutral-700">{period.periodLabel}</span>
                                                    <div className="flex items-center gap-3 text-xs">
                                                        <span className="text-emerald-600 font-medium">{period.paidCount} lunas</span>
                                                        <span className="text-rose-500 font-medium">{period.unpaidCount} belum</span>
                                                        <span className={`px-2 py-0.5 rounded font-bold ${
                                                            rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                            rate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-rose-100 text-rose-700'
                                                        }`}>
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                    <div
                                                        className="bg-gradient-to-r from-rose-300 to-rose-400 transition-all duration-700"
                                                        style={{ width: `${100 - rate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Quick Actions - Simple Grid */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Pelanggan', href: '/', color: 'violet', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                                { label: 'Import', href: '/admin/import', color: 'emerald', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
                                { label: 'Tambah', href: '/admin/customer/new', color: 'blue', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                                { label: 'Setting', href: '/admin/settings', color: 'amber', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                            ].map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-neutral-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-${item.color}-100 flex items-center justify-center`}>
                                        <svg className={`w-5 h-5 text-${item.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-medium text-neutral-600">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
