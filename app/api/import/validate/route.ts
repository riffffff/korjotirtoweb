import { NextRequest } from 'next/server';
import { parseCustomerExcelBuffer } from '@/lib/excel-parser';
import { AuthError, requireAdmin } from '@/lib/auth';
import { validateCustomersExcelRows } from '@/services/server/import.service';
import { getBillingConfig } from '@/services/server/setting.service';
import { errorResponse, successResponse } from '@/lib/api-response';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch (error) {
        if (error instanceof AuthError) return errorResponse(error.message, error.status);
        throw error;
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const period = formData.get('period');

        if (!(file instanceof File)) {
            return errorResponse('File Excel tidak ditemukan', 400);
        }
        if (typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
            return errorResponse('Periode tagihan tidak valid', 400);
        }

        const config = await getBillingConfig();
        const buffer = Buffer.from(await file.arrayBuffer());
        const rows = parseCustomerExcelBuffer(buffer, config);

        if (rows.length === 0) {
            return errorResponse('Tidak ada data pelanggan yang valid di file Excel', 400);
        }

        const errors = await validateCustomersExcelRows(rows, period);

        if (errors.length > 0) {
            return successResponse({
                isValid: false,
                total: rows.length,
                errors,
                message: `Ditemukan ${errors.length} data tidak cocok. Import dibatalkan demi keamanan database.`,
            });
        }

        return successResponse({
            isValid: true,
            total: rows.length,
            rows,
            message: `Verifikasi 3 lapis berhasil! Seluruh ${rows.length} baris valid.`,
        });
    } catch (error) {
        console.error('Error validating import:', error);
        return errorResponse(
            error instanceof Error ? error.message : 'Gagal memvalidasi data Excel',
            500,
        );
    }
}
