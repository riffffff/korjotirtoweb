import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { ParsedExcelRow } from '@/lib/excel-parser';
import { getBillingConfig } from './setting.service';

export interface ImportErrorItem {
    excelRow: number;
    customerNumber: number;
    name: string;
    issueType:
        | 'NAMA_TIDAK_COCOK'
        | 'METER_AWAL_TIDAK_COCOK'
        | 'METER_AKHIR_INVALID'
        | 'DUPLIKASI_DATA'
        | 'KALKULASI_PEMAKAIAN_INVALID'
        | 'KALKULASI_TARIF_INVALID';
    excelValue: string;
    systemValue: string;
    message: string;
}

export type ImportProgress = {
    type: 'status' | 'progress' | 'complete' | 'error';
    message: string;
    percent?: number;
    current?: number;
    total?: number;
    currentName?: string;
    added?: number;
    newCustomers?: number;
    existingUpdated?: number;
    skipped?: number;
    failed?: number;
    errors?: ImportErrorItem[];
};

export function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ');
}

export function isSocialFacility(name: string): boolean {
    const clean = name.toLowerCase();
    return (
        clean.includes('masjid') ||
        clean.includes('mushola') ||
        clean.includes('musholla') ||
        clean.includes('makam') ||
        clean.includes('pos ronda')
    );
}

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function periodEnd(period: string) {
    const [year, month] = period.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0, 12, 0, 0, 0));
}

function periodName(period: string) {
    const [year, month] = period.split('-');
    return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
}

export async function validateCustomersExcelRows(
    rows: ParsedExcelRow[],
    period: string,
): Promise<ImportErrorItem[]> {
    const [config, allCustomers] = await Promise.all([
        getBillingConfig(),
        prisma.customer.findMany({
            select: {
                id: true,
                customerNumber: true,
                name: true,
                deletedAt: true,
                meterReadings: {
                    where: { deletedAt: null },
                    orderBy: { period: 'desc' },
                    select: {
                        id: true,
                        period: true,
                        meterStart: true,
                        meterEnd: true,
                        usage: true,
                    },
                },
            },
        }),
    ]);

    const activeCustomers = allCustomers.filter((c) => c.deletedAt === null);
    const byNumber = new Map(activeCustomers.map((c) => [c.customerNumber, c]));
    const byNormalizedName = new Map(activeCustomers.map((c) => [normalizeName(c.name), c]));

    const errors: ImportErrorItem[] = [];
    const seenNumbersInExcel = new Map<number, number>();
    const seenNamesInExcel = new Map<string, { excelRow: number; name: string }>();

    for (const row of rows) {
        const normName = normalizeName(row.name);

        // 1. Cek validitas angka meter (Meter Akhir >= Meter Awal)
        if (row.meterEnd < row.meterStart) {
            errors.push({
                excelRow: row.excelRow,
                customerNumber: row.customerNumber,
                name: row.name,
                issueType: 'METER_AKHIR_INVALID',
                excelValue: `Awal: ${row.meterStart} m³, Akhir: ${row.meterEnd} m³`,
                systemValue: '-',
                message: `Stand meter akhir (${row.meterEnd} m³) lebih kecil dari stand meter awal (${row.meterStart} m³).`,
            });
        }

        // 2. Cek duplikasi nomor di dalam file Excel
        if (seenNumbersInExcel.has(row.customerNumber)) {
            const firstRow = seenNumbersInExcel.get(row.customerNumber)!;
            errors.push({
                excelRow: row.excelRow,
                customerNumber: row.customerNumber,
                name: row.name,
                issueType: 'DUPLIKASI_DATA',
                excelValue: `No. Pelanggan ${row.customerNumber}`,
                systemValue: `Baris ${firstRow}`,
                message: `Nomor pelanggan ${row.customerNumber} muncul lebih dari satu kali di file Excel (pada baris ${firstRow} dan baris ${row.excelRow}).`,
            });
        } else {
            seenNumbersInExcel.set(row.customerNumber, row.excelRow);
        }

        // 3. Cek duplikasi nama di dalam file Excel
        if (seenNamesInExcel.has(normName)) {
            const prev = seenNamesInExcel.get(normName)!;
            errors.push({
                excelRow: row.excelRow,
                customerNumber: row.customerNumber,
                name: row.name,
                issueType: 'DUPLIKASI_DATA',
                excelValue: `Nama: "${row.name}"`,
                systemValue: `Baris ${prev.excelRow} ("${prev.name}")`,
                message: `Nama pelanggan '${row.name}' muncul lebih dari satu kali di file Excel (pada baris ${prev.excelRow} dan baris ${row.excelRow}).`,
            });
        } else {
            seenNamesInExcel.set(normName, { excelRow: row.excelRow, name: row.name });
        }

        // 4. Cek Validitas Pemakaian Air (JML = Meter Akhir - Meter Awal)
        const expectedUsage = Math.max(0, row.meterEnd - row.meterStart);
        if (row.usage !== expectedUsage) {
            errors.push({
                excelRow: row.excelRow,
                customerNumber: row.customerNumber,
                name: row.name,
                issueType: 'KALKULASI_PEMAKAIAN_INVALID',
                excelValue: `JML: ${row.usage} m³`,
                systemValue: `Akhir - Awal: ${expectedUsage} m³`,
                message: `Kolom JML di Excel (${row.usage} m³) tidak cocok dengan selisih stand meter akhir dan awal (${row.meterEnd} - ${row.meterStart} = ${expectedUsage} m³).`,
            });
        }

        // 5. Cek Pembagian Tarif Progresif (JML = K.I + K.II)
        const sumK1K2 = row.usageK1 + row.usageK2;
        if (row.usage !== sumK1K2) {
            errors.push({
                excelRow: row.excelRow,
                customerNumber: row.customerNumber,
                name: row.name,
                issueType: 'KALKULASI_PEMAKAIAN_INVALID',
                excelValue: `JML: ${row.usage} m³`,
                systemValue: `K.I + K.II: ${sumK1K2} m³`,
                message: `Kolom JML di Excel (${row.usage} m³) tidak cocok dengan penjumlahan K.I + K.II (${row.usageK1} + ${row.usageK2} = ${sumK1K2} m³).`,
            });
        }

        // 6. Cek Kesesuaian Nilai Rupiah (Kecuali Fasilitas Ibadah / Sosial)
        if (!isSocialFacility(row.name)) {
            const expectedK1Amount = row.usageK1 * config.RATE_K1;
            const expectedK2Amount = row.usageK2 * config.RATE_K2;
            const expectedTotal = config.ADMIN_FEE + expectedK1Amount + expectedK2Amount;
            if (row.totalAmount !== expectedTotal) {
                errors.push({
                    excelRow: row.excelRow,
                    customerNumber: row.customerNumber,
                    name: row.name,
                    issueType: 'KALKULASI_TARIF_INVALID',
                    excelValue: `Rp ${row.totalAmount.toLocaleString('id-ID')}`,
                    systemValue: `Rp ${expectedTotal.toLocaleString('id-ID')}`,
                    message: `Total tagihan di Excel (Rp ${row.totalAmount.toLocaleString('id-ID')}) tidak cocok dengan kalkulasi tarif sistem (Rp ${expectedTotal.toLocaleString('id-ID')} = Beban Rp ${config.ADMIN_FEE.toLocaleString('id-ID')} + K1 Rp ${expectedK1Amount.toLocaleString('id-ID')} + K2 Rp ${expectedK2Amount.toLocaleString('id-ID')}).`,
                });
            }
        }

        // 7. Verifikasi Nomor & Nama terhadap Database
        const existingCustomer = byNumber.get(row.customerNumber);
        if (existingCustomer) {
            if (normalizeName(existingCustomer.name) !== normName) {
                errors.push({
                    excelRow: row.excelRow,
                    customerNumber: row.customerNumber,
                    name: row.name,
                    issueType: 'NAMA_TIDAK_COCOK',
                    excelValue: `"${row.name}"`,
                    systemValue: `"${existingCustomer.name}"`,
                    message: `Nomor pelanggan ${row.customerNumber} di database terdaftar atas nama '${existingCustomer.name}', berbeda dengan '${row.name}' di Excel.`,
                });
            }

            // 8. Verifikasi Kontinuitas Stand Meter Air
            const prevReading = existingCustomer.meterReadings.find((r) => r.period < period);
            if (prevReading && row.meterStart !== prevReading.meterEnd) {
                errors.push({
                    excelRow: row.excelRow,
                    customerNumber: row.customerNumber,
                    name: row.name,
                    issueType: 'METER_AWAL_TIDAK_COCOK',
                    excelValue: `${row.meterStart} m³`,
                    systemValue: `${prevReading.meterEnd} m³ (Periode ${prevReading.period})`,
                    message: `Stand meter awal (${row.meterStart} m³) tidak cocok dengan meter akhir bulan sebelumnya (${prevReading.meterEnd} m³ pada periode ${prevReading.period}).`,
                });
            }
        } else {
            // Pelanggan baru: pastikan namanya belum terdaftar di nomor lain
            const nameOwner = byNormalizedName.get(normName);
            if (nameOwner && nameOwner.customerNumber !== row.customerNumber) {
                errors.push({
                    excelRow: row.excelRow,
                    customerNumber: row.customerNumber,
                    name: row.name,
                    issueType: 'DUPLIKASI_DATA',
                    excelValue: `No. ${row.customerNumber} ("${row.name}")`,
                    systemValue: `No. ${nameOwner.customerNumber} ("${nameOwner.name}")`,
                    message: `Nama '${row.name}' sudah terdaftar di sistem dengan nomor pelanggan yang berbeda (${nameOwner.customerNumber}).`,
                });
            }
        }
    }

    return errors;
}

export async function importChunkCustomers(
    rows: ParsedExcelRow[],
    period: string,
    isLastChunk: boolean = false,
) {
    if (rows.length === 0) {
        return { success: true, processed: 0, newCustomers: 0, existingUpdated: 0 };
    }

    const config = await getBillingConfig();
    const now = new Date();
    const expectedDesc = `Lunas: ${periodName(period)}`;
    const altDesc = `Pembayaran tagihan periode ${period}`;

    return prisma.$transaction(
        async (tx) => {
            // 1. Customers (Bulk lookup, createMany & bulk UPDATE)
            const customerNumbers = rows.map((r) => r.customerNumber);
            const existingCustomers = await tx.customer.findMany({
                where: { customerNumber: { in: customerNumbers } },
                select: { id: true, customerNumber: true, phone: true },
            });
            const existingByNumber = new Map(existingCustomers.map((c) => [c.customerNumber, c]));

            const customerIdByNumber = new Map<number, string>();
            const newCustomersToCreate: Array<{
                id: string;
                customerNumber: number;
                name: string;
                phone: string | null;
            }> = [];
            const existingCustomersToUpdate: Array<{
                id: string;
                name: string;
                phone: string | null;
            }> = [];

            for (const row of rows) {
                const existing = existingByNumber.get(row.customerNumber);
                if (existing) {
                    customerIdByNumber.set(row.customerNumber, existing.id);
                    existingCustomersToUpdate.push({
                        id: existing.id,
                        name: row.name,
                        phone: row.phone ?? existing.phone ?? null,
                    });
                } else {
                    const id = crypto.randomUUID();
                    customerIdByNumber.set(row.customerNumber, id);
                    newCustomersToCreate.push({
                        id,
                        customerNumber: row.customerNumber,
                        name: row.name,
                        phone: row.phone,
                    });
                }
            }

            if (newCustomersToCreate.length > 0) {
                await tx.customer.createMany({ data: newCustomersToCreate });
            }

            if (existingCustomersToUpdate.length > 0) {
                const values = Prisma.join(
                    existingCustomersToUpdate.map(
                        (c) => Prisma.sql`(${c.id}::uuid, ${c.name}::varchar, ${c.phone}::varchar)`,
                    ),
                );
                await tx.$executeRaw`
                    UPDATE customers AS c
                    SET deleted_at = NULL, name = v.name, phone = v.phone, updated_at = NOW()
                    FROM (VALUES ${values}) AS v(id, name, phone)
                    WHERE c.id = v.id
                `;
            }

            // 2. Meter Readings (Bulk lookup, createMany & bulk UPDATE)
            const allCustomerIds = Array.from(customerIdByNumber.values());
            const existingReadings = await tx.meterReading.findMany({
                where: { customerId: { in: allCustomerIds }, period },
                select: { id: true, customerId: true },
            });
            const readingByCustomerId = new Map(existingReadings.map((r) => [r.customerId, r.id]));

            const readingIdByCustomerId = new Map<string, string>();
            const newReadingsToCreate: Array<{
                id: string;
                customerId: string;
                period: string;
                meterStart: number;
                meterEnd: number;
                usage: number;
            }> = [];
            const existingReadingsToUpdate: Array<{
                id: string;
                meterStart: number;
                meterEnd: number;
                usage: number;
            }> = [];

            for (const row of rows) {
                const customerId = customerIdByNumber.get(row.customerNumber)!;
                const existingId = readingByCustomerId.get(customerId);
                if (existingId) {
                    readingIdByCustomerId.set(customerId, existingId);
                    existingReadingsToUpdate.push({
                        id: existingId,
                        meterStart: row.meterStart,
                        meterEnd: row.meterEnd,
                        usage: row.usage,
                    });
                } else {
                    const id = crypto.randomUUID();
                    readingIdByCustomerId.set(customerId, id);
                    newReadingsToCreate.push({
                        id,
                        customerId,
                        period,
                        meterStart: row.meterStart,
                        meterEnd: row.meterEnd,
                        usage: row.usage,
                    });
                }
            }

            if (newReadingsToCreate.length > 0) {
                await tx.meterReading.createMany({ data: newReadingsToCreate });
            }

            if (existingReadingsToUpdate.length > 0) {
                const values = Prisma.join(
                    existingReadingsToUpdate.map(
                        (r) =>
                            Prisma.sql`(${r.id}::uuid, ${r.meterStart}::int, ${r.meterEnd}::int, ${r.usage}::int)`,
                    ),
                );
                await tx.$executeRaw`
                    UPDATE meter_readings AS mr
                    SET deleted_at = NULL, meter_start = v.meter_start, meter_end = v.meter_end, usage = v.usage, updated_at = NOW()
                    FROM (VALUES ${values}) AS v(id, meter_start, meter_end, usage)
                    WHERE mr.id = v.id
                `;
            }

            // 3. Bills, BillItems & Payments (Bulk lookup, createMany & bulk UPDATE)
            const allReadingIds = Array.from(readingIdByCustomerId.values());
            const existingBills = await tx.bill.findMany({
                where: { meterReadingId: { in: allReadingIds } },
                select: { id: true, meterReadingId: true },
            });
            const billByReadingId = new Map(existingBills.map((b) => [b.meterReadingId, b.id]));

            const newBillsToCreate: Array<{
                id: string;
                meterReadingId: string;
                totalAmount: number;
                amountPaid: number;
                remaining: number;
                penalty: number;
                paymentStatus: string;
                paidAt: Date | null;
            }> = [];
            const existingBillsToUpdate: Array<{
                id: string;
                totalAmount: number;
                amountPaid: number;
                remaining: number;
                paymentStatus: string;
                paidAt: Date | null;
            }> = [];
            const allBillItems: Array<{
                billId: string;
                type: string;
                usage: number;
                rate: number;
                amount: number;
            }> = [];
            const allPaymentsToCreate: Array<{
                customerId: string;
                amount: number;
                description: string;
                createdAt: Date;
            }> = [];

            for (const row of rows) {
                const customerId = customerIdByNumber.get(row.customerNumber)!;
                const readingId = readingIdByCustomerId.get(customerId)!;
                const existingBillId = billByReadingId.get(readingId);

                const isPaid = !row.keterangan;
                const paidDate = isPaid ? periodEnd(period) : null;
                const amountPaid = isPaid ? row.totalAmount : 0;
                const remaining = isPaid ? 0 : row.totalAmount;
                const paymentStatus = isPaid ? 'PAID' : 'UNPAID';

                let billId: string;
                if (existingBillId) {
                    billId = existingBillId;
                    existingBillsToUpdate.push({
                        id: billId,
                        totalAmount: row.totalAmount,
                        amountPaid,
                        remaining,
                        paymentStatus,
                        paidAt: paidDate,
                    });
                } else {
                    billId = crypto.randomUUID();
                    newBillsToCreate.push({
                        id: billId,
                        meterReadingId: readingId,
                        totalAmount: row.totalAmount,
                        amountPaid,
                        remaining,
                        penalty: 0,
                        paymentStatus,
                        paidAt: paidDate,
                    });
                }

                allBillItems.push({
                    billId,
                    type: 'BEBAN',
                    usage: 0,
                    rate: row.beban,
                    amount: row.beban,
                });
                if (row.usageK1 > 0) {
                    allBillItems.push({
                        billId,
                        type: 'K1',
                        usage: row.usageK1,
                        rate: config.RATE_K1,
                        amount: row.beayaK1,
                    });
                }
                if (row.usageK2 > 0) {
                    allBillItems.push({
                        billId,
                        type: 'K2',
                        usage: row.usageK2,
                        rate: config.RATE_K2,
                        amount: row.beayaK2,
                    });
                }

                if (isPaid) {
                    allPaymentsToCreate.push({
                        customerId,
                        amount: row.totalAmount,
                        description: expectedDesc,
                        createdAt: paidDate!,
                    });
                }
            }

            if (newBillsToCreate.length > 0) {
                await tx.bill.createMany({ data: newBillsToCreate });
            }

            if (existingBillsToUpdate.length > 0) {
                const values = Prisma.join(
                    existingBillsToUpdate.map(
                        (b) =>
                            Prisma.sql`(${b.id}::uuid, ${b.totalAmount}::numeric, ${b.amountPaid}::numeric, ${b.remaining}::numeric, ${b.paymentStatus}::varchar, ${b.paidAt}::timestamp)`,
                    ),
                );
                await tx.$executeRaw`
                    UPDATE bills AS b
                    SET deleted_at = NULL, total_amount = v.total_amount, amount_paid = v.amount_paid, remaining = v.remaining, penalty = 0, payment_status = v.payment_status, paid_at = v.paid_at, updated_at = NOW()
                    FROM (VALUES ${values}) AS v(id, total_amount, amount_paid, remaining, payment_status, paid_at)
                    WHERE b.id = v.id
                `;
                await tx.billItem.updateMany({
                    where: { billId: { in: existingBillsToUpdate.map((b) => b.id) }, deletedAt: null },
                    data: { deletedAt: now },
                });
            }

            if (allBillItems.length > 0) {
                await tx.billItem.createMany({ data: allBillItems });
            }

            if (existingCustomersToUpdate.length > 0) {
                await tx.payment.updateMany({
                    where: {
                        customerId: { in: existingCustomersToUpdate.map((c) => c.id) },
                        deletedAt: null,
                        description: { in: [expectedDesc, altDesc] },
                    },
                    data: { deletedAt: now },
                });
            }

            if (allPaymentsToCreate.length > 0) {
                await tx.payment.createMany({ data: allPaymentsToCreate });
            }

            // 4. Recalculate customer totals in a single bulk SQL query
            if (allCustomerIds.length > 0) {
                const customerValues = Prisma.join(allCustomerIds.map((id) => Prisma.sql`(${id}::uuid)`));
                await tx.$executeRaw`
                    UPDATE customers AS c
                    SET
                        total_bill = COALESCE(agg.total_bill, 0),
                        total_paid = COALESCE(agg.total_paid, 0),
                        updated_at = NOW()
                    FROM (
                        SELECT
                            cid.id AS customer_id,
                            COALESCE(SUM(b.total_amount), 0) AS total_bill,
                            COALESCE(SUM(b.amount_paid), 0) AS total_paid
                        FROM (VALUES ${customerValues}) AS cid(id)
                        LEFT JOIN meter_readings mr
                            ON mr.customer_id = cid.id AND mr.deleted_at IS NULL
                        LEFT JOIN bills b
                            ON b.meter_reading_id = mr.id AND b.deleted_at IS NULL
                        GROUP BY cid.id
                    ) AS agg
                    WHERE c.id = agg.customer_id
                `;
            }

            if (isLastChunk) {
                await tx.audit_logs.create({
                    data: {
                        action: 'IMPORT',
                        entity_type: 'Customer',
                        performed_by: 'Admin',
                        description: `Completed final chunk import for period ${period}`,
                        details: { period, rowsInLastChunk: rows.length },
                    },
                });
            }

            return {
                success: true,
                processed: rows.length,
                newCustomers: newCustomersToCreate.length,
                existingUpdated: existingCustomersToUpdate.length,
            };
        },
        { maxWait: 15000, timeout: 30000 },
    );
}

export async function importCustomersFromExcel(
    rows: ParsedExcelRow[],
    period: string,
    onProgress: (progress: ImportProgress) => void,
) {
    onProgress({
        type: 'status',
        message: 'Memeriksa verifikasi 3 lapis data Excel...',
        percent: 10,
    });

    const errors = await validateCustomersExcelRows(rows, period);

    if (errors.length > 0) {
        onProgress({
            type: 'error',
            message: `Import dibatalkan: Ditemukan ${errors.length} data tidak cocok. Database tetap aman, tidak ada data yang tersimpan.`,
            total: rows.length,
            failed: errors.length,
            skipped: errors.length,
            errors,
        });

        return {
            total: rows.length,
            added: 0,
            newCustomers: 0,
            existingUpdated: 0,
            skipped: errors.length,
            failed: errors.length,
            errors,
        };
    }

    onProgress({
        type: 'status',
        message: `Verifikasi 3 lapis lolos untuk seluruh ${rows.length} baris. Menyimpan data ke database...`,
        percent: 25,
    });

    const CHUNK_SIZE = 30;
    let newCustomersCount = 0;
    let existingUpdatedCount = 0;

    try {
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const isLast = i + CHUNK_SIZE >= rows.length;
            const res = await importChunkCustomers(chunk, period, isLast);
            newCustomersCount += res.newCustomers;
            existingUpdatedCount += res.existingUpdated;

            const processed = Math.min(i + CHUNK_SIZE, rows.length);
            onProgress({
                type: 'progress',
                current: processed,
                total: rows.length,
                percent: Math.round(25 + (processed / rows.length) * 75),
                message: `Menyimpan data tagihan (${processed}/${rows.length})...`,
            });
        }
    } catch (dbError) {
        console.error('Import failed due to database error:', dbError);
        const systemError: ImportErrorItem = {
            excelRow: 0,
            customerNumber: 0,
            name: 'Database Transaction',
            issueType: 'DUPLIKASI_DATA',
            excelValue: '-',
            systemValue: '-',
            message: `Transaksi dibatalkan (Rollback): ${dbError instanceof Error ? dbError.message : 'Database error'}`,
        };
        onProgress({
            type: 'error',
            message: 'Terjadi kesalahan saat transaksi database. Database tetap aman.',
            total: rows.length,
            failed: rows.length,
            skipped: rows.length,
            errors: [systemError],
        });
        return {
            total: rows.length,
            added: 0,
            newCustomers: 0,
            existingUpdated: 0,
            skipped: rows.length,
            failed: rows.length,
            errors: [systemError],
        };
    }

    const totalSuccess = newCustomersCount + existingUpdatedCount;
    onProgress({
        type: 'complete',
        message: `Import berhasil! Seluruh ${totalSuccess} data tagihan tersimpan dengan aman.`,
        percent: 100,
        total: rows.length,
        added: totalSuccess,
        newCustomers: newCustomersCount,
        existingUpdated: existingUpdatedCount,
        skipped: 0,
        failed: 0,
        errors: [],
    });

    return {
        total: rows.length,
        added: totalSuccess,
        newCustomers: newCustomersCount,
        existingUpdated: existingUpdatedCount,
        skipped: 0,
        failed: 0,
        errors: [],
    };
}
