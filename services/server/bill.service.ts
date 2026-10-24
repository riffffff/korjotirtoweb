import prisma from '@/lib/prisma';
import { calculateWaterBill } from '@/lib/billing';
import { getBillingConfig } from './setting.service';

export async function createSingleCustomerBill(
    customerId: string,
    period: string,
    meterEnd: number,
    meterStartInput?: number,
) {
    const config = await getBillingConfig();
    return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
        if (!customer) throw new Error('Customer not found');

        const existing = await tx.meterReading.findUnique({
            where: { customerId_period: { customerId, period } },
        });
        if (existing?.deletedAt) {
            const meterStart = meterStartInput ?? existing.meterStart;
            const calculation = calculateWaterBill(meterStart, meterEnd, config);
            const meterReading = await tx.meterReading.update({
                where: { id: existing.id },
                data: { deletedAt: null, meterStart, meterEnd, usage: calculation.usage },
            });
            const bill = await tx.bill.findUnique({ where: { meterReadingId: existing.id } });
            if (!bill) throw new Error('Bill record missing for soft-deleted meter reading');
            await tx.bill.update({
                where: { id: bill.id },
                data: {
                    deletedAt: null,
                    totalAmount: calculation.totalAmount,
                    amountPaid: 0,
                    remaining: calculation.totalAmount,
                    paymentStatus: 'UNPAID',
                },
            });
            await tx.billItem.updateMany({
                where: { billId: bill.id, deletedAt: null },
                data: { deletedAt: new Date() },
            });
            await tx.billItem.createMany({
                data: calculation.items.map((item) => ({ ...item, billId: bill.id })),
            });
            const activeBills = await tx.bill.findMany({
                where: { deletedAt: null, meterReading: { customerId, deletedAt: null } },
                select: { totalAmount: true, amountPaid: true },
            });
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    totalBill: activeBills.reduce((sum, item) => sum + Number(item.totalAmount), 0),
                    totalPaid: activeBills.reduce((sum, item) => sum + Number(item.amountPaid), 0),
                },
            });
            return { bill, meterReading, calculation };
        }
        if (existing) throw new Error('Tagihan untuk periode ini sudah ada');

        const previous = await tx.meterReading.findFirst({
            where: { customerId, deletedAt: null },
            orderBy: { period: 'desc' },
        });
        const meterStart = previous?.meterEnd ?? meterStartInput;
        if (meterStart === undefined) throw new Error('Meter awal wajib diisi untuk tagihan pertama');
        const calculation = calculateWaterBill(meterStart, meterEnd, config);
        const meterReading = await tx.meterReading.create({
            data: { customerId, period, meterStart, meterEnd, usage: calculation.usage },
        });
        const bill = await tx.bill.create({
            data: {
                meterReadingId: meterReading.id,
                totalAmount: calculation.totalAmount,
                remaining: calculation.totalAmount,
                paymentStatus: 'UNPAID',
                items: { create: calculation.items },
            },
        });
        await tx.customer.update({
            where: { id: customerId },
            data: { totalBill: { increment: calculation.totalAmount } },
        });
        return { bill, meterReading, calculation };
    });
}

export async function softDeleteBill(billId: string) {
    return prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findFirst({
            where: { id: billId, deletedAt: null },
            include: { meterReading: true },
        });
        if (!bill) throw new Error('Bill not found');
        await tx.billItem.updateMany({ where: { billId, deletedAt: null }, data: { deletedAt: new Date() } });
        await tx.bill.update({ where: { id: billId }, data: { deletedAt: new Date() } });
        await tx.meterReading.update({ where: { id: bill.meterReadingId }, data: { deletedAt: new Date() } });
        const activeBills = await tx.bill.findMany({
            where: { deletedAt: null, meterReading: { customerId: bill.meterReading.customerId, deletedAt: null } },
            select: { totalAmount: true, amountPaid: true },
        });
        await tx.customer.update({
            where: { id: bill.meterReading.customerId },
            data: {
                totalBill: activeBills.reduce((sum, item) => sum + Number(item.totalAmount), 0),
                totalPaid: activeBills.reduce((sum, item) => sum + Number(item.amountPaid), 0),
            },
        });
        return bill;
    });
}

export async function createBulkBillsForPeriod(period: string) {
    const config = await getBillingConfig();
    const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        include: {
            meterReadings: {
                where: { period: { not: period }, deletedAt: null },
                orderBy: { period: 'desc' },
                take: 1,
            },
        },
    });
    let billsCreated = 0;
    const skippedCustomers: string[] = [];

    for (const customer of customers) {
        const existing = await prisma.meterReading.findUnique({
            where: { customerId_period: { customerId: customer.id, period } },
        });
        if (existing && !existing.deletedAt) {
            skippedCustomers.push(`${customer.name} (sudah ada tagihan)`);
            continue;
        }
        const previous = customer.meterReadings[0];
        if (!previous) {
            skippedCustomers.push(`${customer.name} (tidak ada data meter bulan lalu)`);
            continue;
        }
        const meterStart = previous.meterEnd;
        const meterEnd = meterStart + previous.usage;
        const calculation = calculateWaterBill(meterStart, meterEnd, config);

        await prisma.$transaction(async (tx) => {
            const reading = existing
                ? await tx.meterReading.update({
                    where: { id: existing.id },
                    data: {
                        deletedAt: null,
                        meterStart,
                        meterEnd,
                        usage: calculation.usage,
                    },
                })
                : await tx.meterReading.create({
                    data: { customerId: customer.id, period, meterStart, meterEnd, usage: calculation.usage },
                });
            const bill = await tx.bill.upsert({
                where: { meterReadingId: reading.id },
                update: {
                    deletedAt: null,
                    totalAmount: calculation.totalAmount,
                    amountPaid: 0,
                    remaining: calculation.totalAmount,
                    paymentStatus: 'UNPAID',
                },
                create: {
                    meterReadingId: reading.id,
                    totalAmount: calculation.totalAmount,
                    remaining: calculation.totalAmount,
                    paymentStatus: 'UNPAID',
                },
            });
            await tx.billItem.updateMany({ where: { billId: bill.id, deletedAt: null }, data: { deletedAt: new Date() } });
            await tx.billItem.createMany({ data: calculation.items.map((item) => ({ ...item, billId: bill.id })) });
            const activeBills = await tx.bill.findMany({
                where: { deletedAt: null, meterReading: { customerId: customer.id, deletedAt: null } },
                select: { totalAmount: true, amountPaid: true },
            });
            await tx.customer.update({
                where: { id: customer.id },
                data: {
                    totalBill: activeBills.reduce((sum, item) => sum + Number(item.totalAmount), 0),
                    totalPaid: activeBills.reduce((sum, item) => sum + Number(item.amountPaid), 0),
                },
            });
        });
        billsCreated++;
    }

    await prisma.audit_logs.create({
        data: {
            action: 'BULK_CREATE',
            entity_type: 'Bill',
            performed_by: 'Admin',
            description: `Created ${billsCreated} bills for period ${period}`,
            details: { period, billsCreated, skippedCount: skippedCustomers.length },
        },
    });
    return { billsCreated, skippedCustomers };
}

export async function softDeleteBillsByPeriod(period: string) {
    return prisma.$transaction(async (tx) => {
        const bills = await tx.bill.findMany({
            where: { deletedAt: null, meterReading: { period, deletedAt: null } },
            include: { meterReading: true },
        });
        const customerIds = [...new Set(bills.map((bill) => bill.meterReading.customerId))];
        const deletedAt = new Date();
        for (const bill of bills) {
            await tx.billItem.updateMany({ where: { billId: bill.id, deletedAt: null }, data: { deletedAt } });
            await tx.bill.update({ where: { id: bill.id }, data: { deletedAt } });
            await tx.meterReading.update({ where: { id: bill.meterReadingId }, data: { deletedAt } });
        }

        for (const customerId of customerIds) {
            const activeBills = await tx.bill.findMany({
                where: { deletedAt: null, meterReading: { customerId, deletedAt: null } },
                select: { totalAmount: true, amountPaid: true },
            });
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    totalBill: activeBills.reduce((sum, item) => sum + Number(item.totalAmount), 0),
                    totalPaid: activeBills.reduce((sum, item) => sum + Number(item.amountPaid), 0),
                },
            });
        }
        return bills.length;
    });
}

export async function getBillsByPeriod(period: string) {
    const bills = await prisma.bill.findMany({
        where: {
            deletedAt: null,
            meterReading: {
                period,
                deletedAt: null,
                customer: { deletedAt: null },
            },
        },
        select: {
            id: true,
            totalAmount: true,
            amountPaid: true,
            remaining: true,
            paymentStatus: true,
            meterReading: {
                select: {
                    customer: {
                        select: { id: true, name: true, customerNumber: true },
                    },
                },
            },
        },
        orderBy: { meterReading: { customer: { customerNumber: 'asc' } } },
    });

    const mapped = bills.map((bill) => ({
        id: bill.id,
        customerId: bill.meterReading.customer.id,
        customerName: bill.meterReading.customer.name,
        customerNumber: bill.meterReading.customer.customerNumber,
        paymentStatus: bill.paymentStatus === 'PAID' || bill.paymentStatus === 'PARTIAL'
            ? bill.paymentStatus
            : 'UNPAID',
        totalAmount: Number(bill.totalAmount),
        amountPaid: Number(bill.amountPaid),
        remaining: Number(bill.remaining),
    }));

    return {
        period,
        totalBills: mapped.length,
        paid: mapped.filter((bill) => bill.paymentStatus === 'PAID'),
        unpaid: mapped.filter((bill) => bill.paymentStatus !== 'PAID'),
    };
}
