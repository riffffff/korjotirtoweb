'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingState from '@/components/state/LoadingState';
import BackButton from '@/components/BackButton';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
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

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Dashboard Admin</h1>
                    <p className="text-sm text-neutral-500">Ringkasan data pelanggan</p>
                </div>
            </header>

            <main className="max-w-lg md:max-w-3xl mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {loading && <LoadingState message="Memuat dashboard..." />}

                {!loading && data && (
                    <>
                        {/* Total Customers */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
                            <p className="text-sm text-neutral-500">Total Pelanggan</p>
                            <p className="text-4xl font-bold text-blue-600 mt-1">{data.totalCustomers}</p>
                        </div>

                        {/* Unpaid Per Period */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-4">
                            <h2 className="font-semibold text-neutral-700 mb-3">Belum Bayar per Periode</h2>
                            <div className="space-y-2">
                                {data.periods.length === 0 ? (
                                    <p className="text-neutral-400 text-center py-4">Belum ada tagihan</p>
                                ) : (
                                    data.periods.map((p) => (
                                        <div
                                            key={p.period}
                                            className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-0"
                                        >
                                            <span className="text-neutral-600">{p.periodLabel}</span>
                                            <span className={`font-bold ${p.unpaidCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {p.unpaidCount > 0 ? `${p.unpaidCount} belum bayar` : 'Lunas semua'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Action */}
                        <div className="pt-4">
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Lihat Daftar Pelanggan
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
