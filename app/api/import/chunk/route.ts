import { NextRequest } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { importChunkCustomers } from '@/services/server/import.service';
import type { ParsedExcelRow } from '@/lib/excel-parser';
import { errorResponse, successResponse } from '@/lib/api-response';

export const maxDuration = 60;

interface ChunkRequestBody {
    period: string;
    rows: ParsedExcelRow[];
    chunkIndex: number;
    totalChunks: number;
    isLastChunk?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch (error) {
        if (error instanceof AuthError) return errorResponse(error.message, error.status);
        throw error;
    }

    try {
        const body = (await request.json()) as ChunkRequestBody;
        const { period, rows, chunkIndex, totalChunks, isLastChunk } = body;

        if (!period || typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
            return errorResponse('Periode tagihan tidak valid', 400);
        }
        if (!Array.isArray(rows) || rows.length === 0) {
            return errorResponse('Data baris chunk tidak valid atau kosong', 400);
        }

        const isLast = Boolean(isLastChunk || chunkIndex === totalChunks - 1);
        const result = await importChunkCustomers(rows, period, isLast);

        return successResponse({
            success: true,
            chunkIndex,
            processed: result.processed,
            isLastChunk: isLast,
        });
    } catch (error) {
        console.error('Error importing chunk:', error);
        return errorResponse(
            error instanceof Error ? error.message : 'Gagal memproses batch import',
            500,
        );
    }
}
