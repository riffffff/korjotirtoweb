import { NextRequest, NextResponse } from 'next/server';
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
 * POST /api/import
 * Import customers + bills from Excel file
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role } = body;

        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const filePath = path.join(process.cwd(), 'docs', 'data pengguna air.xlsx');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { success: false, error: 'File Excel tidak ditemukan' },
                { status: 404 }
            );
        }

        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

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
            return NextResponse.json(
                { success: false, error: 'Tidak ada data valid di file Excel' },
                { status: 400 }
            );
        }

        // Check existing customers
        const existingCustomers = await prisma.customer.findMany({
            select: { id: true, name: true },
        });
        const existingNames = new Map(existingCustomers.map(c => [c.name, c.id]));

        const skippedNames: string[] = [];
        const toCreate: ExcelCustomerRow[] = [];

        for (const customer of customers) {
            if (existingNames.has(customer.name)) {
                skippedNames.push(customer.name);
            } else {
                toCreate.push(customer);
            }
        }

        const period = '2025-12';
        let customersAdded = 0;
        let billsCreated = 0;

        // Batch processing - smaller batches for slow Supabase free tier
        const BATCH_SIZE = 10;
        for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
            const batch = toCreate.slice(i, i + BATCH_SIZE);

            await prisma.$transaction(async (tx) => {
                for (const customer of batch) {
                    // Create customer
                    const newCustomer = await tx.customer.create({
                        data: {
                            customerNumber: customer.customerNumber,
                            name: customer.name,
                            phone: customer.phone,
                            totalBill: customer.totalAmount,
                            totalPaid: 0,
                            outstandingBalance: customer.totalAmount,
                        },
                    });
                    customersAdded++;

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

                    // Create bill (linked via meterReading)
                    const bill = await tx.bill.create({
                        data: {
                            meterReadingId: meterReading.id,
                            totalAmount: customer.totalAmount,
                            amountPaid: 0,
                            remaining: customer.totalAmount,
                            paymentStatus: 'unpaid',
                        },
                    });
                    billsCreated++;

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
                }
            }, { timeout: 60000 }); // 60 second timeout per batch
        }

        return NextResponse.json({
            success: true,
            data: {
                total: customers.length,
                customersAdded,
                billsCreated,
                skipped: skippedNames.length,
                skippedNames: skippedNames.slice(0, 10),
            },
            message: `Berhasil import ${customersAdded} pelanggan dengan ${billsCreated} tagihan`,
        });
    } catch (error) {
        console.error('Error importing customers:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal import data' },
            { status: 500 }
        );
    }
}
