import { NextRequest } from 'next/server';
import { parseCustomerExcelBuffer } from '@/lib/excel-parser';
import { AuthError, requireAdmin } from '@/lib/auth';
import { importCustomersFromExcel } from '@/services/server/import.service';
import { getBillingConfig } from '@/services/server/setting.service';

function errorResponse(message: string, status: number) {
    return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch (error) {
        if (error instanceof AuthError) return errorResponse(error.message, error.status);
        throw error;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            try {
                const formData = await request.formData();
                const file = formData.get('file');
                const period = formData.get('period');
                if (!(file instanceof File)) {
                    send({ type: 'error', message: 'File tidak ditemukan' });
                    controller.close();
                    return;
                }
                if (typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
                    send({ type: 'error', message: 'Periode tidak valid' });
                    controller.close();
                    return;
                }

                send({ type: 'status', message: 'Membaca file Excel...' });
                const config = await getBillingConfig();
                const rows = parseCustomerExcelBuffer(Buffer.from(await file.arrayBuffer()), config);
                if (rows.length === 0) {
                    send({ type: 'error', message: 'Tidak ada data valid di file Excel' });
                    controller.close();
                    return;
                }
                send({ type: 'status', message: `Ditemukan ${rows.length} data`, percent: 15 });
                const result = await importCustomersFromExcel(rows, period, send);
                if (result.errors && result.errors.length > 0) {
                    send({
                        type: 'error',
                        ...result,
                        message: `Import dibatalkan: Ditemukan ${result.errors.length} data tidak cocok. Database tetap aman, tidak ada data yang masuk.`,
                    });
                } else {
                    send({
                        type: 'complete',
                        ...result,
                        message: `Selesai! Seluruh ${result.added} data tagihan berhasil diimpor.`,
                        percent: 100,
                    });
                }
                controller.close();
            } catch (error) {
                console.error('Error importing customers:', error);
                send({ type: 'error', message: error instanceof Error ? error.message : 'Gagal mengimpor data' });
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
