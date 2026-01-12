'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

interface ImportResult {
    total: number;
    newCustomers: number;
    existingCustomers: number;
    billsCreated: number;
    period: string;
}

export default function ImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [period, setPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
            setFile(selectedFile);
            setError(null);
            setResult(null);
        } else {
            setError('File harus berformat Excel (.xlsx atau .xls)');
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleImport = async () => {
        if (!file) {
            setError('Pilih file Excel terlebih dahulu');
            return;
        }

        setImporting(true);
        setError(null);
        setErrorDetail(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('role', localStorage.getItem('role') || '');
            formData.append('period', period);

            const response = await fetch('/api/import/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
                setFile(null);
            } else {
                setError(data.error || 'Gagal import');
                setErrorDetail(data.errorDetail || null);
            }
        } catch (err) {
            console.error('Import failed:', err);
            setError('Gagal import. Cek console untuk detail.');
        } finally {
            setImporting(false);
        }
    };

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;

    if (!isAdmin) {
        router.push('/');
        return null;
    }

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const [year, month] = period.split('-');
    const periodLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Import Tagihan</h1>
                    <p className="text-sm text-neutral-500">Upload file Excel untuk import data</p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {/* Period Selector */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Periode Tagihan
                    </label>
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-neutral-500 mt-2">
                        Tagihan akan dibuat untuk: <strong>{periodLabel}</strong>
                    </p>
                </div>

                {/* File Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        bg-white rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
                        transition-all duration-200
                        ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : file
                                ? 'border-green-500 bg-green-50'
                                : 'border-neutral-300 hover:border-blue-400 hover:bg-neutral-50'
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                    />

                    {file ? (
                        <div className="space-y-2">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">📄</span>
                            </div>
                            <p className="font-semibold text-green-700">{file.name}</p>
                            <p className="text-sm text-green-600">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="text-sm text-red-500 hover:text-red-700"
                            >
                                ✕ Hapus file
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">📥</span>
                            </div>
                            <p className="font-semibold text-neutral-700">
                                {isDragging ? 'Lepaskan file di sini' : 'Drop file Excel di sini'}
                            </p>
                            <p className="text-sm text-neutral-500">
                                atau klik untuk memilih file (.xlsx, .xls)
                            </p>
                        </div>
                    )}
                </div>

                {/* Import Info */}
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                    <p className="font-medium mb-2">ℹ️ Catatan Import:</p>
                    <ul className="space-y-1 list-disc list-inside text-blue-600">
                        <li>Pelanggan baru akan ditambahkan otomatis</li>
                        <li>Pelanggan lama akan ditambah tagihan baru</li>
                        <li>Jika ada error, SEMUA data dibatalkan (rollback)</li>
                        <li>Tagihan periode sama tidak bisa diimport 2x</li>
                    </ul>
                </div>

                {/* Import Button */}
                <Button
                    onClick={handleImport}
                    loading={importing}
                    variant="primary"
                    className="w-full"
                    disabled={!file || importing}
                >
                    {importing ? '⏳ Mengimport...' : `📥 Import Tagihan ${periodLabel}`}
                </Button>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 font-medium">❌ {error}</p>
                        {errorDetail && (
                            <p className="text-sm text-red-500 mt-2 p-2 bg-red-100 rounded">
                                {errorDetail}
                            </p>
                        )}
                    </div>
                )}

                {/* Success Result */}
                {result && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                        <p className="text-green-700 font-semibold text-lg">✅ Import Berhasil!</p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-600">{result.newCustomers}</p>
                                <p className="text-xs text-neutral-500">Pelanggan Baru</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-orange-500">{result.existingCustomers}</p>
                                <p className="text-xs text-neutral-500">Pelanggan Lama</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center col-span-2">
                                <p className="text-3xl font-bold text-green-600">{result.billsCreated}</p>
                                <p className="text-xs text-neutral-500">Tagihan {periodLabel}</p>
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
