'use client';
import React, { useEffect } from 'react';
import { useImportJob } from '@/context/ImportJobContext';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function FloatingImportProgress() {
    const {
        status,
        percent,
        dismissJob,
    } = useImportJob();

    // Auto-dismiss completed notification after 6 seconds
    useEffect(() => {
        if (status === 'completed') {
            const timer = setTimeout(() => {
                dismissJob();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [status, dismissJob]);

    if (status === 'idle') return null;

    const isRunning = status === 'validating' || status === 'importing';

    return (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-xs font-semibold select-none ${
                    isRunning
                        ? 'bg-blue-600 text-white border-blue-500 ring-4 ring-blue-500/20'
                        : status === 'completed'
                          ? 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-500/20'
                          : 'bg-rose-600 text-white border-rose-500 ring-4 ring-rose-500/20'
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
                          : 'Import Gagal'}
                </span>

                {!isRunning && (
                    <button
                        type="button"
                        onClick={dismissJob}
                        title="Tutup"
                        className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                )}
            </div>
        </div>
    );
}
