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

// Ring Chart Component
function RingChart({ percentage, size = 80 }: { percentage: number; size?: number }) {
    const strokeWidth = size > 60 ? 8 : 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    const getColor = (pct: number) => {
        if (pct >= 80) return { stroke: '#10b981', bg: '#d1fae5' };
        if (pct >= 50) return { stroke: '#f59e0b', bg: '#fef3c7' };
        return { stroke: '#ef4444', bg: '#fee2e2' };
    };
    
    const colors = getColor(percentage);
    
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.bg}
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-bold text-neutral-800 ${size > 60 ? 'text-lg' : 'text-sm'}`}>{percentage}%</span>
            </div>
        </div>
    );
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
                        {/* Total Pelanggan */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white/70 text-sm">Total Pelanggan</p>
                                <p className="text-3xl font-bold">{data.totalCustomers}</p>
                            </div>
                        </div>

                        {/* Monthly Stats Grid with Ring Charts */}
                        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                            <div className="p-5 border-b border-neutral-100">
                                <h2 className="font-semibold text-neutral-800">Statistik Pembayaran per Bulan</h2>
                            </div>
                            
                            {data.periods.length === 0 ? (
                                <div className="p-12 text-center text-neutral-400">
                                    Belum ada data tagihan
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100">
                                    {data.periods.map((period) => {
                                        const rate = getPaymentRate(period);
                                        return (
                                            <div key={period.period} className="p-5 flex items-center gap-5 hover:bg-neutral-50 transition-colors">
                                                <RingChart percentage={rate} size={70} />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-neutral-800">{period.periodLabel}</h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm">
                                                        <span className="text-neutral-500">{period.totalBills} tagihan</span>
                                                        <span className="text-emerald-600">{period.paidCount} lunas</span>
                                                        <span className="text-rose-500">{period.unpaidCount} belum</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-4 gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="bg-white rounded-2xl p-5 border border-neutral-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Pelanggan</span>
                            </button>
                            <button
                                onClick={() => router.push('/admin/import')}
                                className="bg-white rounded-2xl p-5 border border-neutral-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Import</span>
                            </button>
                            <button
                                onClick={() => router.push('/admin/customer/new')}
                                className="bg-white rounded-2xl p-5 border border-neutral-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Tambah</span>
                            </button>
                            <button
                                onClick={() => router.push('/admin/settings')}
                                className="bg-white rounded-2xl p-5 border border-neutral-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-neutral-700">Setting</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
