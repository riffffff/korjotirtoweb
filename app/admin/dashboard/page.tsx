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
function RingChart({ percentage, size = 120, strokeWidth = 12 }: { percentage: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
                <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{percentage}%</span>
                <span className="text-sm text-slate-500">Lunas</span>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            router.push('/');
            return;
        }
        fetchStats();
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (data?.periods.length && !selectedPeriod) {
            setSelectedPeriod(data.periods[0].period);
        }
    }, [data, selectedPeriod]);

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

    const currentPeriod = data?.periods.find(p => p.period === selectedPeriod);
    const paidCount = currentPeriod?.paidCount || 0;
    const unpaidCount = currentPeriod?.unpaidCount || 0; 
    const totalBills = currentPeriod?.totalBills || 0;
    const paymentRate = totalBills > 0 ? Math.round((paidCount / totalBills) * 100) : 0;

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
                        {/* Top Section: Pelanggan + Ring Chart - Side by Side */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Pelanggan Card */}
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-medium text-slate-500">Total Pelanggan</p>
                                <p className="text-3xl font-bold text-slate-800 mt-1">{data.totalCustomers}</p>
                            </div>

                            {/* Ring Chart Card */}
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-800">Statistik</h2>
                                        <p className="text-xs text-slate-500">per periode</p>
                                    </div>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="px-2 py-1 bg-slate-100 border-0 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {data.periods.map((p) => (
                                            <option key={p.period} value={p.period}>
                                                {p.periodLabel}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-4">
                                    <RingChart percentage={paymentRate} size={80} strokeWidth={8} />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs text-slate-500">Lunas</span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-600">{paidCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-rose-400" />
                                                <span className="text-xs text-slate-500">Belum</span>
                                            </div>
                                            <span className="text-sm font-bold text-rose-500">{unpaidCount}</span>
                                        </div>
                                        <div className="pt-1 border-t border-slate-100">
                                            <p className="text-xs text-slate-400">Total {totalBills}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Period List */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Riwayat per Bulan</h2>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {data.periods.map((period) => {
                                    const rate = period.totalBills > 0 ? Math.round((period.paidCount / period.totalBills) * 100) : 0;
                                    return (
                                        <button
                                            key={period.period}
                                            onClick={() => setSelectedPeriod(period.period)}
                                            className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left ${
                                                selectedPeriod === period.period ? 'bg-indigo-50' : ''
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                                                rate >= 80 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                                                rate >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                'bg-gradient-to-br from-rose-400 to-pink-500'
                                            }`}>
                                                {rate}%
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{period.periodLabel}</p>
                                                <p className="text-sm text-slate-500">{period.totalBills} tagihan</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">
                                                    <span className="text-emerald-600 font-medium">{period.paidCount} lunas</span>
                                                    <span className="text-slate-300 mx-2">|</span>
                                                    <span className="text-rose-500 font-medium">{period.unpaidCount} belum</span>
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Menu Cepat</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Pelanggan', href: '/', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', from: 'from-indigo-500', to: 'to-purple-600' },
                                    { label: 'Import', href: '/admin/import', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', from: 'from-emerald-500', to: 'to-teal-600' },
                                    { label: 'Tambah', href: '/admin/customer/new', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', from: 'from-blue-500', to: 'to-cyan-600' },
                                    { label: 'Setting', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', from: 'from-amber-500', to: 'to-orange-600' },
                                ].map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className="group bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-xl transition-all flex items-center gap-4"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.from} ${item.to} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-slate-700">{item.label}</span>
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
