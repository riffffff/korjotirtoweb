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
                            select: { 
                                id: true,
                                bill: {
                                    select: {
                                        id: true,
                                        totalAmount: true,
                                        amountPaid: true,
                                        paymentStatus: true,
                                    }
                                }
                            }
                        }
                    },
                });

                // Create maps for matching
                const customerByNameLower = new Map<string, typeof existingCustomers[0]>();
                
                for (const c of existingCustomers) {
                    customerByNameLower.set(c.name.toLowerCase(), c);
                }

                // Get highest customer number for auto-increment
                const aggregations = await prisma.customer.aggregate({
                    _max: { customerNumber: true },
                });
                let nextCustomerNumber = (aggregations._max.customerNumber || 0) + 1;

                // Categorize rows
                const toCreateNew: ExcelCustomerRow[] = [];
                const toAddBill: { row: ExcelCustomerRow; customerId: number }[] = [];
                // Changed from skippedDuplicate to toUpdateBill (OVERWRITE)
                const toUpdateBill: { 
                    row: ExcelCustomerRow; 
                    customerId: number; 
                    oldMeterReadingId: number;
                    oldBillData: {
                        id: number;
                        totalAmount: number;
                        amountPaid: number;
                        paymentStatus: string;
                    } | null;
                }[] = [];

                for (const row of excelRows) {
                    // Find existing customer by name ONLY (as requested)
                    const existing = customerByNameLower.get(row.name.toLowerCase());

                    if (existing) {
                        // Customer exists - check if already has bill for this period
                        if (existing.meterReadings.length > 0) {
                            // Already has bill for this period - OVERWRITE
                            const meterReading = existing.meterReadings[0];
                            const bill = meterReading.bill;
                            
                            toUpdateBill.push({
                                row,
                                customerId: existing.id,
                                oldMeterReadingId: meterReading.id,
                                oldBillData: bill ? {
                                    id: bill.id,
                                    totalAmount: Number(bill.totalAmount),
                                    amountPaid: Number(bill.amountPaid),
                                    paymentStatus: bill.paymentStatus
                                } : null
                            });
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
                    message: `${toCreateNew.length} baru, ${toAddBill.length} tambah tagihan, ${toUpdateBill.length} overwrite`,
                    percent: 20
                });

                let newCustomers = 0;
                let existingUpdated = 0; // for adds
                let overwritten = 0;     // for updates/overwrites
                let failed = 0;
                const totalToProcess = toCreateNew.length + toAddBill.length + toUpdateBill.length;

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
                    
                    // Determine paidAt based on bill period (Backdate to end of period month)
                    // If Lunas, paidAt = End of Period Month (On Time)
                    // Defaults to new Date() if period parsing fails (fallback)
                    let finalPaidAt = new Date();
                    try {
                        const [pYear, pMonth] = period.split('-').map(Number);
                        const periodDueDate = new Date(pYear, pMonth, 0); // Last day of month
                        periodDueDate.setHours(12, 0, 0, 0); // Noon to match Safe Date
                        finalPaidAt = periodDueDate;
                    } catch (e) {
                         // Fallback to today if parsing fails
                    }

                    // Create bill
                    const bill = await tx.bill.create({
                        data: {
                            meterReadingId: meterReading.id,
                            totalAmount: row.totalAmount,
                            amountPaid: isPaid ? row.totalAmount : 0,
                            remaining: isPaid ? 0 : row.totalAmount,
                            paymentStatus: isPaid ? 'paid' : 'unpaid',
                            paidAt: isPaid ? finalPaidAt : null,
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
                    // Logic: Balance is Outstanding (Unpaid) amount
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
                        const currentCustomerNumber = nextCustomerNumber++; // Auto-increment
                        
                        await prisma.$transaction(async (tx) => {
                            const newCustomer = await tx.customer.create({
                                data: {
                                    customerNumber: currentCustomerNumber, // Use auto-incremented number
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

                // Process existing customers (add bills - NO overwrite needed)
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
                            if (row.phone) {
                                await tx.customer.update({
                                    where: { id: customerId },
                                    data: { phone: row.phone },
                                });
                            }
                            await createBillForCustomer(tx, customerId, row);
                        });
                        existingUpdated++;
                    } catch (err) {
                        console.error(`Failed to add bill for ${row.name}:`, err);
                        failed++;
                    }
                }

                // Process overwrites (UPDATE)
                for (const { row, customerId, oldMeterReadingId, oldBillData } of toUpdateBill) {
                    processed++;
                    const percent = Math.round(20 + (processed / totalToProcess) * 75);

                    sendProgress({
                        type: 'progress',
                        current: processed,
                        total: totalToProcess,
                        percent,
                        currentName: row.name,
                        message: `Update tagihan: ${row.name}...`
                    });

                    try {
                        await prisma.$transaction(async (tx) => {
                            // 1. Revert balance if bill existed
                            if (oldBillData) {
                                const isOldPaid = oldBillData.paymentStatus === 'paid';
                                // Calculate old remaining balance to revert
                                // If paid, remaining is 0. If unpaid, it's roughly totalAmount (or total - paid)
                                const oldRemaining = isOldPaid ? 0 : (oldBillData.totalAmount - oldBillData.amountPaid);

                                await tx.customer.update({
                                    where: { id: customerId },
                                    data: {
                                        totalBill: { decrement: oldBillData.totalAmount },
                                        totalPaid: isOldPaid ? { decrement: oldBillData.totalAmount } : undefined,
                                        // Update phone too if available
                                        phone: row.phone || undefined
                                    }
                                });

                                // 2. Delete old data (Hard Delete to replace cleanly)
                                await tx.billItem.deleteMany({ where: { billId: oldBillData.id } });
                                await tx.bill.delete({ where: { id: oldBillData.id } });
                            }
                            
                            // Delete meter reading (will fail if bill exists, so deleted bill first)
                            await tx.meterReading.delete({ where: { id: oldMeterReadingId } });

                            // 3. Create new bill with fresh data
                            await createBillForCustomer(tx, customerId, row);
                        });
                        overwritten++;
                    } catch (err) {
                        console.error(`Failed to overwrite bill for ${row.name}:`, err);
                        failed++;
                    }
                }

                sendProgress({
                    type: 'complete',
                    total: excelRows.length,
                    added: newCustomers + existingUpdated + overwritten,
                    newCustomers,
                    existingUpdated: existingUpdated + overwritten,
                    skipped: 0,
                    failed,
                    percent: 100,
                    message: `Selesai! ${newCustomers} baru, ${existingUpdated} ditambah, ${overwritten} ditimpa`
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
