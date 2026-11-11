'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { clearCustomerCaches } from '@/hooks/useCustomer';
import { customerClient as customerService } from '@/services/client/customer.client';
import AppLayout from '@/components/layout/AppLayout';
import AdminPageNavigation, { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';
import PasswordConfirm from '@/components/ui/PasswordConfirm';
import { FileSpreadsheet, Upload, Download, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/layout/PageHeader';
import { useImportJob } from '@/context/ImportJobContext';

interface ImportErrorItem {
    excelRow: number;
    customerNumber: number;
    name: string;
    issueType:
        | 'NAMA_TIDAK_COCOK'
        | 'METER_AWAL_TIDAK_COCOK'
        | 'METER_AKHIR_INVALID'
        | 'DUPLIKASI_DATA'
        | 'KALKULASI_PEMAKAIAN_INVALID'
        | 'KALKULASI_TARIF_INVALID';
    excelValue: string;
    systemValue: string;
    message: string;
}

interface ImportProgress {
    type: 'status' | 'progress' | 'complete' | 'error';
    message?: string;
    percent?: number;
    current?: number;
    total?: number;
    currentName?: string;
    added?: number;
    newCustomers?: number;
    existingUpdated?: number;
    skipped?: number;
    failed?: number;
    errors?: ImportErrorItem[];
}

export default function ImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const job = useImportJob();
    const [clearing, setClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clearSuccess, setClearSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password confirmation states
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeletePeriodConfirm, setShowDeletePeriodConfirm] = useState(false);

    // Delete by period states
    const [deletingPeriod, setDeletingPeriod] = useState(false);
    const [deletePeriodValue, setDeletePeriodValue] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [deletePeriodSuccess, setDeletePeriodSuccess] = useState<string | null>(null);

    const isRunning = job.status === 'validating' || job.status === 'importing';

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

    const handleImportClick = () => {
        if (!selectedFile) {
            setError('Pilih file Excel terlebih dahulu');
            return;
        }
        if (!selectedPeriod) {
            setError('Pilih periode tagihan terlebih dahulu');
            return;
        }
        setShowImportConfirm(true);
    };

    const handleImportConfirmed = async () => {
        setShowImportConfirm(false);
        setError(null);
        setClearSuccess(false);

        if (!selectedFile) return;
        const fileToUpload = selectedFile;
        setSelectedFile(null);
        await job.startImportJob(fileToUpload, selectedPeriod);
    };

    const handleDownloadErrorExcel = () => {
        const errorsToExport = job.errors;
        if (!errorsToExport || errorsToExport.length === 0) return;
        const errorRows = errorsToExport.map((err) => ({
            'Baris Excel': err.excelRow ? `Baris ${err.excelRow}` : '-',
            'No. Pelanggan': err.customerNumber || '-',
            'Nama di Excel': err.name,
            'Jenis Masalah': err.issueType.replace(/_/g, ' '),
            'Data di Excel': err.excelValue,
            'Data di Database': err.systemValue,
            'Keterangan Detail': err.message,
        }));
        const worksheet = XLSX.utils.json_to_sheet(errorRows);
        worksheet['!cols'] = [
            { wch: 14 },
            { wch: 15 },
            { wch: 25 },
            { wch: 28 },
            { wch: 22 },
            { wch: 30 },
            { wch: 60 },
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Validasi');
        XLSX.writeFile(workbook, `Log-Error-Import-Tagihan-${job.period || selectedPeriod}.xlsx`);
    };

    const handleClearClick = () => {
        setShowClearConfirm(true);
    };

    const handleClearConfirmed = async () => {
        setShowClearConfirm(false);
        setClearing(true);
        setError(null);
        setClearSuccess(false);
        job.dismissJob();

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

    const handleDeletePeriodClick = () => {
        setShowDeletePeriodConfirm(true);
    };

    const handleDeletePeriodConfirmed = async () => {
        setShowDeletePeriodConfirm(false);
        setDeletingPeriod(true);
        setError(null);
        setDeletePeriodSuccess(null);

        try {
            const response = await customerService.deleteBillsByPeriod(deletePeriodValue);
            if (response.success) {
                clearCustomerCaches();
                setDeletePeriodSuccess(`Berhasil menghapus ${response.count} tagihan periode ${formatPeriod(deletePeriodValue)}`);
            } else {
                setError(response.error || 'Gagal menghapus tagihan periode');
            }
        } catch (err) {
            console.error('Delete period failed:', err);
            setError('Gagal menghapus tagihan. Cek console untuk detail.');
        } finally {
            setDeletingPeriod(false);
        }
    };

    const isProcessing = isRunning || clearing || deletingPeriod;

    const importLoading = (
        <AppLayout>
            <PageHeader title="Import Tagihan" subtitle="Import tagihan bulanan dari Excel" actions={<DashboardNavigationButton />} />
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                <LoadingState variant="skeleton-import" />
            </main>
        </AppLayout>
    );

    if (authLoading) return importLoading;
    if (!isAdmin) {
        router.push('/');
        return importLoading;
    }

    return (
        <AppLayout>
            <PageHeader title="Import Tagihan" subtitle="Import tagihan bulanan dari Excel" actions={<DashboardNavigationButton />} />

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                <AdminPageNavigation backHref="/admin/dashboard" />

                {/* Period Selector */}
                <section className="bg-white rounded-xl border border-neutral-200 p-4">
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
                </section>

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
                                <FileSpreadsheet className="w-8 h-8 text-green-600" />
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
                                <Upload className="w-8 h-8 text-neutral-500" />
                            </div>
                            <p className="font-semibold text-neutral-700">
                                {isDragging ? 'Drop file di sini' : 'Drag & drop file Excel'}
                            </p>
                            <p className="text-sm text-neutral-500">atau klik untuk pilih file</p>
                        </div>
                    )}
                </div>

                {/* Active Progress Card (Non-blocking: user can browse other pages freely!) */}
                {isRunning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0">
                                    <FileSpreadsheet className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900">
                                        Proses Import Sedang Berjalan ({job.percent}%)
                                    </h4>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        {job.message}
                                    </p>
                                </div>
                            </div>
                            {job.totalChunks > 0 && (
                                <span className="text-xs font-bold px-2.5 py-1 bg-blue-200/80 text-blue-800 rounded-lg shrink-0">
                                    Batch {job.currentChunk} / {job.totalChunks}
                                </span>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-blue-200/60 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${job.percent}%` }}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-blue-600">
                            <span>
                                {job.total > 0 ? `${job.current} dari ${job.total} baris pelanggan` : 'Memverifikasi data Excel...'}
                            </span>
                            <span className="text-[11px] text-blue-700 italic font-medium">
                                💡 Anda bebas membuka halaman lain (Dashboard, Pelanggan, dll). Progress tetap berjalan.
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        onClick={handleImportClick}
                        loading={isRunning}
                        variant="primary"
                        className="w-full"
                        disabled={isRunning || clearing || deletingPeriod || !selectedFile}
                    >
                        {isRunning ? 'Sedang Memproses...' : 'Import Data'}
                    </Button>
                </div>

                {/* Delete Period Success */}
                {deletePeriodSuccess && (
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-green-700 font-medium">{deletePeriodSuccess}</p>
                    </div>
                )}

                {/* Clear Success */}
                {clearSuccess && (
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-green-700 font-medium">Data berhasil dihapus!</p>
                        <p className="text-sm text-green-600 mt-1">Silakan import data baru.</p>
                    </div>
                )}

                {/* Error Display & Download Log Error */}
                {job.errors && job.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600 mt-0.5 shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-red-800">
                                        Import Dibatalkan (Database Tetap Aman)
                                    </h4>
                                    <p className="text-sm text-red-600 mt-0.5">
                                        Ditemukan <strong>{job.errors.length}</strong> data tidak sesuai verifikasi 3 lapis. Transaksi dibatalkan secara penuh sehingga tidak ada data yang masuk atau berubah di database.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadErrorExcel}
                                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                Download Log Error (.xlsx)
                            </button>
                        </div>

                        {/* Scrollable Error Table */}
                        <div className="overflow-hidden border border-red-200 rounded-lg bg-white">
                            <div className="max-h-72 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-red-100/70 text-red-900 sticky top-0 font-semibold border-b border-red-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Baris</th>
                                            <th className="py-2.5 px-3">No.</th>
                                            <th className="py-2.5 px-3">Nama di Excel</th>
                                            <th className="py-2.5 px-3">Jenis Masalah</th>
                                            <th className="py-2.5 px-3">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-100">
                                        {job.errors.map((err, idx) => (
                                            <tr key={idx} className="hover:bg-red-50/50">
                                                <td className="py-2.5 px-3 font-semibold text-neutral-700 whitespace-nowrap">
                                                    {err.excelRow ? `Baris ${err.excelRow}` : '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                                                    {err.customerNumber || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-neutral-800 whitespace-nowrap">
                                                    {err.name}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="inline-block px-2 py-0.5 rounded font-medium text-[11px] bg-red-100 text-red-700">
                                                        {err.issueType.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-red-700 leading-relaxed">
                                                    {err.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {(error || (job.status === 'error' && (!job.errors || job.errors.length === 0))) && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <p className="text-red-600 font-medium">Error</p>
                        <p className="text-sm text-red-500 mt-1">{error || job.message}</p>
                    </div>
                )}

                {/* Complete Result */}
                {job.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-green-800 font-bold text-base">Import Tagihan Selesai!</p>
                                <p className="text-sm text-green-700">{job.message}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                                <p className="text-2xl font-bold text-neutral-800">{job.total}</p>
                                <p className="text-xs text-neutral-500">Total Baris</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                                <p className="text-2xl font-bold text-blue-600">{job.totalChunks}</p>
                                <p className="text-xs text-neutral-500">Total Batch</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm col-span-2 sm:col-span-1">
                                <p className="text-2xl font-bold text-green-600">100%</p>
                                <p className="text-xs text-neutral-500">Berhasil Disimpan</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => router.push('/')}
                                variant="secondary"
                                className="w-full"
                            >
                                Lihat Daftar Pelanggan
                            </Button>
                            <Button
                                onClick={job.dismissJob}
                                variant="secondary"
                                className="shrink-0"
                            >
                                Tutup Notifikasi
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* Password Confirmation Modals */}
            <PasswordConfirm
                isOpen={showImportConfirm}
                onClose={() => setShowImportConfirm(false)}
                onConfirm={handleImportConfirmed}
                title="Konfirmasi Import"
                description="Masukkan password admin untuk mengimport data."
                confirmText="Import"
                loading={isRunning}
            />

            <PasswordConfirm
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearConfirmed}
                title="Konfirmasi Hapus Semua Data"
                description="PERINGATAN! Semua data pelanggan, tagihan, dan pembayaran akan DIHAPUS PERMANEN. Masukkan password admin untuk melanjutkan."
                confirmText="Hapus Semua"
                loading={clearing}
            />

            <PasswordConfirm
                isOpen={showDeletePeriodConfirm}
                onClose={() => setShowDeletePeriodConfirm(false)}
                onConfirm={handleDeletePeriodConfirmed}
                title="Konfirmasi Hapus Tagihan Periode"
                description={`Tagihan periode ${formatPeriod(deletePeriodValue)} akan dihapus. Pelanggan tetap ada. Masukkan password admin untuk melanjutkan.`}
                confirmText="Hapus Periode"
                loading={deletingPeriod}
            />
        </AppLayout>
    );
}
