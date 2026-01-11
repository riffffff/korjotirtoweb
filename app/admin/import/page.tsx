'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

interface ImportResult {
    total: number;
    added: number;
    skipped: number;
    skippedNames: string[];
}

export default function ImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [importing, setImporting] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearSuccess, setClearSuccess] = useState(false);

    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setResult(null);

        try {
            const response = await customerService.importFromExcel();
            if (response.success) {
                setResult(response.data);
            } else {
                setError(response.error || 'Gagal import data');
            }
        } catch (err) {
            console.error('Import failed:', err);
            setError('Gagal import data. Cek console untuk detail.');
        } finally {
            setImporting(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('⚠️ PERINGATAN!\n\nSemua data pelanggan, tagihan, dan pembayaran akan DIHAPUS PERMANEN.\n\nLanjutkan?')) {
            return;
        }

        setClearing(true);
        setError(null);
        setClearSuccess(false);

        try {
            const response = await customerService.clearAll();
            if (response.success) {
                setClearSuccess(true);
                setResult(null);
            } else {
                setError(response.error || 'Gagal menghapus data');
            }
        } catch (err) {
            console.error('Clear failed:', err);
            setError('Gagal menghapus data. Cek console untuk detail.');
        } finally {
            setClearing(false);
        }
    };

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;

    if (!isAdmin) {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Import Data</h1>
                    <p className="text-sm text-neutral-500">Import pelanggan dari Excel</p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {/* Import Info Card */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xl">📊</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-neutral-800">Data Pengguna Air</h2>
                            <p className="text-sm text-neutral-500 mt-1">
                                Import data dari file <code className="bg-neutral-100 px-1 rounded">docs/data pengguna air.xlsx</code>
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                        <p className="font-medium">ℹ️ Informasi:</p>
                        <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
                            <li>Pelanggan yang sudah ada (nama sama) akan dilewati</li>
                            <li>Data yang diimport: No Pelanggan, Nama, No HP</li>
                            <li>Menggunakan database transaction</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Button
                            onClick={handleImport}
                            loading={importing}
                            variant="primary"
                            className="w-full"
                        >
                            {importing ? 'Mengimport...' : '📥 Import Data'}
                        </Button>

                        <Button
                            onClick={handleClearAll}
                            loading={clearing}
                            variant="danger"
                            className="w-full"
                        >
                            {clearing ? 'Menghapus...' : '🗑️ Hapus Semua Data'}
                        </Button>
                    </div>
                </div>

                {/* Clear Success */}
                {clearSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-green-700 font-medium">✅ Data berhasil dihapus!</p>
                        <p className="text-sm text-green-600 mt-1">Semua data pelanggan telah dihapus. Silakan import data baru.</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 font-medium">❌ Error</p>
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                    </div>
                )}

                {/* Result Display */}
                {result && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <p className="text-green-700 font-semibold">✅ Import Berhasil!</p>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-neutral-800">{result.total}</p>
                                <p className="text-xs text-neutral-500">Total Data</p>
                            </div>
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-green-600">{result.added}</p>
                                <p className="text-xs text-neutral-500">Ditambahkan</p>
                            </div>
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-orange-500">{result.skipped}</p>
                                <p className="text-xs text-neutral-500">Dilewati</p>
                            </div>
                        </div>

                        {result.skippedNames.length > 0 && (
                            <div className="text-sm">
                                <p className="text-neutral-600 font-medium">Pelanggan yang dilewati:</p>
                                <p className="text-neutral-500 mt-1">
                                    {result.skippedNames.join(', ')}
                                    {result.skipped > result.skippedNames.length && ` dan ${result.skipped - result.skippedNames.length} lainnya`}
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={() => router.push('/')}
                            variant="secondary"
                            className="w-full"
                        >
                            Lihat Daftar Pelanggan
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
