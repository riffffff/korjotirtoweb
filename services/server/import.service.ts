import prisma from '@/lib/prisma';
import type { ParsedExcelRow } from '@/lib/excel-parser';
import type { BillingConfig } from '@/lib/billing';
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

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

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

async function upsertBillAndPayment(
    tx: TransactionClient,
    customerId: string,
    period: string,
    row: ParsedExcelRow,
    config: BillingConfig,
) {
    const isPaid = !row.keterangan;
    const paidDate = isPaid ? periodEnd(period) : null;

    const reading = await tx.meterReading.upsert({
        where: { customerId_period: { customerId, period } },
        update: {
            deletedAt: null,
            meterStart: row.meterStart,
            meterEnd: row.meterEnd,
            usage: row.usage,
        },
        create: {
            customerId,
            period,
            meterStart: row.meterStart,
            meterEnd: row.meterEnd,
            usage: row.usage,
        },
    });

    const bill = await tx.bill.upsert({
        where: { meterReadingId: reading.id },
        update: {
            deletedAt: null,
            totalAmount: row.totalAmount,
            amountPaid: isPaid ? row.totalAmount : 0,
            remaining: isPaid ? 0 : row.totalAmount,
            penalty: 0,
            paymentStatus: isPaid ? 'PAID' : 'UNPAID',
            paidAt: paidDate,
        },
        create: {
            meterReadingId: reading.id,
            totalAmount: row.totalAmount,
            amountPaid: isPaid ? row.totalAmount : 0,
            remaining: isPaid ? 0 : row.totalAmount,
            penalty: 0,
            paymentStatus: isPaid ? 'PAID' : 'UNPAID',
            paidAt: paidDate,
        },
    });

    await tx.billItem.updateMany({
        where: { billId: bill.id, deletedAt: null },
        data: { deletedAt: new Date() },
    });

    const items = [
        { type: 'BEBAN', usage: 0, rate: row.beban, amount: row.beban },
        ...(row.usageK1 > 0
            ? [{ type: 'K1', usage: row.usageK1, rate: config.RATE_K1, amount: row.beayaK1 }]
            : []),
        ...(row.usageK2 > 0
            ? [{ type: 'K2', usage: row.usageK2, rate: config.RATE_K2, amount: row.beayaK2 }]
            : []),
    ];
    await tx.billItem.createMany({
        data: items.map((item) => ({ ...item, billId: bill.id })),
    });

    // Sync payment receipt in `payments` table for this period
    const expectedDesc = `Lunas: ${periodName(period)}`;
    const altDesc = `Pembayaran tagihan periode ${period}`;
    await tx.payment.updateMany({
        where: {
            customerId,
            deletedAt: null,
            description: { in: [expectedDesc, altDesc] },
        },
        data: { deletedAt: new Date() },
    });

    if (isPaid) {
        await tx.payment.create({
            data: {
                customerId,
                amount: row.totalAmount,
                description: expectedDesc,
                createdAt: paidDate!,
            },
        });
    }

    // Recalculate customer totalBill & totalPaid accurately from all active bills
    const activeBills = await tx.bill.findMany({
        where: {
            deletedAt: null,
            meterReading: { customerId, deletedAt: null },
        },
        select: { totalAmount: true, amountPaid: true },
    });

    await tx.customer.update({
        where: { id: customerId },
        data: {
            totalBill: activeBills.reduce((sum, item) => sum + Number(item.totalAmount), 0),
            totalPaid: activeBills.reduce((sum, item) => sum + Number(item.amountPaid), 0),
        },
    });

    return bill;
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
    const config = await getBillingConfig();
    const now = new Date();
    const expectedDesc = `Lunas: ${periodName(period)}`;
    const altDesc = `Pembayaran tagihan periode ${period}`;

    return prisma.$transaction(
        async (tx) => {
            const customerNumbers = rows.map((r) => r.customerNumber);
            const existingCustomers = await tx.customer.findMany({
                where: { customerNumber: { in: customerNumbers } },
                select: { id: true, customerNumber: true, deletedAt: true },
            });
            const existingByNumber = new Map(existingCustomers.map((c) => [c.customerNumber, c]));
            const customerIdByNumber = new Map<number, string>();

            for (const row of rows) {
                const existing = existingByNumber.get(row.customerNumber);
                if (existing) {
                    await tx.customer.update({
                        where: { id: existing.id },
                        data: {
                            deletedAt: null,
                            name: row.name,
                            ...(row.phone ? { phone: row.phone } : {}),
                        },
                    });
                    customerIdByNumber.set(row.customerNumber, existing.id);
                } else {
                    const newCust = await tx.customer.create({
                        data: {
                            customerNumber: row.customerNumber,
                            name: row.name,
                            phone: row.phone,
                        },
                    });
                    customerIdByNumber.set(row.customerNumber, newCust.id);
                }
            }

            const allBillIds: string[] = [];
            const allBillItems: Array<{ billId: string; type: string; usage: number; rate: number; amount: number }> = [];
            const allPaymentsToCreate: Array<{ customerId: string; amount: number; description: string; createdAt: Date }> = [];
            const allCustomerIds = Array.from(customerIdByNumber.values());

            for (const row of rows) {
                const customerId = customerIdByNumber.get(row.customerNumber)!;
                const isPaid = !row.keterangan;
                const paidDate = isPaid ? periodEnd(period) : null;

                const reading = await tx.meterReading.upsert({
                    where: { customerId_period: { customerId, period } },
                    update: {
                        deletedAt: null,
                        meterStart: row.meterStart,
                        meterEnd: row.meterEnd,
                        usage: row.usage,
                    },
                    create: {
                        customerId,
                        period,
                        meterStart: row.meterStart,
                        meterEnd: row.meterEnd,
                        usage: row.usage,
                    },
                });

                const bill = await tx.bill.upsert({
                    where: { meterReadingId: reading.id },
                    update: {
                        deletedAt: null,
                        totalAmount: row.totalAmount,
                        amountPaid: isPaid ? row.totalAmount : 0,
                        remaining: isPaid ? 0 : row.totalAmount,
                        penalty: 0,
                        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
                        paidAt: paidDate,
                    },
                    create: {
                        meterReadingId: reading.id,
                        totalAmount: row.totalAmount,
                        amountPaid: isPaid ? row.totalAmount : 0,
                        remaining: isPaid ? 0 : row.totalAmount,
                        penalty: 0,
                        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
                        paidAt: paidDate,
                    },
                });

                allBillIds.push(bill.id);

                allBillItems.push({
                    billId: bill.id,
                    type: 'BEBAN',
                    usage: 0,
                    rate: row.beban,
                    amount: row.beban,
                });
                if (row.usageK1 > 0) {
                    allBillItems.push({
                        billId: bill.id,
                        type: 'K1',
                        usage: row.usageK1,
                        rate: config.RATE_K1,
                        amount: row.beayaK1,
                    });
                }
                if (row.usageK2 > 0) {
                    allBillItems.push({
                        billId: bill.id,
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

            if (allBillIds.length > 0) {
                await tx.billItem.updateMany({
                    where: { billId: { in: allBillIds }, deletedAt: null },
                    data: { deletedAt: now },
                });
                if (allBillItems.length > 0) {
                    await tx.billItem.createMany({ data: allBillItems });
                }
            }

            if (allCustomerIds.length > 0) {
                await tx.payment.updateMany({
                    where: {
                        customerId: { in: allCustomerIds },
                        deletedAt: null,
                        description: { in: [expectedDesc, altDesc] },
                    },
                    data: { deletedAt: now },
                });
                if (allPaymentsToCreate.length > 0) {
                    await tx.payment.createMany({ data: allPaymentsToCreate });
                }
            }

            // Recalculate customer totals for this chunk
            const allActiveBills = await tx.bill.findMany({
                where: {
                    deletedAt: null,
                    meterReading: { customerId: { in: allCustomerIds }, deletedAt: null },
                },
                select: {
                    totalAmount: true,
                    amountPaid: true,
                    meterReading: { select: { customerId: true } },
                },
            });

            const totalsByCustomer = new Map<string, { totalBill: number; totalPaid: number }>();
            for (const customerId of allCustomerIds) {
                totalsByCustomer.set(customerId, { totalBill: 0, totalPaid: 0 });
            }
            for (const bill of allActiveBills) {
                const entry = totalsByCustomer.get(bill.meterReading.customerId);
                if (entry) {
                    entry.totalBill += Number(bill.totalAmount);
                    entry.totalPaid += Number(bill.amountPaid);
                }
            }

            await Promise.all(
                allCustomerIds.map((customerId) => {
                    const totals = totalsByCustomer.get(customerId)!;
                    return tx.customer.update({
                        where: { id: customerId },
                        data: {
                            totalBill: totals.totalBill,
                            totalPaid: totals.totalPaid,
                        },
                    });
                }),
            );

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

            return { success: true, processed: rows.length };
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
    const deletedCustomers = allCustomers.filter((c) => c.deletedAt !== null);

    const byNumber = new Map(activeCustomers.map((c) => [c.customerNumber, c]));
    const byNormalizedName = new Map(activeCustomers.map((c) => [normalizeName(c.name), c]));
    const deletedByNumber = new Map(deletedCustomers.map((c) => [c.customerNumber, c]));

    // ========================================================
    // FASE 1: PRE-VALIDATION SCAN (Verifikasi 3 Lapis)
    // ========================================================
    const errors: ImportErrorItem[] = [];
    const seenNumbersInExcel = new Map<number, number>(); // customerNumber -> excelRow
    const seenNamesInExcel = new Map<string, { excelRow: number; name: string }>(); // normName -> info

    for (const row of rows) {
        const normName = normalizeName(row.name);

        // 1. Cek validitas angka meter (Meter Akhir tidak boleh lebih kecil dari Meter Awal)
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

        // 2. Cek duplikasi nomor di dalam file Excel itu sendiri
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

        // 3. Cek duplikasi nama di dalam file Excel itu sendiri
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

        // 6. Cek Kesesuaian Nilai Rupiah (Kecuali Tempat Ibadah / Fasilitas Sosial)
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

        // 7. Verifikasi Lapis 1 & 2: Nomor & Nama terhadap Database
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

            // 8. Verifikasi Lapis 3: Kontinuitas Stand Meter Air
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

    // ========================================================
    // ATOMIC GUARANTEE: Jika ada >= 1 error, BATALKAN TOTAL!
    // ========================================================
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

    // ========================================================
    // FASE 2: ATOMIC DATABASE TRANSACTION (All-or-Nothing Batching)
    // ========================================================
    onProgress({
        type: 'status',
        message: `Verifikasi 3 lapis lolos untuk seluruh ${rows.length} baris. Menyimpan data ke database...`,
        percent: 25,
    });

    let newCustomersCount = 0;
    let existingUpdatedCount = 0;
    let overwrittenCount = 0;

    const CHUNK_SIZE = 35;
    const now = new Date();
    const expectedDesc = `Lunas: ${periodName(period)}`;
    const altDesc = `Pembayaran tagihan periode ${period}`;

    try {
        await prisma.$transaction(
            async (tx) => {
                // 1. Process Customers (Create / Restore / Update) in parallel chunks
                const customerIdByNumber = new Map<number, string>();

                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);
                    await Promise.all(
                        chunk.map(async (row) => {
                            const existingCustomer = byNumber.get(row.customerNumber);
                            if (existingCustomer) {
                                await tx.customer.update({
                                    where: { id: existingCustomer.id },
                                    data: {
                                        name: row.name,
                                        ...(row.phone ? { phone: row.phone } : {}),
                                    },
                                });
                                customerIdByNumber.set(row.customerNumber, existingCustomer.id);
                                const hadReading = existingCustomer.meterReadings.some((r) => r.period === period);
                                if (hadReading) {
                                    overwrittenCount++;
                                } else {
                                    existingUpdatedCount++;
                                }
                            } else {
                                const softDeleted = deletedByNumber.get(row.customerNumber);
                                const customer = softDeleted
                                    ? await tx.customer.update({
                                          where: { id: softDeleted.id },
                                          data: {
                                              deletedAt: null,
                                              name: row.name,
                                              phone: row.phone,
                                              totalBill: 0,
                                              totalPaid: 0,
                                          },
                                      })
                                    : await tx.customer.create({
                                          data: {
                                              customerNumber: row.customerNumber,
                                              name: row.name,
                                              phone: row.phone,
                                          },
                                      });

                                if (softDeleted) {
                                    deletedByNumber.delete(row.customerNumber);
                                }
                                customerIdByNumber.set(row.customerNumber, customer.id);
                                newCustomersCount++;
                            }
                        }),
                    );

                    onProgress({
                        type: 'progress',
                        current: Math.min(i + CHUNK_SIZE, rows.length),
                        total: rows.length,
                        percent: Math.round(25 + ((i + CHUNK_SIZE) / rows.length) * 30),
                        message: `Menyiapkan pelanggan (${Math.min(i + CHUNK_SIZE, rows.length)}/${rows.length})...`,
                    });
                }

                // 2. Process MeterReadings & Bills in parallel chunks
                const allBillIds: string[] = [];
                const allBillItems: Array<{ billId: string; type: string; usage: number; rate: number; amount: number }> = [];
                const allPaymentsToCreate: Array<{ customerId: string; amount: number; description: string; createdAt: Date }> = [];
                const allCustomerIds = Array.from(customerIdByNumber.values());

                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);
                    const chunkResults = await Promise.all(
                        chunk.map(async (row) => {
                            const customerId = customerIdByNumber.get(row.customerNumber)!;
                            const isPaid = !row.keterangan;
                            const paidDate = isPaid ? periodEnd(period) : null;

                            const reading = await tx.meterReading.upsert({
                                where: { customerId_period: { customerId, period } },
                                update: {
                                    deletedAt: null,
                                    meterStart: row.meterStart,
                                    meterEnd: row.meterEnd,
                                    usage: row.usage,
                                },
                                create: {
                                    customerId,
                                    period,
                                    meterStart: row.meterStart,
                                    meterEnd: row.meterEnd,
                                    usage: row.usage,
                                },
                            });

                            const bill = await tx.bill.upsert({
                                where: { meterReadingId: reading.id },
                                update: {
                                    deletedAt: null,
                                    totalAmount: row.totalAmount,
                                    amountPaid: isPaid ? row.totalAmount : 0,
                                    remaining: isPaid ? 0 : row.totalAmount,
                                    penalty: 0,
                                    paymentStatus: isPaid ? 'PAID' : 'UNPAID',
                                    paidAt: paidDate,
                                },
                                create: {
                                    meterReadingId: reading.id,
                                    totalAmount: row.totalAmount,
                                    amountPaid: isPaid ? row.totalAmount : 0,
                                    remaining: isPaid ? 0 : row.totalAmount,
                                    penalty: 0,
                                    paymentStatus: isPaid ? 'PAID' : 'UNPAID',
                                    paidAt: paidDate,
                                },
                            });

                            return { billId: bill.id, customerId, row, isPaid, paidDate };
                        }),
                    );

                    for (const item of chunkResults) {
                        allBillIds.push(item.billId);

                        allBillItems.push({
                            billId: item.billId,
                            type: 'BEBAN',
                            usage: 0,
                            rate: item.row.beban,
                            amount: item.row.beban,
                        });
                        if (item.row.usageK1 > 0) {
                            allBillItems.push({
                                billId: item.billId,
                                type: 'K1',
                                usage: item.row.usageK1,
                                rate: config.RATE_K1,
                                amount: item.row.beayaK1,
                            });
                        }
                        if (item.row.usageK2 > 0) {
                            allBillItems.push({
                                billId: item.billId,
                                type: 'K2',
                                usage: item.row.usageK2,
                                rate: config.RATE_K2,
                                amount: item.row.beayaK2,
                            });
                        }

                        if (item.isPaid) {
                            allPaymentsToCreate.push({
                                customerId: item.customerId,
                                amount: item.row.totalAmount,
                                description: expectedDesc,
                                createdAt: item.paidDate!,
                            });
                        }
                    }

                    onProgress({
                        type: 'progress',
                        current: Math.min(i + CHUNK_SIZE, rows.length),
                        total: rows.length,
                        percent: Math.round(55 + ((i + CHUNK_SIZE) / rows.length) * 30),
                        message: `Menyimpan tagihan & meteran (${Math.min(i + CHUNK_SIZE, rows.length)}/${rows.length})...`,
                    });
                }

                // 3. Batch BillItems: Soft-delete old items and insert all new in batch
                if (allBillIds.length > 0) {
                    await tx.billItem.updateMany({
                        where: { billId: { in: allBillIds }, deletedAt: null },
                        data: { deletedAt: now },
                    });
                    if (allBillItems.length > 0) {
                        await tx.billItem.createMany({ data: allBillItems });
                    }
                }

                // 4. Batch Payments: Soft-delete old receipts for this period and insert all new in batch
                if (allCustomerIds.length > 0) {
                    await tx.payment.updateMany({
                        where: {
                            customerId: { in: allCustomerIds },
                            deletedAt: null,
                            description: { in: [expectedDesc, altDesc] },
                        },
                        data: { deletedAt: now },
                    });
                    if (allPaymentsToCreate.length > 0) {
                        await tx.payment.createMany({ data: allPaymentsToCreate });
                    }
                }

                // 5. Batch Customer Totals: Aggregate and update
                const allActiveBills = await tx.bill.findMany({
                    where: {
                        deletedAt: null,
                        meterReading: { customerId: { in: allCustomerIds }, deletedAt: null },
                    },
                    select: {
                        totalAmount: true,
                        amountPaid: true,
                        meterReading: { select: { customerId: true } },
                    },
                });

                const totalsByCustomer = new Map<string, { totalBill: number; totalPaid: number }>();
                for (const customerId of allCustomerIds) {
                    totalsByCustomer.set(customerId, { totalBill: 0, totalPaid: 0 });
                }
                for (const bill of allActiveBills) {
                    const entry = totalsByCustomer.get(bill.meterReading.customerId);
                    if (entry) {
                        entry.totalBill += Number(bill.totalAmount);
                        entry.totalPaid += Number(bill.amountPaid);
                    }
                }

                for (let i = 0; i < allCustomerIds.length; i += CHUNK_SIZE) {
                    const chunkCustomerIds = allCustomerIds.slice(i, i + CHUNK_SIZE);
                    await Promise.all(
                        chunkCustomerIds.map((customerId) => {
                            const totals = totalsByCustomer.get(customerId)!;
                            return tx.customer.update({
                                where: { id: customerId },
                                data: {
                                    totalBill: totals.totalBill,
                                    totalPaid: totals.totalPaid,
                                },
                            });
                        }),
                    );
                }

                // 6. Audit log
                await tx.audit_logs.create({
                    data: {
                        action: 'IMPORT',
                        entity_type: 'Customer',
                        performed_by: 'Admin',
                        description: `Imported ${rows.length} rows for period ${period}`,
                        details: {
                            period,
                            newCustomers: newCustomersCount,
                            existingUpdated: existingUpdatedCount,
                            overwritten: overwrittenCount,
                        },
                    },
                });
            },
            { maxWait: 30000, timeout: 180000 },
        );
    } catch (dbError) {
        console.error('Transaction rollback due to database error:', dbError);
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
            message: `Terjadi kesalahan saat transaksi database. Seluruh perubahan dibatalkan (Rollback). Database tetap aman.`,
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

    const totalSuccess = newCustomersCount + existingUpdatedCount + overwrittenCount;
    onProgress({
        type: 'complete',
        message: `Import berhasil! Seluruh ${totalSuccess} data tagihan tersimpan dengan aman.`,
        percent: 100,
        total: rows.length,
        added: totalSuccess,
        newCustomers: newCustomersCount,
        existingUpdated: existingUpdatedCount + overwrittenCount,
        skipped: 0,
        failed: 0,
        errors: [],
    });

    return {
        total: rows.length,
        added: totalSuccess,
        newCustomers: newCustomersCount,
        existingUpdated: existingUpdatedCount + overwrittenCount,
        skipped: 0,
        failed: 0,
        errors: [],
    };
}
