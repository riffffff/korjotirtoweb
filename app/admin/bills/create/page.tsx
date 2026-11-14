'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';
import { billClient } from '@/services/client/bill.client';
import { formatPeriod, getCurrentPeriod } from '@/lib/formatDate';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';

export default function CreateBillsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [period, setPeriod] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        setPeriod(getCurrentPeriod());
    }, []);

    const handleCreateBills = async () => {
        if (!period) {
            setValidationError('Pilih periode terlebih dahulu');
            return;
        }
        setShowConfirm(true);
    };

    const confirmCreateBills = async () => {
        setShowConfirm(false);
        setSubmitting(true);
        setResult(null);

        try {
            const data = await billClient.createBulkByPeriod(period);
            if (data.success) {
                setResult({
                    success: true,
                    message: `Berhasil membuat ${data.count} tagihan untuk periode ${formatPeriod(period)}`
                });
            }
        } catch (error) {
            console.error('Failed to create bills:', error);
            setResult({ success: false, message: 'Gagal membuat tagihan' });
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [authLoading, isAdmin, router]);

    const createBillsLoading = (
        <AppLayout>
            <PageHeader title="Tambah Tagihan per Periode" subtitle="Buat tagihan untuk semua pelanggan" actions={<DashboardNavigationButton />} />
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                <LoadingState variant="skeleton-form" />
            </main>
        </AppLayout>
    );

    if (authLoading || !isAdmin) return createBillsLoading;

    return (
        <AppLayout>
            <PageHeader title="Tambah Tagihan per Periode" subtitle="Buat tagihan untuk semua pelanggan" actions={<DashboardNavigationButton />} />

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                <section className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
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
                        <h3 className="font-semibold text-blue-800 mb-2">Informasi</h3>
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
                        Buat Tagihan untuk {period ? formatPeriod(period) : '...'}
                    </Button>
                </section>
            </main>
            <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Konfirmasi Pembuatan Tagihan">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                        Buat tagihan untuk periode <strong>{period ? formatPeriod(period) : '-'}</strong> bagi semua pelanggan yang memiliki data meter sebelumnya?
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">Batal</Button>
                        <Button type="button" onClick={() => void confirmCreateBills()} loading={submitting} className="flex-1">Buat Tagihan</Button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={Boolean(validationError)} onClose={() => setValidationError(null)} title="Periode Belum Dipilih">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">{validationError}</p>
                    <Button type="button" onClick={() => setValidationError(null)} className="w-full">Mengerti</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
