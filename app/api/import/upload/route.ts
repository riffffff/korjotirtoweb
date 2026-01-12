import { NextRequest, NextResponse } from 'next/server';
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

interface ImportResult {
    success: boolean;
    data?: {
        total: number;
        newCustomers: number;
        existingCustomers: number;
        billsCreated: number;
        period: string;
    };
    error?: string;
    errorDetail?: string;
}

/**
 * POST /api/import/upload
 * Import data from uploaded Excel file
 * - Full transaction: rollback ALL if ANY error
 * - Can be used monthly for adding new bills
 * - Supports both new customers and adding bills to existing
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportResult>> {
    try {
        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const role = formData.get('role') as string;
        const period = formData.get('period') as string; // Format: YYYY-MM

        // Validate inputs
        if (role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        if (!file) {
            return NextResponse.json({ success: false, error: 'File Excel harus diupload' }, { status: 400 });
        }

        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json({ success: false, error: 'Period harus dalam format YYYY-MM (contoh: 2025-12)' }, { status: 400 });
        }

        // Read file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        // Parse Excel data
        const rows: ExcelCustomerRow[] = [];
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
                rows.push({
                    customerNumber, name, phone,
                    meterStart, meterEnd, usage,
                    usageK1, usageK2, beban, beayaK1, beayaK2, totalAmount,
                });
            }
        }

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Tidak ada data valid di file Excel' }, { status: 400 });
        }

        // Use FULL TRANSACTION - rollback ALL if ANY error
        const result = await prisma.$transaction(async (tx) => {
            let newCustomers = 0;
            let existingCustomers = 0;
            let billsCreated = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                // Find or create customer
                let customer = await tx.customer.findFirst({
                    where: { name: row.name, deletedAt: null },
                });

                if (customer) {
                    existingCustomers++;
                } else {
                    // Create new customer
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

                // Check if bill already exists for this period
                const existingReading = await tx.meterReading.findFirst({
                    where: { customerId: customer.id, period },
                });

                if (existingReading) {
                    throw new Error(`Tagihan ${period} untuk "${row.name}" sudah ada. Hapus dulu jika ingin import ulang.`);
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

                billsCreated++;
            }

            return { newCustomers, existingCustomers, billsCreated };
        }, {
            timeout: 120000, // 2 minutes max
        });

        return NextResponse.json({
            success: true,
            data: {
                total: rows.length,
                newCustomers: result.newCustomers,
                existingCustomers: result.existingCustomers,
                billsCreated: result.billsCreated,
                period,
            },
        });
    } catch (error) {
        console.error('Import error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json({
            success: false,
            error: 'Import gagal - semua data di-rollback',
            errorDetail: errorMessage,
        }, { status: 500 });
    }
}
