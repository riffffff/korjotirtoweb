'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

interface ImportProgress {
    type: 'status' | 'progress' | 'complete' | 'error';
    message?: string;
    current?: number;
    total?: number;
    processed?: number;
    failed?: number;
    percent?: number;
    currentName?: string;
    added?: number;
    skipped?: number;
}

export default function ImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [importing, setImporting] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearSuccess, setClearSuccess] = useState(false);
    const [completed, setCompleted] = useState(false);
    const abortController = useRef<AbortController | null>(null);

    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setProgress(null);
        setCompleted(false);
        setClearSuccess(false);

        abortController.current = new AbortController();

        try {
            const role = localStorage.getItem('role');
            const response = await fetch('/api/import/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
                signal: abortController.current.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to start import');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6)) as ImportProgress;
                            setProgress(data);

                            if (data.type === 'complete') {
                                setCompleted(true);
                            } else if (data.type === 'error') {
                                setError(data.message || 'Unknown error');
                            }
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Import failed:', err);
                setError('Gagal import data. Cek console untuk detail.');
            }
        } finally {
            setImporting(false);
            abortController.current = null;
        }
    };

    const handleClearAll = async () => {
        if (!confirm('⚠️ PERINGATAN!\n\nSemua data pelanggan, tagihan, dan pembayaran akan DIHAPUS PERMANEN.\n\nLanjutkan?')) {
            return;
        }

        setClearing(true);
        setError(null);
        setClearSuccess(false);
        setProgress(null);
        setCompleted(false);

        try {
            const response = await customerService.clearAll();
            if (response.success) {
                setClearSuccess(true);
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
                                Import dari <code className="bg-neutral-100 px-1 rounded">data pengguna air.xlsx</code>
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                        <p className="font-medium">ℹ️ Informasi:</p>
                        <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
                            <li>Import pelanggan + tagihan Desember 2025</li>
                            <li>Pelanggan yang sudah ada akan dilewati</li>
                            <li>Progress ditampilkan secara real-time</li>
                        </ul>
                    </div>

                    {/* Progress Bar */}
                    {importing && progress && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-600">
                                    {progress.type === 'progress'
                                        ? `Importing: ${progress.currentName}`
                                        : progress.message}
                                </span>
                                {progress.percent !== undefined && (
                                    <span className="font-medium text-blue-600">{progress.percent}%</span>
                                )}
                            </div>
                            {progress.total !== undefined && progress.current !== undefined && (
                                <>
                                    <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${progress.percent || 0}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-500">
                                        <span>{progress.current} / {progress.total}</span>
                                        <span>
                                            ✅ {progress.processed || 0} |
                                            ❌ {progress.failed || 0}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Button
                            onClick={handleImport}
                            loading={importing}
                            variant="primary"
                            className="w-full"
                            disabled={importing || clearing}
                        >
                            {importing ? '⏳ Mengimport...' : '📥 Import Data'}
                        </Button>

                        <Button
                            onClick={handleClearAll}
                            loading={clearing}
                            variant="danger"
                            className="w-full"
                            disabled={importing || clearing}
                        >
                            {clearing ? 'Menghapus...' : '🗑️ Hapus Semua Data'}
                        </Button>
                    </div>
                </div>

                {/* Clear Success */}
                {clearSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-green-700 font-medium">✅ Data berhasil dihapus!</p>
                        <p className="text-sm text-green-600 mt-1">Silakan import data baru.</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 font-medium">❌ Error</p>
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                    </div>
                )}

                {/* Complete Result */}
                {completed && progress?.type === 'complete' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <p className="text-green-700 font-semibold">✅ Import Selesai!</p>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-neutral-800">{progress.total}</p>
                                <p className="text-xs text-neutral-500">Total Data</p>
                            </div>
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-green-600">{progress.added}</p>
                                <p className="text-xs text-neutral-500">Ditambahkan</p>
                            </div>
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-orange-500">{progress.skipped}</p>
                                <p className="text-xs text-neutral-500">Dilewati</p>
                            </div>
                        </div>

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
