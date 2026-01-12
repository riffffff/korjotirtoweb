import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';

interface ExcelRow {
    customerNumber: number;
    name: string;
    phone: string | null;
    meterStart: number;
    meterEnd: number;
    usage: number;
    usageK1: number;
    usageK2: number;
    beban: number;
    beayaK1: number;
    beayaK2: number;
    totalAmount: number;
}

/**
 * POST /api/import/upload
 * Import with real-time progress and full transaction (rollback on error)
 */
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // Parse form data
                const formData = await request.formData();
                const file = formData.get('file') as File | null;
                const role = formData.get('role') as string;
                const period = formData.get('period') as string;

                if (role !== 'admin') {
                    send({ type: 'error', message: 'Unauthorized' });
                    controller.close();
                    return;
                }

                if (!file) {
                    send({ type: 'error', message: 'File Excel harus diupload' });
                    controller.close();
                    return;
                }

                if (!period || !/^\d{4}-\d{2}$/.test(period)) {
                    send({ type: 'error', message: 'Period harus format YYYY-MM' });
                    controller.close();
                    return;
                }

                send({ type: 'status', message: 'Membaca file...', percent: 5 });

                // Read Excel
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

                send({ type: 'status', message: 'Parsing data...', percent: 10 });

                // Parse rows
                const rows: ExcelRow[] = [];
                for (let row = 8; row <= range.e.r; row++) {
                    const getVal = (col: number) => worksheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v;
                    const no = getVal(0), nama = getVal(1);
                    if (!no || !nama) continue;

                    const customerNumber = parseInt(String(no).replace(/^0+/, ''), 10);
                    const name = String(nama).trim();
                    let phone: string | null = null;
                    const phoneVal = getVal(12);
                    if (phoneVal) {
                        phone = String(phoneVal).trim();
                        if (phone && !phone.startsWith('0') && !phone.startsWith('+')) phone = '0' + phone;
                    }

                    const meterStart = Number(getVal(2)) || 0;
                    const meterEnd = Number(getVal(3)) || 0;
                    const usage = Number(getVal(4)) || (meterEnd - meterStart);
                    const usageK1 = Number(getVal(5)) || Math.min(usage, 40);
                    const usageK2 = Number(getVal(6)) || Math.max(usage - 40, 0);
                    const beban = Number(getVal(7)) || 3000;
                    const beayaK1 = Number(getVal(8)) || (usageK1 * 1800);
                    const beayaK2 = Number(getVal(9)) || (usageK2 * 3000);
                    const totalAmount = Number(getVal(10)) || (beban + beayaK1 + beayaK2);

                    if (customerNumber && name) {
                        rows.push({ customerNumber, name, phone, meterStart, meterEnd, usage, usageK1, usageK2, beban, beayaK1, beayaK2, totalAmount });
                    }
                }

                if (rows.length === 0) {
                    send({ type: 'error', message: 'Tidak ada data valid di file' });
                    controller.close();
                    return;
                }

                send({ type: 'status', message: `Ditemukan ${rows.length} data`, total: rows.length, percent: 15 });

                // Full transaction with progress
                let newCustomers = 0;
                let existingCustomers = 0;
                let current = 0;

                await prisma.$transaction(async (tx) => {
                    for (const row of rows) {
                        current++;
                        const percent = 15 + Math.round((current / rows.length) * 80);

                        send({
                            type: 'progress',
                            current,
                            total: rows.length,
                            percent,
                            name: row.name,
                            message: `${current}/${rows.length} - ${row.name}`,
                        });

                        // Find or create customer
                        let customer = await tx.customer.findFirst({
                            where: { name: row.name, deletedAt: null },
                        });

                        if (customer) {
                            existingCustomers++;
                        } else {
                            customer = await tx.customer.create({
                                data: {
                                    customerNumber: row.customerNumber,
                                    name: row.name,
                                    phone: row.phone,
                                    totalBill: 0,
                                    totalPaid: 0,
                                    outstandingBalance: 0,
                                },
                            });
                            newCustomers++;
                        }

                        // Check duplicate period
                        const existingReading = await tx.meterReading.findFirst({
                            where: { customerId: customer.id, period },
                        });

                        if (existingReading) {
                            throw new Error(`Tagihan ${period} untuk "${row.name}" sudah ada`);
                        }

                        // Create meter reading
                        const meterReading = await tx.meterReading.create({
                            data: {
                                customerId: customer.id,
                                period,
                                meterStart: row.meterStart,
                                meterEnd: row.meterEnd,
                                usage: row.usage,
                            },
                        });

                        // Create bill
                        const bill = await tx.bill.create({
                            data: {
                                meterReadingId: meterReading.id,
                                totalAmount: row.totalAmount,
                                amountPaid: 0,
                                remaining: row.totalAmount,
                                paymentStatus: 'unpaid',
                            },
                        });

                        // Create bill items
                        await tx.billItem.create({
                            data: { billId: bill.id, type: 'beban', usage: 0, rate: row.beban, amount: row.beban },
                        });
                        if (row.usageK1 > 0) {
                            await tx.billItem.create({
                                data: { billId: bill.id, type: 'k1', usage: row.usageK1, rate: 1800, amount: row.beayaK1 },
                            });
                        }
                        if (row.usageK2 > 0) {
                            await tx.billItem.create({
                                data: { billId: bill.id, type: 'k2', usage: row.usageK2, rate: 3000, amount: row.beayaK2 },
                            });
                        }

                        // Update customer totals
                        await tx.customer.update({
                            where: { id: customer.id },
                            data: {
                                totalBill: { increment: row.totalAmount },
                                outstandingBalance: { increment: row.totalAmount },
                            },
                        });
                    }
                }, { timeout: 300000 }); // 5 minutes max

                send({
                    type: 'complete',
                    total: rows.length,
                    newCustomers,
                    existingCustomers,
                    billsCreated: rows.length,
                    period,
                    percent: 100,
                    message: `Selesai! ${rows.length} tagihan berhasil diimport`,
                });

                controller.close();
            } catch (error) {
                console.error('Import error:', error);
                const msg = error instanceof Error ? error.message : 'Unknown error';
                send({ type: 'error', message: 'Import gagal - semua data di-rollback', detail: msg });
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
