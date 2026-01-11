import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/import
 * Import customers from Excel file
 * - Check if customer name exists, skip if already registered
 * - Use database transaction with optimized batch processing
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role } = body;

        // Check admin role
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Read Excel file from docs folder
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

        // Parse Excel - data starts from row 9 (index 8)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        const customers: { customerNumber: number; name: string; phone: string | null }[] = [];

        for (let row = 8; row <= range.e.r; row++) {
            const noCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
            const namaCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
            const phoneCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 12 })];

            if (!noCell || !namaCell) continue;

            const customerNumber = parseInt(String(noCell.v).replace(/^0+/, ''), 10);
            const name = String(namaCell.v).trim();
            let phone: string | null = null;

            if (phoneCell && phoneCell.v) {
                phone = String(phoneCell.v).trim();
                if (phone && !phone.startsWith('0') && !phone.startsWith('+')) {
                    phone = '0' + phone;
                }
            }

            if (customerNumber && name) {
                customers.push({ customerNumber, name, phone });
            }
        }

        if (customers.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Tidak ada data valid di file Excel' },
                { status: 400 }
            );
        }

        // OPTIMIZATION: Fetch all existing customer names BEFORE transaction
        const existingCustomers = await prisma.customer.findMany({
            where: { deletedAt: null },
            select: { name: true },
        });
        const existingNames = new Set(existingCustomers.map(c => c.name));

        // Filter out customers that already exist
        const skippedNames: string[] = [];
        const toCreate: typeof customers = [];

        for (const customer of customers) {
            if (existingNames.has(customer.name)) {
                skippedNames.push(customer.name);
            } else {
                toCreate.push(customer);
            }
        }

        // Batch create using createMany (much faster than individual creates)
        if (toCreate.length > 0) {
            await prisma.customer.createMany({
                data: toCreate.map(c => ({
                    customerNumber: c.customerNumber,
                    name: c.name,
                    phone: c.phone,
                    totalBill: 0,
                    totalPaid: 0,
                    outstandingBalance: 0,
                })),
                skipDuplicates: true,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                total: customers.length,
                added: toCreate.length,
                skipped: skippedNames.length,
                skippedNames: skippedNames.slice(0, 10),
            },
            message: `Berhasil import ${toCreate.length} pelanggan, ${skippedNames.length} dilewati (sudah ada)`,
        });
    } catch (error) {
        console.error('Error importing customers:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal import data' },
            { status: 500 }
        );
    }
}
