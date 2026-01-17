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
    keterangan: string | null; // If empty, bill is considered lunas
}

/**
 * POST /api/import/upload
 * Import customers + bills from uploaded Excel file with progress streaming
 * 
 * Logic:
 * - Match Excel names to existing customers (case-insensitive)
 * - If customer exists AND already has bill for this period → skip
 * - If customer exists BUT no bill for this period → add bill
 * - If customer doesn't exist → create new customer + bill
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

                const excelRows: ExcelCustomerRow[] = [];

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
                    
                    // Column 11 is keterangan - if empty, bill is considered lunas
                    const keteranganVal = getVal(11);
                    const keterangan = keteranganVal ? String(keteranganVal).trim() : null;

                    if (customerNumber && name) {
                        excelRows.push({
                            customerNumber, name, phone,
                            meterStart, meterEnd, usage,
                            usageK1, usageK2, beban, beayaK1, beayaK2, totalAmount,
                            keterangan,
                        });
                    }
                }

                if (excelRows.length === 0) {
                    sendProgress({ type: 'error', message: 'Tidak ada data valid di file Excel' });
                    controller.close();
                    return;
                }

                sendProgress({ type: 'status', message: `Ditemukan ${excelRows.length} data`, percent: 15 });

                // Get all existing customers with their meter readings for this period
                const existingCustomers = await prisma.customer.findMany({
                    select: { 
                        id: true, 
                        name: true, 
                        customerNumber: true,
                        meterReadings: {
                            where: { period },
                            select: { id: true }
                        }
                    },
                });

                // Create a map for case-insensitive name matching
                const customerByNameLower = new Map<string, typeof existingCustomers[0]>();
                const customerByNumber = new Map<number, typeof existingCustomers[0]>();
                for (const c of existingCustomers) {
                    customerByNameLower.set(c.name.toLowerCase(), c);
                    customerByNumber.set(c.customerNumber, c);
                }

                // Categorize rows
                const toCreateNew: ExcelCustomerRow[] = [];
                const toAddBill: { row: ExcelCustomerRow; customerId: number }[] = [];
                const skippedDuplicate: string[] = [];

                for (const row of excelRows) {
                    // Try to find existing customer by name (case-insensitive) or customerNumber
                    const existingByName = customerByNameLower.get(row.name.toLowerCase());
                    const existingByNumber = customerByNumber.get(row.customerNumber);
                    const existing = existingByName || existingByNumber;

                    if (existing) {
                        // Customer exists - check if already has bill for this period
                        if (existing.meterReadings.length > 0) {
                            // Already has bill for this period - skip
                            skippedDuplicate.push(row.name);
                        } else {
                            // No bill for this period - add new bill
                            toAddBill.push({ row, customerId: existing.id });
                        }
                    } else {
                        // Customer doesn't exist - create new
                        toCreateNew.push(row);
                    }
                }

                sendProgress({
                    type: 'status',
                    message: `${toCreateNew.length} pelanggan baru, ${toAddBill.length} tagihan baru, ${skippedDuplicate.length} dilewati`,
                    percent: 20
                });

                let newCustomers = 0;
                let existingUpdated = 0;
                let failed = 0;
                const totalToProcess = toCreateNew.length + toAddBill.length;

                // Helper function to create bill for a customer
                const createBillForCustomer = async (
                    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
                    customerId: number,
                    row: ExcelCustomerRow
                ) => {
                    // Create meter reading
                    const meterReading = await tx.meterReading.create({
                        data: {
                            customerId,
                            period,
                            meterStart: row.meterStart,
                            meterEnd: row.meterEnd,
                            usage: row.usage,
                        },
                    });

                    // Determine if bill should be marked as paid (keterangan empty = lunas)
                    const isPaid = !row.keterangan || row.keterangan === '';
                    
                    // Create bill
                    const bill = await tx.bill.create({
                        data: {
                            meterReadingId: meterReading.id,
                            totalAmount: row.totalAmount,
                            amountPaid: isPaid ? row.totalAmount : 0,
                            remaining: isPaid ? 0 : row.totalAmount,
                            paymentStatus: isPaid ? 'paid' : 'unpaid',
                            paidAt: isPaid ? new Date() : null,
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
                            rate: row.beban,
                            amount: row.beban,
                        },
                    ];

                    if (row.usageK1 > 0) {
                        billItems.push({
                            billId: bill.id,
                            type: 'k1',
                            usage: row.usageK1,
                            rate: 1800,
                            amount: row.beayaK1,
                        });
                    }

                    if (row.usageK2 > 0) {
                        billItems.push({
                            billId: bill.id,
                            type: 'k2',
                            usage: row.usageK2,
                            rate: 3000,
                            amount: row.beayaK2,
                        });
                    }

                    await tx.billItem.createMany({ data: billItems });

                    // Update customer totals
                    await tx.customer.update({
                        where: { id: customerId },
                        data: {
                            totalBill: { increment: row.totalAmount },
                            totalPaid: isPaid ? { increment: row.totalAmount } : undefined,
                        }
                    });
                };

                // Process new customers
                let processed = 0;
                for (const row of toCreateNew) {
                    processed++;
                    const percent = Math.round(20 + (processed / totalToProcess) * 75);

                    sendProgress({
                        type: 'progress',
                        current: processed,
                        total: totalToProcess,
                        percent,
                        currentName: row.name,
                        message: `Membuat pelanggan baru: ${row.name}...`
                    });

                    try {
                        await prisma.$transaction(async (tx) => {
                            // Create customer with totalBill = 0
                            // createBillForCustomer will increment totalBill
                            const newCustomer = await tx.customer.create({
                                data: {
                                    customerNumber: row.customerNumber,
                                    name: row.name,
                                    phone: row.phone,
                                    totalBill: 0,
                                    totalPaid: 0,
                                    balance: 0,
                                },
                            });

                            await createBillForCustomer(tx, newCustomer.id, row);
                        });

                        newCustomers++;
                    } catch (err) {
                        console.error(`Failed to create customer ${row.name}:`, err);
                        failed++;
                    }
                }

                // Process existing customers (add bills)
                for (const { row, customerId } of toAddBill) {
                    processed++;
                    const percent = Math.round(20 + (processed / totalToProcess) * 75);

                    sendProgress({
                        type: 'progress',
                        current: processed,
                        total: totalToProcess,
                        percent,
                        currentName: row.name,
                        message: `Menambah tagihan: ${row.name}...`
                    });

                    try {
                        await prisma.$transaction(async (tx) => {
                            await createBillForCustomer(tx, customerId, row);
                        });

                        existingUpdated++;
                    } catch (err) {
                        console.error(`Failed to add bill for ${row.name}:`, err);
                        failed++;
                    }
                }

                sendProgress({
                    type: 'complete',
                    total: excelRows.length,
                    added: newCustomers + existingUpdated,
                    newCustomers,
                    existingUpdated,
                    skipped: skippedDuplicate.length,
                    failed,
                    percent: 100,
                    message: `Selesai! ${newCustomers} pelanggan baru, ${existingUpdated} tagihan ditambahkan`
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
