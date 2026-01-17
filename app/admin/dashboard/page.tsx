'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, DashboardData } from '@/hooks/useDashboard';
import LoadingState from '@/components/state/LoadingState';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
    paidCount: number;
    unpaidCount: number;
}

// Animated Counter Component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}

// Simple Ring Chart Component
function RingChart({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">
                    <AnimatedNumber value={percentage} />%
                </span>
                <span className="text-xs font-medium text-slate-500">Lunas</span>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ 
    icon, 
    label, 
    value, 
    gradient, 
    delay = 0 
}: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    gradient: string;
    delay?: number;
}) {
    return (
        <div 
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            style={{ 
                animationDelay: `${delay}ms`,
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.5)'
            }}
        >
            {/* Gradient overlay on hover */}
            <div 
                className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`}
            />
            <div className="relative flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="text-3xl font-black text-slate-800">
                        <AnimatedNumber value={value} />
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { data, loading, error } = useDashboard();
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            router.push('/');
            return;
        }
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (data?.periods.length && !selectedPeriod) {
            setSelectedPeriod(data.periods[0].period);
        }
    }, [data, selectedPeriod]);

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) return null;

    const currentPeriod = data?.periods.find(p => p.period === selectedPeriod);
    const paidCount = currentPeriod?.paidCount || 0;
    const unpaidCount = currentPeriod?.unpaidCount || 0; 
    const totalBills = currentPeriod?.totalBills || 0;
    const paymentRate = totalBills > 0 ? Math.round((paidCount / totalBills) * 100) : 0;

    return (
        <>
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Dashboard</h1>
                    <p className="text-sm text-neutral-500">Ringkasan statistik pembayaran</p>
                </div>
            </header>

            <main className="relative max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <LoadingState variant="skeleton-list" count={3} />
                ) : data && (
                    <div className="space-y-8">
                        {/* Stats Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Ring Chart Card - Per Period */}
                            <div className="bg-white rounded-xl p-4 border border-neutral-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-neutral-600">Per Periode</h3>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="px-2 py-1 bg-neutral-100 border-0 rounded-lg text-xs font-medium text-neutral-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {data.periods.map((p) => (
                                            <option key={p.period} value={p.period}>
                                                {p.periodLabel}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col items-center">
                                    <RingChart percentage={paymentRate} size={100} strokeWidth={8} />
                                    <div className="mt-3 flex gap-4 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-emerald-600">{paidCount}</p>
                                            <p className="text-xs text-neutral-500">Lunas</p>
                                        </div>
                                        <div className="w-px bg-neutral-200" />
                                        <div>
                                            <p className="text-lg font-bold text-rose-500">{unpaidCount}</p>
                                            <p className="text-xs text-neutral-500">Belum</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ring Chart Card - All Periods */}
                            <div className="bg-white rounded-xl p-4 border border-neutral-200">
                                <h3 className="text-sm font-medium text-neutral-600 mb-4">Semua Periode</h3>
                                <div className="flex flex-col items-center">
                                    {(() => {
                                        const allPaid = data.periods.reduce((sum, p) => sum + p.paidCount, 0);
                                        const allUnpaid = data.periods.reduce((sum, p) => sum + p.unpaidCount, 0);
                                        const allTotal = allPaid + allUnpaid;
                                        const allRate = allTotal > 0 ? Math.round((allPaid / allTotal) * 100) : 0;
                                        return (
                                            <>
                                                <RingChart percentage={allRate} size={100} strokeWidth={8} />
                                                <div className="mt-3 flex gap-4 text-center">
                                                    <div>
                                                        <p className="text-lg font-bold text-emerald-600">{allPaid}</p>
                                                        <p className="text-xs text-neutral-500">Lunas</p>
                                                    </div>
                                                    <div className="w-px bg-neutral-200" />
                                                    <div>
                                                        <p className="text-lg font-bold text-rose-500">{allUnpaid}</p>
                                                        <p className="text-xs text-neutral-500">Belum</p>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Total Pelanggan Card */}
                            <div className="bg-white rounded-xl p-4 border border-neutral-200 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Total Pelanggan</p>
                                    <p className="text-2xl font-bold text-neutral-800">{data.totalCustomers}</p>
                                </div>
                            </div>

                            {/* Customer Balance Card */}
                            <div className="bg-white rounded-xl p-4 border border-neutral-200 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Saldo Pelanggan</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.totalOutstanding)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Period History */}
                        <div 
                            className="rounded-3xl overflow-hidden bg-white shadow-sm"
                            style={{ 
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <div className="px-6 py-5 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Riwayat per Bulan</h2>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {data.periods.map((period, index) => {
                                    const rate = period.totalBills > 0 ? Math.round((period.paidCount / period.totalBills) * 100) : 0;
                                    const isSelected = selectedPeriod === period.period;
                                    return (
                                        <button
                                            key={period.period}
                                            onClick={() => setSelectedPeriod(period.period)}
                                            className={`w-full px-6 py-4 flex items-center gap-4 transition-all text-left hover:bg-slate-50 ${
                                                isSelected ? 'bg-slate-100' : ''
                                            }`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                                                rate >= 80 ? 'bg-emerald-500' :
                                                rate >= 50 ? 'bg-amber-500' :
                                                'bg-rose-500'
                                            }`}>
                                                {rate}%
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{period.periodLabel}</p>
                                                <p className="text-sm text-slate-500">{period.totalBills} tagihan</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                        {period.paidCount}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-sm font-medium">
                                                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                                                        {period.unpaidCount}
                                                    </span>
                                                </div>
                                                <svg className={`w-5 h-5 transition-transform ${isSelected ? 'text-slate-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Menu Cepat</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Pelanggan', desc: 'Kelola data pelanggan', href: '/', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', gradient: 'from-slate-600 to-slate-700' },
                                    { label: 'Import Data', desc: 'Upload tagihan bulanan', href: '/admin/import', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', gradient: 'from-emerald-500 to-emerald-600' },
                                    { label: 'Pengaturan', desc: 'Konfigurasi sistem', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', gradient: 'from-slate-500 to-slate-600' },
                                ].map((item, index) => (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-white"
                                        style={{ 
                                            border: '1px solid #e2e8f0',
                                            animationDelay: `${index * 100}ms`
                                        }}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                                        <div className="relative flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-800 block">{item.label}</span>
                                                <span className="text-sm text-slate-500">{item.desc}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-2">
                                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
