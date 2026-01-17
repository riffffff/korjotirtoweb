'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { clearCustomerCaches } from '@/hooks/useCustomer';
import { customerService } from '@/services/customerService';
import AppLayout from '@/components/layout/AppLayout';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

interface ImportProgress {
    type: 'status' | 'progress' | 'complete' | 'error';
    message?: string;
    current?: number;
    total?: number;
    currentName?: string;
    added?: number;
    skipped?: number;
    failed?: number;
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setError(null);
            } else {
                setError('File harus berformat Excel (.xlsx atau .xls)');
            }
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setError(null);
            } else {
                setError('File harus berformat Excel (.xlsx atau .xls)');
            }
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setError('Pilih file Excel terlebih dahulu');
            return;
        }
        if (!selectedPeriod) {
            setError('Pilih periode tagihan terlebih dahulu');
            return;
        }

        setImporting(true);
        setError(null);
        setProgress(null);
        setCompleted(false);
        setClearSuccess(false);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('role', localStorage.getItem('role') || '');
            formData.append('period', selectedPeriod);

            const response = await fetch('/api/import/upload', {
                method: 'POST',
                body: formData,
            });

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
                                clearCustomerCaches();
                                setCompleted(true);
                                setSelectedFile(null);
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
            console.error('Import failed:', err);
            setError('Gagal import data. Cek console untuk detail.');
        } finally {
            setImporting(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('PERINGATAN!\n\nSemua data pelanggan, tagihan, dan pembayaran akan DIHAPUS PERMANEN.\n\nLanjutkan?')) {
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
                clearCustomerCaches();
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

    const formatPeriod = (period: string) => {
        const [year, month] = period.split('-');
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    const isProcessing = importing || clearing;

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) {
        router.push('/');
        return null;
    }

    return (
        <AppLayout>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Import Tagihan</h1>
                    <p className="text-sm text-neutral-500">Import tagihan bulanan dari Excel</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
                <BackButton href="/" className="md:hidden" />

                {/* Period Selector */}
                <div className="bg-white rounded-xl p-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Periode Tagihan
                    </label>
                    <input
                        type="month"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                        Tagihan akan dibuat untuk periode: <strong>{formatPeriod(selectedPeriod)}</strong>
                    </p>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={!isProcessing ? handleDragOver : undefined}
                    onDragLeave={!isProcessing ? handleDragLeave : undefined}
                    onDrop={!isProcessing ? handleDrop : undefined}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isProcessing
                            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60'
                            : isDragging
                                ? 'border-blue-500 bg-blue-50 cursor-pointer'
                                : selectedFile
                                    ? 'border-green-400 bg-green-50 cursor-pointer'
                                    : 'border-neutral-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isProcessing}
                    />

                    {selectedFile ? (
                        <div className="space-y-2">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-green-700">{selectedFile.name}</p>
                            <p className="text-sm text-green-600">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                            {!isProcessing && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                    className="text-sm text-red-500 hover:text-red-600"
                                >
                                    Hapus file
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="font-semibold text-neutral-700">
                                {isDragging ? 'Drop file di sini' : 'Drag & drop file Excel'}
                            </p>
                            <p className="text-sm text-neutral-500">atau klik untuk pilih file</p>
                        </div>
                    )}
                </div>

                {/* Progress */}
                {importing && progress && (
                    <div className="bg-white rounded-xl p-4 space-y-3">
                        <div className="text-center">
                            {progress.type === 'progress' ? (
                                <>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {progress.current}/{progress.total}
                                    </p>
                                    <p className="text-sm text-neutral-500">pelanggan</p>
                                    <p className="text-sm text-neutral-600 mt-2 truncate">
                                        {progress.currentName}
                                    </p>
                                </>
                            ) : (
                                <p className="text-neutral-600">{progress.message}</p>
                            )}
                        </div>
                        {progress.current !== undefined && progress.total !== undefined && (
                            <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        onClick={handleImport}
                        loading={importing}
                        variant="primary"
                        className="w-full"
                        disabled={isProcessing || !selectedFile}
                    >
                        {importing ? 'Mengimport...' : 'Import Data'}
                    </Button>

                    <Button
                        onClick={handleClearAll}
                        loading={clearing}
                        variant="danger"
                        className="w-full"
                        disabled={isProcessing}
                    >
                        {clearing ? 'Menghapus...' : 'Hapus Semua Data'}
                    </Button>
                </div>

                {/* Clear Success */}
                {clearSuccess && (
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-green-700 font-medium">Data berhasil dihapus!</p>
                        <p className="text-sm text-green-600 mt-1">Silakan import data baru.</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-red-600 font-medium">Error</p>
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                    </div>
                )}

                {/* Complete Result */}
                {completed && progress?.type === 'complete' && (
                    <div className="bg-green-50 rounded-xl p-4 space-y-3">
                        <p className="text-green-700 font-semibold">Import Selesai!</p>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-neutral-800">{progress.total}</p>
                                <p className="text-xs text-neutral-500">Total</p>
                            </div>
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-2xl font-bold text-green-600">{progress.added}</p>
                                <p className="text-xs text-neutral-500">Berhasil</p>
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
        </AppLayout>
    );
}
