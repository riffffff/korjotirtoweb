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

                // Check existing
                const existing = await prisma.customer.findMany({ select: { name: true } });
                const existingNames = new Set(existing.map(c => c.name));
                const toCreate = customers.filter(c => !existingNames.has(c.name));
                const skipped = customers.length - toCreate.length;

                if (skipped > 0) {
                    sendProgress({ type: 'status', message: `${skipped} sudah ada, ${toCreate.length} akan diimport`, percent: 20 });
                }

                if (toCreate.length === 0) {
                    sendProgress({ type: 'complete', total: customers.length, added: 0, skipped, failed: 0, message: 'Semua pelanggan sudah ada' });
                    controller.close();
                    return;
                }

                const period = '2025-12';

                // STEP 1: Bulk insert customers (fast!)
                sendProgress({ type: 'status', message: 'Menyimpan pelanggan...', percent: 30 });
                await prisma.customer.createMany({
                    data: toCreate.map(c => ({
                        customerNumber: c.customerNumber,
                        name: c.name,
                        phone: c.phone,
                        totalBill: c.totalAmount,
                        totalPaid: 0,
                        outstandingBalance: c.totalAmount,
                    })),
                    skipDuplicates: true,
                });

                // Get created customer IDs
                sendProgress({ type: 'status', message: 'Mengambil ID pelanggan...', percent: 40 });
                const createdCustomers = await prisma.customer.findMany({
                    where: { name: { in: toCreate.map(c => c.name) } },
                    select: { id: true, name: true },
                });
                const customerIdMap = new Map(createdCustomers.map(c => [c.name, c.id]));

                // STEP 2: Bulk insert meter readings
                sendProgress({ type: 'status', message: 'Menyimpan meter readings...', percent: 50 });
                await prisma.meterReading.createMany({
                    data: toCreate.filter(c => customerIdMap.has(c.name)).map(c => ({
                        customerId: customerIdMap.get(c.name)!,
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

                // STEP 3: Bulk insert bills
                sendProgress({ type: 'status', message: 'Menyimpan tagihan...', percent: 70 });
                const billData = toCreate
                    .filter(c => customerIdMap.has(c.name) && meterIdMap.has(customerIdMap.get(c.name)!))
                    .map(c => ({
                        meterReadingId: meterIdMap.get(customerIdMap.get(c.name)!)!,
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

                // STEP 4: Bulk insert bill items
                sendProgress({ type: 'status', message: 'Menyimpan rincian tagihan...', percent: 90 });
                const billItems: { billId: number; type: string; usage: number; rate: number; amount: number }[] = [];
                for (const c of toCreate) {
                    const billId = billIdMap.get(meterIdMap.get(customerIdMap.get(c.name)!)!)!;
                    billItems.push({ billId, type: 'beban', usage: 0, rate: c.beban, amount: c.beban });
                    if (c.usageK1 > 0) billItems.push({ billId, type: 'k1', usage: c.usageK1, rate: 1800, amount: c.beayaK1 });
                    if (c.usageK2 > 0) billItems.push({ billId, type: 'k2', usage: c.usageK2, rate: 3000, amount: c.beayaK2 });
                }
                await prisma.billItem.createMany({ data: billItems });

                sendProgress({
                    type: 'complete',
                    total: customers.length,
                    added: toCreate.length,
                    skipped,
                    failed: 0,
                    percent: 100,
                    message: `Selesai! ${toCreate.length} pelanggan berhasil diimport`,
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
