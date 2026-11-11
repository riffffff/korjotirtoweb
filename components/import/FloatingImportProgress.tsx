'use client';
import React from 'react';
import { useImportJob } from '@/context/ImportJobContext';
import {
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    X,
    Download,
    ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function FloatingImportProgress() {
    const {
        status,
        fileName,
        period,
        current,
        total,
        currentChunk,
        totalChunks,
        currentName,
        percent,
        message,
        errors,
        isMinimized,
        toggleMinimize,
        dismissJob,
    } = useImportJob();

    if (status === 'idle') return null;

    const isRunning = status === 'validating' || status === 'importing';

    const handleDownloadErrorExcel = () => {
        if (!errors || errors.length === 0) return;
        const errorRows = errors.map((err) => ({
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
        XLSX.writeFile(workbook, `Log-Error-Import-Tagihan-${period || 'data'}.xlsx`);
    };

    // Compact Minimized Pill
    if (isMinimized) {
        return (
            <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                    type="button"
                    onClick={toggleMinimize}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-xs font-semibold transition-all cursor-pointer ${
                        isRunning
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 ring-4 ring-blue-500/20'
                            : status === 'completed'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-4 ring-emerald-500/20'
                              : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 ring-4 ring-rose-500/20'
                    }`}
                >
                    {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                    )}
                    <span>
                        {isRunning
                            ? `Mengimpor: ${percent}%`
                            : status === 'completed'
                              ? 'Import Selesai!'
                              : 'Import Dibatalkan'}
                    </span>
                    <ChevronUp className="w-3.5 h-3.5 opacity-80" />
                </button>
            </div>
        );
    }

    // Expanded Floating Card
    return (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full mx-4 sm:mx-0 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200 p-4 space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                                isRunning
                                    ? 'bg-blue-50 text-blue-600'
                                    : status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : 'bg-rose-50 text-rose-600'
                            }`}
                        >
                            {isRunning ? (
                                <FileSpreadsheet className="w-4 h-4 animate-pulse" />
                            ) : status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs font-bold text-neutral-800 truncate">
                                {isRunning
                                    ? 'Memproses Import Tagihan'
                                    : status === 'completed'
                                      ? 'Import Tagihan Berhasil'
                                      : 'Import Dibatalkan (Aman)'}
                            </h4>
                            <p className="text-[11px] text-neutral-500 truncate">
                                {period ? `Periode: ${period}` : fileName || 'File Excel'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={toggleMinimize}
                            title="Kecilkan widget"
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        {!isRunning && (
                            <button
                                type="button"
                                onClick={dismissJob}
                                title="Tutup"
                                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Content */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-neutral-600 truncate max-w-[220px]">
                            {currentName ? `Batch ${currentChunk}/${totalChunks}: ${currentName}` : message}
                        </span>
                        <span
                            className={`font-bold ml-2 shrink-0 ${
                                isRunning
                                    ? 'text-blue-600'
                                    : status === 'completed'
                                      ? 'text-emerald-600'
                                      : 'text-rose-600'
                            }`}
                        >
                            {percent}%
                        </span>
                    </div>

                    <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                                isRunning
                                    ? 'bg-blue-600'
                                    : status === 'completed'
                                      ? 'bg-emerald-600'
                                      : 'bg-rose-500'
                            }`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>

                    {total > 0 && (
                        <div className="flex justify-between items-center text-[11px] text-neutral-400">
                            <span>
                                {current} dari {total} baris pelanggan
                            </span>
                            {totalChunks > 0 && <span>{totalChunks} batch</span>}
                        </div>
                    )}
                </div>

                {/* Errors Section if any */}
                {errors && errors.length > 0 && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <p className="text-xs text-rose-700 font-medium leading-relaxed">
                            Ditemukan <strong>{errors.length}</strong> data tidak cocok. Transaksi dibatalkan.
                        </p>
                        <button
                            type="button"
                            onClick={handleDownloadErrorExcel}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download Log Error (.xlsx)
                        </button>
                    </div>
                )}

                {/* Footer Navigation Link */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100">
                    <span className="italic">
                        {isRunning ? 'Anda bebas membuka halaman lain' : 'Proses telah selesai'}
                    </span>
                    <Link
                        href="/admin/import"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                        Ke Halaman Import
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
