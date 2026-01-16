'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

export default function CreateBillsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [period, setPeriod] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Set default period to current month
    useEffect(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setPeriod(`${year}-${month}`);
    }, []);

    const handleCreateBills = async () => {
        if (!period) {
            alert('Pilih periode terlebih dahulu');
            return;
        }

        const confirmed = window.confirm(
            `Yakin ingin membuat tagihan untuk periode ${formatPeriod(period)}?\n\n` +
            `Ini akan membuat tagihan untuk semua pelanggan yang sudah memiliki data meter bulan sebelumnya.`
        );

        if (!confirmed) return;

        setSubmitting(true);
        setResult(null);

        try {
            const res = await fetch('/api/bills/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period,
                    role: localStorage.getItem('role')
                }),
            });
            const data = await res.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: `Berhasil membuat ${data.count} tagihan untuk periode ${formatPeriod(period)}`
                });
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Gagal membuat tagihan'
                });
            }
        } catch (error) {
            console.error('Failed to create bills:', error);
            setResult({ success: false, message: 'Gagal membuat tagihan' });
        } finally {
            setSubmitting(false);
        }
    };

    // Show loading while auth is being checked
    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Tambah Tagihan per Periode</h1>
                    <p className="text-sm text-neutral-500">Buat tagihan untuk semua pelanggan</p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/admin/dashboard" />

                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Pilih Periode
                        </label>
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Informasi</h3>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Tagihan akan dibuat untuk semua pelanggan aktif</li>
                            <li>• Pelanggan yang sudah memiliki tagihan di periode ini akan dilewati</li>
                            <li>• Pemakaian akan dihitung dari selisih meter bulan sebelumnya</li>
                        </ul>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-xl ${result.success
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-red-50 border border-red-200 text-red-700'
                            }`}>
                            {result.message}
                        </div>
                    )}

                    <Button
                        onClick={handleCreateBills}
                        loading={submitting}
                        className="w-full"
                    >
                        📄 Buat Tagihan untuk {period ? formatPeriod(period) : '...'}
                    </Button>
                </div>
            </main>
        </div>
    );
}

// Helper to format period "2026-01" to "Januari 2026"
function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}
