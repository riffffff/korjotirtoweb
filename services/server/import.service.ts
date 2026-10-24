import prisma from '@/lib/prisma';
import type { ParsedExcelRow } from '@/lib/excel-parser';

export type ImportProgress = {
    type: 'status' | 'progress' | 'complete';
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
};

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function periodEnd(period: string) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month, 0, 12, 0, 0, 0);
}

async function createBill(
    tx: TransactionClient,
    customerId: string,
    period: string,
    row: ParsedExcelRow,
) {
    const isPaid = !row.keterangan;
    const bill = await tx.bill.create({
        data: {
            meterReading: {
                create: {
                    customerId,
                    period,
                    meterStart: row.meterStart,
                    meterEnd: row.meterEnd,
                    usage: row.usage,
                },
            },
            totalAmount: row.totalAmount,
            amountPaid: isPaid ? row.totalAmount : 0,
            remaining: isPaid ? 0 : row.totalAmount,
            paymentStatus: isPaid ? 'PAID' : 'UNPAID',
            paidAt: isPaid ? periodEnd(period) : null,
        },
    });

    const items = [
        { type: 'BEBAN', usage: 0, rate: row.beban, amount: row.beban },
        ...(row.usageK1 > 0 ? [{ type: 'K1', usage: row.usageK1, rate: 1800, amount: row.beayaK1 }] : []),
        ...(row.usageK2 > 0 ? [{ type: 'K2', usage: row.usageK2, rate: 3000, amount: row.beayaK2 }] : []),
    ];
    await tx.billItem.createMany({ data: items.map((item) => ({ ...item, billId: bill.id })) });
    await tx.customer.update({
        where: { id: customerId },
        data: {
            totalBill: { increment: row.totalAmount },
            ...(isPaid ? { totalPaid: { increment: row.totalAmount } } : {}),
        },
    });
    return bill;
}

export async function importCustomersFromExcel(
    rows: ParsedExcelRow[],
    period: string,
    onProgress: (progress: ImportProgress) => void,
) {
    const existingCustomers = await prisma.customer.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            name: true,
            meterReadings: {
                where: { period },
                select: {
                    id: true,
                    deletedAt: true,
                    bill: {
                        select: {
                            id: true,
                            totalAmount: true,
                            amountPaid: true,
                            paymentStatus: true,
                        },
                    },
                },
            },
        },
    });
    const byName = new Map(existingCustomers.map((customer) => [customer.name.toLowerCase(), customer]));
    const newRows: ParsedExcelRow[] = [];
    const addRows: Array<{ row: ParsedExcelRow; customerId: string }> = [];
    const overwriteRows: Array<{ row: ParsedExcelRow; customerId: string; readingId: string; billId?: string }> = [];

    for (const row of rows) {
        const customer = byName.get(row.name.toLowerCase());
        if (!customer) {
            newRows.push(row);
            continue;
        }
        const reading = customer.meterReadings[0];
        if (reading) {
            overwriteRows.push({ row, customerId: customer.id, readingId: reading.id, billId: reading.bill?.id });
        } else {
            addRows.push({ row, customerId: customer.id });
        }
    }

    onProgress({
        type: 'status',
        message: `${newRows.length} baru, ${addRows.length} tambah tagihan, ${overwriteRows.length} overwrite`,
        percent: 20,
    });

    const total = newRows.length + addRows.length + overwriteRows.length;
    let processed = 0;
    let newCustomers = 0;
    let existingUpdated = 0;
    let overwritten = 0;
    let failed = 0;
    const process = async (name: string, action: () => Promise<void>) => {
        processed++;
        onProgress({
            type: 'progress',
            current: processed,
            total,
            percent: total ? Math.round(20 + (processed / total) * 75) : 95,
            currentName: name,
            message: `Memproses: ${name}...`,
        });
        try {
            await action();
            return true;
        } catch (error) {
            console.error(`Failed to import customer ${name}:`, error);
            failed++;
            return false;
        }
    };

    const maxNumber = await prisma.customer.aggregate({ _max: { customerNumber: true } });
    let nextCustomerNumber = (maxNumber._max.customerNumber || 0) + 1;

    for (const row of newRows) {
        if (await process(row.name, async () => {
            await prisma.$transaction(async (tx) => {
                const customer = await tx.customer.create({
                    data: { customerNumber: nextCustomerNumber++, name: row.name, phone: row.phone },
                });
                await createBill(tx, customer.id, period, row);
            });
        })) newCustomers++;
    }
    for (const { row, customerId } of addRows) {
        if (await process(row.name, async () => {
            await prisma.$transaction(async (tx) => {
                await tx.customer.update({ where: { id: customerId }, data: { phone: row.phone || undefined } });
                await createBill(tx, customerId, period, row);
            });
        })) existingUpdated++;
    }
    for (const { row, customerId, readingId, billId } of overwriteRows) {
        if (await process(row.name, async () => {
            await prisma.$transaction(async (tx) => {
                if (billId) {
                    await tx.billItem.updateMany({ where: { billId, deletedAt: null }, data: { deletedAt: new Date() } });
                    await tx.bill.update({ where: { id: billId }, data: { deletedAt: new Date() } });
                }
                await tx.meterReading.update({ where: { id: readingId }, data: { deletedAt: new Date() } });
                await createBill(tx, customerId, period, row);
            });
        })) overwritten++;
    }

    await prisma.audit_logs.create({
        data: {
            action: 'IMPORT',
            entity_type: 'Customer',
            performed_by: 'Admin',
            description: `Imported ${rows.length} rows for period ${period}`,
            details: { period, newCustomers, existingUpdated, overwritten, failed },
        },
    });
    return { total: rows.length, added: newCustomers + existingUpdated + overwritten, newCustomers, existingUpdated: existingUpdated + overwritten, skipped: 0, failed };
}
