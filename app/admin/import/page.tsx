'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import AdminPageNavigation, { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import LoadingState from '@/components/state/LoadingState';
import PasswordConfirm from '@/components/ui/PasswordConfirm';
import {
    FileSpreadsheet,
    UploadCloud,
    Download,
    AlertCircle,
    CheckCircle2,
    Calendar,
    X,
    Loader2,
    Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/layout/PageHeader';
import { useImportJob } from '@/context/ImportJobContext';

export default function ImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const job = useImportJob();
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password confirmation modal state
    const [showImportConfirm, setShowImportConfirm] = useState(false);

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
        XLSX.writeFile(workbook, `Log-Error-Import-Tagihan-${selectedPeriod}.xlsx`);
    };

    const formatPeriod = (period: string) => {
        const [year, month] = period.split('-');
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];
        return `${months[parseInt(month) - 1] ?? month} ${year}`;
    };

    const importLoading = (
        <AppLayout>
            <PageHeader
                title="Import Tagihan"
                subtitle="Import tagihan bulanan dari Excel"
                actions={<DashboardNavigationButton />}
            />
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-4">
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
            <PageHeader
                title="Import Tagihan"
                subtitle="Sinkronisasi tagihan bulanan dari file Excel"
                actions={<DashboardNavigationButton />}
            />

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5">
                <AdminPageNavigation backHref="/admin/dashboard" />

                {/* Main Minimalist Import Card */}
                <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                    {/* Period Selector Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                Periode Tagihan
                            </label>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {formatPeriod(selectedPeriod)}
                            </span>
                        </div>
                        <input
                            type="month"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            disabled={isRunning}
                            className="w-full px-4 py-3 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-2xl border border-neutral-200/90 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-neutral-800 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base outline-none"
                        />
                    </div>

                    {/* File Dropzone Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                File Spreadsheet Excel
                            </label>
                            {selectedFile && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    disabled={isRunning}
                                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                                >
                                    Ganti File
                                </button>
                            )}
                        </div>

                        {!selectedFile ? (
                            <div
                                onDragOver={!isRunning ? handleDragOver : undefined}
                                onDragLeave={!isRunning ? handleDragLeave : undefined}
                                onDrop={!isRunning ? handleDrop : undefined}
                                onClick={() => !isRunning && fileInputRef.current?.click()}
                                className={`group relative border-2 border-dashed rounded-2xl p-7 sm:p-9 text-center transition-all cursor-pointer ${
                                    isDragging
                                        ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                                        : 'border-neutral-200/90 bg-neutral-50/40 hover:border-blue-400 hover:bg-blue-50/20'
                                } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={isRunning}
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-13 h-13 rounded-2xl bg-white shadow-sm border border-neutral-200/60 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:border-blue-300 transition-all">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm sm:text-base font-bold text-neutral-800">
                                            {isDragging ? 'Lepaskan file di sini' : 'Pilih atau Tarik File Excel'}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Mendukung format <span className="font-semibold text-neutral-700">.xlsx</span> atau <span className="font-semibold text-neutral-700">.xls</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-neutral-800 truncate">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-emerald-700 mt-0.5">
                                            {(selectedFile.size / 1024).toFixed(1)} KB • Siap diimpor
                                        </p>
                                    </div>
                                </div>
                                {!isRunning && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer"
                                        title="Hapus file"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Inline Progress (Clean & Modern) */}
                    {isRunning && (
                        <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="font-bold text-blue-950 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                    Memproses Import Data ({job.percent}%)
                                </span>
                                {job.totalChunks > 0 && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                                        Batch {job.currentChunk} / {job.totalChunks}
                                    </span>
                                )}
                            </div>
                            <div className="w-full bg-blue-100/80 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${job.percent}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-blue-700">
                                <span className="truncate max-w-[280px]">{job.message}</span>
                                {job.total > 0 && (
                                    <span className="shrink-0">{job.current} dari {job.total} baris</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-700 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={handleImportClick}
                        disabled={isRunning || !selectedFile}
                        className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isRunning || !selectedFile
                                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200/80 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-md shadow-blue-500/20'
                        }`}
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sedang Mengimpor Data...</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-4 h-4" />
                                <span>Import Tagihan {formatPeriod(selectedPeriod)}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Validation Errors Section (If validation fails) */}
                {job.errors && job.errors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm sm:text-base font-bold text-rose-950">
                                        Import Dibatalkan (Database Aman)
                                    </h4>
                                    <p className="text-xs text-rose-700 mt-0.5">
                                        Ditemukan <strong>{job.errors.length}</strong> baris data tidak sesuai verifikasi 3 lapis. Tidak ada data yang tersimpan.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadErrorExcel}
                                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Log Error (.xlsx)
                            </button>
                        </div>

                        {/* Error Table */}
                        <div className="overflow-hidden border border-rose-200 rounded-2xl bg-white shadow-sm">
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-rose-100/70 text-rose-900 sticky top-0 font-semibold border-b border-rose-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Baris</th>
                                            <th className="py-2.5 px-3">No.</th>
                                            <th className="py-2.5 px-3">Nama di Excel</th>
                                            <th className="py-2.5 px-3">Jenis Masalah</th>
                                            <th className="py-2.5 px-3">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-100">
                                        {job.errors.map((err, idx) => (
                                            <tr key={idx} className="hover:bg-rose-50/50">
                                                <td className="py-2 px-3 font-semibold text-neutral-700 whitespace-nowrap">
                                                    {err.excelRow ? `Baris ${err.excelRow}` : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
                                                    {err.customerNumber || '-'}
                                                </td>
                                                <td className="py-2 px-3 font-medium text-neutral-800 whitespace-nowrap">
                                                    {err.name}
                                                </td>
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    <span className="inline-block px-2 py-0.5 rounded-md font-medium text-[10px] bg-rose-100 text-rose-700">
                                                        {err.issueType.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-rose-700 leading-relaxed">
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

                {/* Complete Result Card */}
                {job.status === 'completed' && (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-bold text-emerald-950">
                                    Import Tagihan Berhasil!
                                </h4>
                                <p className="text-xs text-emerald-700 mt-0.5">{job.message}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                            <div className="bg-white/90 rounded-2xl p-3 border border-emerald-100/90 shadow-sm">
                                <p className="text-xl font-bold text-neutral-800">{job.total}</p>
                                <p className="text-[11px] text-neutral-500 font-medium">Total Baris</p>
                            </div>
                            <div className="bg-white/90 rounded-2xl p-3 border border-emerald-100/90 shadow-sm">
                                <p className="text-xl font-bold text-blue-600">{job.totalChunks}</p>
                                <p className="text-[11px] text-neutral-500 font-medium">Batch</p>
                            </div>
                            <div className="bg-white/90 rounded-2xl p-3 border border-emerald-100/90 shadow-sm">
                                <p className="text-xl font-bold text-emerald-600">100%</p>
                                <p className="text-[11px] text-neutral-500 font-medium">Tersimpan</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
                            >
                                Lihat Daftar Pelanggan
                            </button>
                            <button
                                type="button"
                                onClick={job.dismissJob}
                                className="py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-700 text-xs sm:text-sm font-semibold rounded-2xl border border-neutral-200 transition-all cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}

                {/* Minimalist Instructions Accordion */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 text-xs text-neutral-600 space-y-2">
                    <button
                        type="button"
                        onClick={() => setShowInfo(!showInfo)}
                        className="w-full flex items-center justify-between font-bold text-neutral-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-blue-500" />
                            Format Kolom Excel yang Didukung
                        </span>
                        <span className="text-neutral-400 font-semibold">{showInfo ? 'Sembunyikan' : 'Lihat'}</span>
                    </button>
                    {showInfo && (
                        <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-neutral-500 text-[11px] leading-relaxed">
                            <p>
                                File Excel harus memiliki kolom: <strong className="text-neutral-700">NO</strong>, <strong className="text-neutral-700">NAMA</strong>, <strong className="text-neutral-700">AWAL</strong> (stand meter awal), <strong className="text-neutral-700">AKHIR</strong> (stand meter akhir), <strong className="text-neutral-700">JML</strong> (pemakaian), <strong className="text-neutral-700">K.I</strong>, <strong className="text-neutral-700">K.II</strong>, <strong className="text-neutral-700">BEBAN</strong>, dan <strong className="text-neutral-700">JUMLAH</strong>.
                            </p>
                            <p>
                                Pastikan stand meter awal sama dengan stand akhir bulan sebelumnya dan kalkulasi rumus volume pemakaian sesuai.
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Password Confirmation Modal */}
            <PasswordConfirm
                isOpen={showImportConfirm}
                onClose={() => setShowImportConfirm(false)}
                onConfirm={handleImportConfirmed}
                title="Konfirmasi Import"
                description="Masukkan password admin untuk memproses import tagihan."
                confirmText="Mulai Import"
                loading={isRunning}
            />
        </AppLayout>
    );
}
