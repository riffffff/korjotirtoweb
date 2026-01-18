import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

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
 * POST /api/import/stream
 * FAST import using bulk inserts with progress streaming
 */
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendProgress = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const body = await request.json();
                const { role } = body;

                if (role !== 'admin') {
                    sendProgress({ type: 'error', message: 'Unauthorized' });
                    controller.close();
                    return;
                }

                sendProgress({ type: 'status', message: 'Membaca file Excel...', percent: 5 });

                const filePath = path.join(process.cwd(), 'docs', 'data pengguna air.xlsx');
                if (!fs.existsSync(filePath)) {
                    sendProgress({ type: 'error', message: 'File Excel tidak ditemukan' });
                    controller.close();
                    return;
                }

                const fileBuffer = fs.readFileSync(filePath);
                const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

                sendProgress({ type: 'status', message: 'Parsing data...', percent: 10 });

                const customers: ExcelCustomerRow[] = [];
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
                        customers.push({ customerNumber, name, phone, meterStart, meterEnd, usage, usageK1, usageK2, beban, beayaK1, beayaK2, totalAmount });
                    }
                }

                if (customers.length === 0) {
                    sendProgress({ type: 'error', message: 'Tidak ada data valid' });
                    controller.close();
                    return;
                }

                sendProgress({ type: 'status', message: `Ditemukan ${customers.length} pelanggan`, percent: 15 });

                // Get period from request or use current month
                const now = new Date();
                const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                // Check existing customers by customerNumber
                sendProgress({ type: 'status', message: 'Memeriksa data pelanggan...', percent: 20 });
                const existingCustomers = await prisma.customer.findMany({ 
                    select: { id: true, customerNumber: true, name: true, phone: true } 
                });
                const existingByNumber = new Map(existingCustomers.map(c => [c.customerNumber, c]));

                // Separate new customers from existing ones
                const newCustomers = customers.filter(c => !existingByNumber.has(c.customerNumber));
                const existingToUpdate = customers.filter(c => existingByNumber.has(c.customerNumber));

                sendProgress({ 
                    type: 'status', 
                    message: `${newCustomers.length} pelanggan baru, ${existingToUpdate.length} akan diupdate`, 
                    percent: 25 
                });

                // STEP 1: Create new customers
                if (newCustomers.length > 0) {
                    sendProgress({ type: 'status', message: 'Menyimpan pelanggan baru...', percent: 30 });
                    await prisma.customer.createMany({
                        data: newCustomers.map(c => ({
                            customerNumber: c.customerNumber,
                            name: c.name,
                            phone: c.phone,
                            totalBill: c.totalAmount,
                            totalPaid: 0,
                            balance: 0,
                        })),
                        skipDuplicates: true,
                    });
                }

                // STEP 2: Update existing customers (phone if empty, and totalBill)
                if (existingToUpdate.length > 0) {
                    sendProgress({ type: 'status', message: 'Memperbarui pelanggan existing...', percent: 35 });
                    for (const c of existingToUpdate) {
                        const existing = existingByNumber.get(c.customerNumber)!;
                        await prisma.customer.update({
                            where: { id: existing.id },
                            data: {
                                // Update phone if current is empty and import has phone
                                phone: existing.phone || c.phone || null,
                                // Increment totalBill
                                totalBill: { increment: c.totalAmount },
                            },
                        });
                    }
                }

                // Get ALL customer IDs (new + existing)
                sendProgress({ type: 'status', message: 'Mengambil ID pelanggan...', percent: 40 });
                const allCustomers = await prisma.customer.findMany({
                    where: { customerNumber: { in: customers.map(c => c.customerNumber) } },
                    select: { id: true, customerNumber: true, name: true },
                });
                const customerIdMap = new Map(allCustomers.map(c => [c.customerNumber, c.id]));
                const customerNameMap = new Map(allCustomers.map(c => [c.customerNumber, c.name]));

                // STEP 3: Bulk insert meter readings
                sendProgress({ type: 'status', message: 'Menyimpan meter readings...', percent: 50 });
                await prisma.meterReading.createMany({
                    data: customers.filter(c => customerIdMap.has(c.customerNumber)).map(c => ({
                        customerId: customerIdMap.get(c.customerNumber)!,
                        period,
                        meterStart: c.meterStart,
                        meterEnd: c.meterEnd,
                        usage: c.usage,
                    })),
                    skipDuplicates: true,
                });

                // Get meter reading IDs
                sendProgress({ type: 'status', message: 'Mengambil ID meter readings...', percent: 60 });
                const meterReadings = await prisma.meterReading.findMany({
                    where: { customerId: { in: Array.from(customerIdMap.values()) }, period },
                    select: { id: true, customerId: true },
                });
                const meterIdMap = new Map(meterReadings.map(m => [m.customerId, m.id]));

                // STEP 4: Bulk insert bills
                sendProgress({ type: 'status', message: 'Menyimpan tagihan...', percent: 70 });
                const billData = customers
                    .filter(c => customerIdMap.has(c.customerNumber) && meterIdMap.has(customerIdMap.get(c.customerNumber)!))
                    .map(c => ({
                        meterReadingId: meterIdMap.get(customerIdMap.get(c.customerNumber)!)!,
                        totalAmount: c.totalAmount,
                        amountPaid: 0,
                        remaining: c.totalAmount,
                        paymentStatus: 'unpaid',
                    }));
                if (billData.length > 0) {
                    await prisma.bill.createMany({ data: billData, skipDuplicates: true });
                }

                // Get bill IDs
                sendProgress({ type: 'status', message: 'Mengambil ID tagihan...', percent: 80 });
                const bills = await prisma.bill.findMany({
                    where: { meterReadingId: { in: Array.from(meterIdMap.values()) } },
                    select: { id: true, meterReadingId: true },
                });
                const billIdMap = new Map(bills.map(b => [b.meterReadingId, b.id]));

                // STEP 5: Bulk insert bill items
                sendProgress({ type: 'status', message: 'Menyimpan rincian tagihan...', percent: 90 });
                const billItems: { billId: number; type: string; usage: number; rate: number; amount: number }[] = [];
                for (const c of customers) {
                    const customerId = customerIdMap.get(c.customerNumber);
                    if (!customerId) continue;
                    const meterId = meterIdMap.get(customerId);
                    if (!meterId) continue;
                    const billId = billIdMap.get(meterId);
                    if (!billId) continue;
                    
                    billItems.push({ billId, type: 'beban', usage: 0, rate: c.beban, amount: c.beban });
                    if (c.usageK1 > 0) billItems.push({ billId, type: 'k1', usage: c.usageK1, rate: 1800, amount: c.beayaK1 });
                    if (c.usageK2 > 0) billItems.push({ billId, type: 'k2', usage: c.usageK2, rate: 3000, amount: c.beayaK2 });
                }
                await prisma.billItem.createMany({ data: billItems });

                sendProgress({
                    type: 'complete',
                    total: customers.length,
                    added: newCustomers.length,
                    updated: existingToUpdate.length,
                    failed: 0,
                    percent: 100,
                    message: `Selesai! ${newCustomers.length} baru, ${existingToUpdate.length} diupdate`,
                });
                controller.close();
            } catch (error) {
                console.error('Import error:', error);
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
