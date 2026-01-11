'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { customerService, DashboardStats } from '@/services/customerService';
import LoadingState from '@/components/state/LoadingState';
import BackButton from '@/components/BackButton';

export default function AdminDashboard() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Wait for auth to complete before checking
        if (authLoading) return;

        if (!isAdmin) {
            router.push('/');
            return;
        }
        fetchStats();
    }, [isAdmin, authLoading, router]);

    const fetchStats = async () => {
        try {
            const data = await customerService.getDashboard();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Show loading while auth is being checked
    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Dashboard Admin</h1>
                    <p className="text-sm text-neutral-500">Ringkasan data pelanggan</p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {loading && <LoadingState message="Memuat dashboard..." />}

                {!loading && stats && (
                    <>
                        {/* Main Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label="Total Pelanggan"
                                value={stats.totalCustomers.toString()}
                                icon="👥"
                                color="blue"
                            />
                            <StatCard
                                label="Ada Tagihan"
                                value={stats.customersWithDebt.toString()}
                                icon="⚠️"
                                color="red"
                            />
                        </div>

                        {/* Financial Stats */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4 animate-slide-up">
                            <h2 className="font-semibold text-neutral-700">Ringkasan Keuangan</h2>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-600">Total Tagihan</span>
                                    <span className="font-bold text-neutral-800">
                                        {formatCurrency(stats.totalRevenue)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-600">Sudah Dibayar</span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(stats.totalPaid)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-neutral-200">
                                    <span className="font-semibold text-neutral-700">Belum Dibayar</span>
                                    <span className="font-bold text-red-600 text-lg">
                                        {formatCurrency(stats.totalOutstanding)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label="Lunas Semua"
                                value={stats.customersPaidFull.toString()}
                                icon="✅"
                                color="green"
                            />
                            <StatCard
                                label={`Tagihan ${stats.currentPeriod}`}
                                value={stats.thisMonthBills.toString()}
                                icon="📄"
                                color="purple"
                            />
                        </div>

                        {/* Actions */}
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

// Stat Card Component
function StatCard({
    label,
    value,
    icon,
    color
}: {
    label: string;
    value: string;
    icon: string;
    color: 'blue' | 'red' | 'green' | 'purple';
}) {
    const colors = {
        blue: 'bg-blue-50 border-blue-100',
        red: 'bg-red-50 border-red-100',
        green: 'bg-green-50 border-green-100',
        purple: 'bg-purple-50 border-purple-100',
    };

    const textColors = {
        blue: 'text-blue-600',
        red: 'text-red-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
    };

    return (
        <div className={`rounded-xl p-4 border ${colors[color]} animate-slide-up`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-neutral-500">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
        </div>
    );
}
