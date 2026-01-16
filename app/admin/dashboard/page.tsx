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
            {/* Header - consistent with homepage */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg md:max-w-none mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Dashboard</h1>
                </div>
            </header>

            <main className="max-w-lg md:max-w-none mx-auto px-4 py-6 space-y-6">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <>
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Total Pelanggan Card */}
                            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-blue-500/25">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Total Pelanggan</p>
                                        <p className="text-4xl font-bold mt-1">{data.totalCustomers}</p>
                                        <p className="text-blue-200 text-sm mt-1">pelanggan terdaftar</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Status Card with Donut */}
                            <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
                                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-4">Status Pembayaran</p>
                                <div className="flex items-center gap-6">
                                    {/* Donut Chart */}
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14" fill="none" stroke="#fecaca" strokeWidth="4" />
                                            <circle
                                                cx="18" cy="18" r="14"
                                                fill="none"
                                                stroke="#22c55e"
                                                strokeWidth="4"
                                                strokeDasharray={`${paidRate * 0.88} ${88 - paidRate * 0.88}`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl font-bold text-neutral-800">{paidRate}%</span>
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="text-sm text-neutral-600">Lunas</span>
                                            </div>
                                            <span className="text-sm font-semibold text-neutral-800">{totalPaid}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                                <span className="text-sm text-neutral-600">Belum</span>
                                            </div>
                                            <span className="text-sm font-semibold text-neutral-800">{totalUnpaid}</span>
                                        </div>
                                        <div className="pt-2 border-t border-neutral-100">
                                            <span className="text-xs text-neutral-400">Total {totalBills} tagihan</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Progress by Month */}
                        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-neutral-100">
                                <h2 className="font-semibold text-neutral-800">Pembayaran per Bulan</h2>
                            </div>
                            <div className="p-5 space-y-5">
                                {data.periods.length === 0 ? (
                                    <div className="py-8 text-center text-neutral-400">
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
                                                        <span className="text-green-600 font-medium">✓ {period.paidCount}</span>
                                                        <span className="text-red-500 font-medium">✗ {period.unpaidCount}</span>
                                                        <span className="text-neutral-800 font-bold bg-neutral-100 px-2 py-0.5 rounded">
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-l-full transition-all duration-500"
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                    <div
                                                        className="bg-gradient-to-r from-red-300 to-red-400 rounded-r-full transition-all duration-500"
                                                        style={{ width: `${100 - rate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Pelanggan', href: '/', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'blue' },
                                { label: 'Import', href: '/admin/import', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', color: 'green' },
                                { label: 'Tambah', href: '/admin/customer/new', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'purple' },
                                { label: 'Setting', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'orange' },
                            ].map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={`flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-neutral-100 hover:border-${item.color}-200 hover:shadow-md transition-all group`}
                                >
                                    <div className={`w-10 h-10 bg-${item.color}-50 rounded-lg flex items-center justify-center group-hover:bg-${item.color}-500 transition-colors`}>
                                        <svg className={`w-5 h-5 text-${item.color}-500 group-hover:text-white transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-medium text-neutral-600">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
