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
                        {/* Header Card - Total Pelanggan */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium">Total Pelanggan Aktif</p>
                                    <p className="text-5xl font-bold mt-1">{data.totalCustomers}</p>
                                </div>
                                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Stats */}
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-neutral-800">Statistik Pembayaran</h2>
                                    <p className="text-sm text-neutral-500">Persentase per bulan</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                                        Lunas
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full bg-neutral-200" />
                                        Belum
                                    </span>
                                </div>
                            </div>

                            {data.periods.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-neutral-500">Belum ada data tagihan</p>
                                </div>
                            ) : (
                                <div className="p-6 space-y-6">
                                    {data.periods.map((period, index) => {
                                        const rate = getPaymentRate(period);
                                        return (
                                            <div key={period.period} className="group">
                                                <div className="flex items-center gap-4 mb-3">
                                                    {/* Month indicator */}
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                                                        index === 0 ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                                                        'bg-neutral-200 text-neutral-600'
                                                    }`}>
                                                        {period.periodLabel.slice(0, 3).toUpperCase()}
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium text-neutral-800">{period.periodLabel}</p>
                                                                <p className="text-xs text-neutral-400">{period.totalBills} tagihan</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right text-sm">
                                                                    <span className="text-emerald-600 font-semibold">{period.paidCount}</span>
                                                                    <span className="text-neutral-300 mx-1">/</span>
                                                                    <span className="text-neutral-500">{period.totalBills}</span>
                                                                </div>
                                                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                                    rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                    rate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                    {rate}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Progress bar */}
                                                        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                                                                style={{ width: `${rate}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions - Modern Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Pelanggan', href: '/', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', gradient: 'from-blue-500 to-indigo-600' },
                                { label: 'Import', href: '/admin/import', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', gradient: 'from-emerald-500 to-teal-600' },
                                { label: 'Tambah', href: '/admin/customer/new', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', gradient: 'from-violet-500 to-purple-600' },
                                { label: 'Setting', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', gradient: 'from-amber-500 to-orange-600' },
                            ].map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className="group bg-white rounded-2xl p-5 border border-neutral-200 hover:border-transparent hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-3 relative overflow-hidden"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                    <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center group-hover:bg-white/20 transition-colors`}>
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                    </div>
                                    <span className="relative text-sm font-semibold text-neutral-700 group-hover:text-white transition-colors">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
