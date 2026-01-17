import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';

interface ExcelCustomerRow {
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
 * Import customers + bills from uploaded Excel file with progress streaming
 */
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendProgress = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const formData = await request.formData();
                const file = formData.get('file') as File | null;
                const role = formData.get('role') as string | null;
                const period = formData.get('period') as string | null;

                if (role !== 'admin') {
                    sendProgress({ type: 'error', message: 'Unauthorized' });
                    controller.close();
                    return;
                }

                if (!file) {
                    sendProgress({ type: 'error', message: 'File tidak ditemukan' });
                    controller.close();
                    return;
                }

                if (!period || !/^\d{4}-\d{2}$/.test(period)) {
                    sendProgress({ type: 'error', message: 'Periode tidak valid' });
                    controller.close();
                    return;
                }

                sendProgress({ type: 'status', message: 'Membaca file Excel...' });

                // Read file buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

                sendProgress({ type: 'status', message: 'Parsing data...', percent: 10 });

                const customers: ExcelCustomerRow[] = [];

                for (let row = 8; row <= range.e.r; row++) {
                    const getVal = (col: number) => {
                        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
                        return cell?.v;
                    };

                    const no = getVal(0);
                    const nama = getVal(1);
                    if (!no || !nama) continue;

                    const customerNumber = parseInt(String(no).replace(/^0+/, ''), 10);
                    const name = String(nama).trim();

                    let phone: string | null = null;
                    const phoneVal = getVal(12);
                    if (phoneVal) {
                        phone = String(phoneVal).trim();
                        if (phone && !phone.startsWith('0') && !phone.startsWith('+')) {
                            phone = '0' + phone;
                        }
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
                        customers.push({
                            customerNumber, name, phone,
                            meterStart, meterEnd, usage,
                            usageK1, usageK2, beban, beayaK1, beayaK2, totalAmount,
                        });
                    }
                }

                if (customers.length === 0) {
                    sendProgress({ type: 'error', message: 'Tidak ada data valid di file Excel' });
                    controller.close();
                    return;
                }

                sendProgress({ type: 'status', message: `Ditemukan ${customers.length} pelanggan`, percent: 15 });

                // Check existing customers by name and customerNumber
                const existingCustomers = await prisma.customer.findMany({
                    select: { id: true, name: true, customerNumber: true },
                });
                const existingNames = new Set(existingCustomers.map(c => c.name));
                const existingNumbers = new Set(existingCustomers.map(c => c.customerNumber));

                const skippedNames: string[] = [];
                const toCreate: ExcelCustomerRow[] = [];

                for (const customer of customers) {
                    if (existingNames.has(customer.name) || existingNumbers.has(customer.customerNumber)) {
                        skippedNames.push(customer.name);
                    } else {
                        toCreate.push(customer);
                    }
                }

                if (toCreate.length === 0) {
                    sendProgress({
                        type: 'complete',
                        total: customers.length,
                        added: 0,
                        skipped: skippedNames.length,
                        message: 'Semua pelanggan sudah ada'
                    });
                    controller.close();
                    return;
                }

                sendProgress({
                    type: 'status',
                    message: `${skippedNames.length} sudah ada, ${toCreate.length} akan diimport`
                });

                // period is already received from formData

                let customersAdded = 0;
                let billsCreated = 0;
                let failed = 0;

                // Process one by one for progress
                for (let i = 0; i < toCreate.length; i++) {
                    const customer = toCreate[i];
                    const percent = Math.round(20 + ((i + 1) / toCreate.length) * 75);

                    sendProgress({
                        type: 'progress',
                        current: i + 1,
                        total: toCreate.length,
                        percent,
                        currentName: customer.name,
                        message: `Mengimport ${customer.name}...`
                    });

                    try {
                        await prisma.$transaction(async (tx) => {
                            // Create customer
                            const newCustomer = await tx.customer.create({
                                data: {
                                    customerNumber: customer.customerNumber,
                                    name: customer.name,
                                    phone: customer.phone,
                                    totalBill: customer.totalAmount,
                                    totalPaid: 0,
                                    balance: customer.totalAmount,
                                },
                            });

                            // Create meter reading
                            const meterReading = await tx.meterReading.create({
                                data: {
                                    customerId: newCustomer.id,
                                    period,
                                    meterStart: customer.meterStart,
                                    meterEnd: customer.meterEnd,
                                    usage: customer.usage,
                                },
                            });

                            // Create bill
                            const bill = await tx.bill.create({
                                data: {
                                    meterReadingId: meterReading.id,
                                    totalAmount: customer.totalAmount,
                                    amountPaid: 0,
                                    remaining: customer.totalAmount,
                                    paymentStatus: 'unpaid',
                                },
                            });

                            // Create bill items
                            const billItems: {
                                billId: number;
                                type: string;
                                usage: number;
                                rate: number;
                                amount: number;
                            }[] = [
                                    {
                                        billId: bill.id,
                                        type: 'beban',
                                        usage: 0,
                                        rate: customer.beban,
                                        amount: customer.beban,
                                    },
                                ];

                            if (customer.usageK1 > 0) {
                                billItems.push({
                                    billId: bill.id,
                                    type: 'k1',
                                    usage: customer.usageK1,
                                    rate: 1800,
                                    amount: customer.beayaK1,
                                });
                            }

                            if (customer.usageK2 > 0) {
                                billItems.push({
                                    billId: bill.id,
                                    type: 'k2',
                                    usage: customer.usageK2,
                                    rate: 3000,
                                    amount: customer.beayaK2,
                                });
                            }

                            await tx.billItem.createMany({ data: billItems });
                        });

                        customersAdded++;
                        billsCreated++;
                    } catch (err) {
                        console.error(`Failed to import ${customer.name}:`, err);
                        failed++;
                    }
                }

                sendProgress({
                    type: 'complete',
                    total: customers.length,
                    added: customersAdded,
                    skipped: skippedNames.length,
                    failed,
                    percent: 100,
                    message: `Selesai! ${customersAdded} pelanggan berhasil diimport`
                });
                controller.close();
            } catch (error) {
                console.error('Error importing customers:', error);
                sendProgress({ type: 'error', message: 'Gagal: ' + String(error) });
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
