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

    // Calculate totals
    const totalPaid = data?.periods.reduce((sum, p) => sum + p.paidCount, 0) || 0;
    const totalUnpaid = data?.periods.reduce((sum, p) => sum + p.unpaidCount, 0) || 0;
    const totalBills = totalPaid + totalUnpaid;
    const overallRate = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-white/20">
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Ringkasan statistik pembayaran</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <div className="space-y-8">
                        {/* Stats Overview Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Pelanggan */}
                            <div className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Total Pelanggan</p>
                                <p className="text-4xl font-bold text-slate-800 mt-1">{data.totalCustomers}</p>
                            </div>

                            {/* Tagihan */}
                            <div className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Total Tagihan</p>
                                <p className="text-4xl font-bold text-slate-800 mt-1">{totalBills}</p>
                            </div>

                            {/* Sudah Bayar */}
                            <div className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Sudah Bayar</p>
                                <p className="text-4xl font-bold text-emerald-600 mt-1">{totalPaid}</p>
                                <p className="text-xs text-emerald-500 mt-1">{overallRate}% dari total</p>
                            </div>

                            {/* Belum Bayar */}
                            <div className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Belum Bayar</p>
                                <p className="text-4xl font-bold text-rose-600 mt-1">{totalUnpaid}</p>
                                <p className="text-xs text-rose-500 mt-1">{100 - overallRate}% dari total</p>
                            </div>
                        </div>

                        {/* Monthly Chart */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Statistik per Bulan</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Persentase pembayaran tiap periode</p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                                        <span className="text-slate-600">Lunas</span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-slate-200" />
                                        <span className="text-slate-600">Belum</span>
                                    </span>
                                </div>
                            </div>

                            {data.periods.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-500 font-medium">Belum ada data tagihan</p>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <div className="space-y-6">
                                        {data.periods.map((period) => {
                                            const rate = getPaymentRate(period);
                                            return (
                                                <div key={period.period} className="group">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                                                                rate >= 80 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                                                                rate >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                                'bg-gradient-to-br from-rose-400 to-pink-500'
                                                            }`}>
                                                                {rate}%
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{period.periodLabel}</p>
                                                                <p className="text-sm text-slate-500">{period.totalBills} tagihan</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 text-sm">
                                                            <div className="text-right">
                                                                <p className="font-semibold text-emerald-600">{period.paidCount}</p>
                                                                <p className="text-slate-400 text-xs">lunas</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold text-rose-500">{period.unpaidCount}</p>
                                                                <p className="text-slate-400 text-xs">belum</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${rate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Menu Cepat</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Pelanggan', href: '/', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', from: 'from-indigo-500', to: 'to-purple-600' },
                                    { label: 'Import Data', href: '/admin/import', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', from: 'from-emerald-500', to: 'to-teal-600' },
                                    { label: 'Tambah', href: '/admin/customer/new', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', from: 'from-blue-500', to: 'to-cyan-600' },
                                    { label: 'Pengaturan', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', from: 'from-amber-500', to: 'to-orange-600' },
                                ].map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-transparent hover:shadow-xl transition-all duration-300 flex items-center gap-4"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.from} ${item.to} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-slate-700 group-hover:text-slate-900">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
