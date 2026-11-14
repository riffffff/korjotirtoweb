'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ImportErrorItem } from '@/services/server/import.service';
import type { ParsedExcelRow } from '@/lib/excel-parser';
import { clearCustomerCaches } from '@/hooks/useCustomer';

export type ImportJobStatus = 'idle' | 'validating' | 'importing' | 'completed' | 'error';

interface ImportJobContextValue {
    status: ImportJobStatus;
    fileName: string | null;
    period: string | null;
    current: number;
    total: number;
    currentChunk: number;
    totalChunks: number;
    currentName: string;
    percent: number;
    message: string;
    errors: ImportErrorItem[] | null;
    isMinimized: boolean;
    startImportJob: (file: File, period: string) => Promise<boolean>;
    toggleMinimize: () => void;
    dismissJob: () => void;
}

const ImportJobContext = createContext<ImportJobContextValue | null>(null);

const CHUNK_SIZE = 30;

export function ImportJobProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<ImportJobStatus>('idle');
    const [fileName, setFileName] = useState<string | null>(null);
    const [period, setPeriod] = useState<string | null>(null);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(0);
    const [currentChunk, setCurrentChunk] = useState(0);
    const [totalChunks, setTotalChunks] = useState(0);
    const [currentName, setCurrentName] = useState('');
    const [percent, setPercent] = useState(0);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<ImportErrorItem[] | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    const isRunning = status === 'validating' || status === 'importing';

    // Protect against browser tab close or hard refresh while importing
    useEffect(() => {
        if (!isRunning) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRunning]);

    const toggleMinimize = useCallback(() => {
        setIsMinimized((prev) => !prev);
    }, []);

    const dismissJob = useCallback(() => {
        if (isRunning) return;
        setStatus('idle');
        setFileName(null);
        setPeriod(null);
        setCurrent(0);
        setTotal(0);
        setCurrentChunk(0);
        setTotalChunks(0);
        setCurrentName('');
        setPercent(0);
        setMessage('');
        setErrors(null);
    }, [isRunning]);

    const startImportJob = useCallback(
        async (file: File, targetPeriod: string): Promise<boolean> => {
            if (isRunning) return false;

            setStatus('validating');
            setFileName(file.name);
            setPeriod(targetPeriod);
            setCurrent(0);
            setTotal(0);
            setPercent(10);
            setMessage('Memeriksa validasi 3 lapis data Excel...');
            setErrors(null);
            setIsMinimized(false);

            try {
                // Step 1: Pre-validation scan (< 1 second)
                const formData = new FormData();
                formData.append('file', file);
                formData.append('period', targetPeriod);

                const valRes = await fetch('/api/import/validate', {
                    method: 'POST',
                    body: formData,
                });

                if (!valRes.ok) {
                    const errData = await valRes.json();
                    throw new Error(errData?.error || 'Gagal memvalidasi file Excel');
                }

                const valJson = await valRes.json();
                const valResult = valJson.data;

                if (!valResult.isValid) {
                    setStatus('error');
                    setErrors(valResult.errors || []);
                    setMessage(valResult.message || 'Ditemukan data yang tidak cocok');
                    setPercent(100);
                    return false;
                }

                const allRows = valResult.rows as ParsedExcelRow[];
                const rowCount = allRows.length;
                const chunksCount = Math.ceil(rowCount / CHUNK_SIZE);

                setTotal(rowCount);
                setTotalChunks(chunksCount);
                setStatus('importing');
                setPercent(20);
                setMessage(`Validasi lolos 100%! Memproses ${rowCount} baris dalam ${chunksCount} batch...`);

                // Step 2: Sequential Chunk Execution (1-2s per chunk, never hits Vercel 10s limit)
                let processedSoFar = 0;

                for (let i = 0; i < chunksCount; i++) {
                    const startIdx = i * CHUNK_SIZE;
                    const chunkRows = allRows.slice(startIdx, startIdx + CHUNK_SIZE);
                    const isLast = i === chunksCount - 1;

                    setCurrentChunk(i + 1);
                    setCurrentName(chunkRows[0]?.name || `Batch ${i + 1}`);
                    setMessage(`Menyimpan batch ${i + 1} dari ${chunksCount} (${chunkRows.length} baris)...`);

                    let lastError: Error | null = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            const chunkRes = await fetch('/api/import/chunk', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    period: targetPeriod,
                                    rows: chunkRows,
                                    chunkIndex: i,
                                    totalChunks: chunksCount,
                                    isLastChunk: isLast,
                                }),
                            });

                            if (!chunkRes.ok) {
                                const errData = await chunkRes.json().catch(() => null);
                                throw new Error(errData?.error || `Gagal menyimpan batch ke-${i + 1} (HTTP ${chunkRes.status})`);
                            }

                            lastError = null;
                            break;
                        } catch (chunkErr) {
                            lastError = chunkErr instanceof Error
                                ? chunkErr
                                : new Error(`Gagal menyimpan batch ke-${i + 1}`);
                            if (attempt < 2) {
                                await new Promise((resolve) => setTimeout(resolve, 600));
                            }
                        }
                    }

                    if (lastError) {
                        throw lastError;
                    }

                    processedSoFar += chunkRows.length;
                    setCurrent(processedSoFar);
                    setPercent(Math.round(20 + ((i + 1) / chunksCount) * 80));
                    clearCustomerCaches();
                }

                clearCustomerCaches();
                setStatus('completed');
                setPercent(100);
                setMessage(`Selesai! Seluruh ${rowCount} data tagihan berhasil diimpor.`);
                return true;
            } catch (err: any) {
                console.error('Import job failed:', err);
                setStatus('error');
                setMessage(err?.message || 'Terjadi kesalahan saat memproses import');
                setPercent(100);
                return false;
            }
        },
        [isRunning],
    );

    return (
        <ImportJobContext.Provider
            value={{
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
                startImportJob,
                toggleMinimize,
                dismissJob,
            }}
        >
            {children}
        </ImportJobContext.Provider>
    );
}

export function useImportJob() {
    const context = useContext(ImportJobContext);
    if (!context) {
        throw new Error('useImportJob must be used within an ImportJobProvider');
    }
    return context;
}
