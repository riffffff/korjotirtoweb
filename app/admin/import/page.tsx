'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import LoadingState from '@/components/state/LoadingState';
import PasswordConfirm from '@/components/ui/PasswordConfirm';
import FileUpload from '@/components/ui/FileUpload';
import {
    FileSpreadsheet,
    Download,
    AlertCircle,
    CheckCircle2,
    Calendar,
    X,
    Loader2,
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
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Password confirmation modal state
    const [showImportConfirm, setShowImportConfirm] = useState(false);

    const isRunning = job.status === 'validating' || job.status === 'importing';

    const handleImportClick = () => {
        if (!selectedFile) {
            setError('Pilih file Excel terlebih dahulu');
            return;
        }
        if (!selectedPeriod) {
            setError('Pilih periode terlebih dahulu');
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
        XLSX.writeFile(workbook, `Log-Error-Import-${selectedPeriod}.xlsx`);
    };

    const importLoading = (
        <AppLayout>
            <PageHeader title="Import Tagihan" actions={<DashboardNavigationButton />} />
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
            <PageHeader title="Import Tagihan" actions={<DashboardNavigationButton />} />

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                {/* Main Minimalist Card */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 md:p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Period Selector (4 columns on desktop) */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                Periode Tagihan
                            </label>
                            <input
                                type="month"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                disabled={isRunning}
                                className="w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-neutral-800 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm outline-none"
                            />
                        </div>

                        {/* File Upload Dropzone (8 columns on desktop) */}
                        <FileUpload
                            id="import-excel-file"
                            label="File Excel"
                            labelIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-neutral-500" />}
                            file={selectedFile}
                            onFileSelect={setSelectedFile}
                            accept=".xlsx,.xls"
                            placeholder="Pilih file Excel (.xlsx)"
                            disabled={isRunning}
                            className="md:col-span-8"
                            onError={setError}
                        />
                    </div>

                    {/* Progress Bar (when running) */}
                    {isRunning && (
                        <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3.5 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                                <span>Mengimpor...</span>
                                <span>{job.percent}%</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${job.percent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-2 text-rose-700 text-xs font-medium">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="text-rose-400 hover:text-rose-700 p-0.5 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleImportClick}
                            disabled={isRunning || !selectedFile}
                            className={`w-full sm:w-auto sm:min-w-[160px] py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isRunning || !selectedFile
                                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200/80 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-sm'
                            }`}
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Mengimpor...</span>
                                </>
                            ) : (
                                <span>Import Data</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Validation Errors Section */}
                {job.errors && job.errors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 md:p-5 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span className="text-xs sm:text-sm font-bold text-rose-900">
                                    {job.errors.length} data tidak cocok
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadErrorExcel}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Log (.xlsx)
                            </button>
                        </div>

                        {/* Error Table */}
                        <div className="overflow-hidden border border-rose-200 rounded-xl bg-white shadow-sm">
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-rose-50 text-rose-900 sticky top-0 font-semibold border-b border-rose-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Baris</th>
                                            <th className="py-2.5 px-3">No. Pelanggan</th>
                                            <th className="py-2.5 px-3">Nama di Excel</th>
                                            <th className="py-2.5 px-3">Jenis Masalah</th>
                                            <th className="py-2.5 px-3">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-100">
                                        {job.errors.map((err, idx) => (
                                            <tr key={idx} className="hover:bg-rose-50/50">
                                                <td className="py-2 px-3 font-medium text-neutral-600 whitespace-nowrap">
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
                                                <td className="py-2 px-3 text-rose-700">
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
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 md:p-5 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-950">Import Berhasil</p>
                                    <p className="text-xs text-emerald-700">{job.total} baris tersimpan</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={job.dismissJob}
                                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                Lihat Daftar Pelanggan
                            </button>
                            <button
                                type="button"
                                onClick={job.dismissJob}
                                className="py-2 px-4 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-200 transition-all cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
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
