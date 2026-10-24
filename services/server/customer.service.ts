import prisma from '@/lib/prisma';
import { calculateBillPenalty } from '@/lib/billing';

export async function createCustomer(name: string, phone?: string | null) {
    const maxCustomer = await prisma.customer.findFirst({
        where: { deletedAt: null },
        orderBy: { customerNumber: 'desc' },
        select: { customerNumber: true },
    });
    return prisma.customer.create({
        data: {
            name,
            customerNumber: (maxCustomer?.customerNumber || 0) + 1,
            phone: phone || null,
        },
    });
}

export async function markCustomerNotified(customerId: string) {
    return prisma.customer.update({
        where: { id: customerId },
        data: { lastNotifiedAt: new Date() },
        select: { id: true, lastNotifiedAt: true },
    });
}

export async function updateCustomer(customerId: string, name: string, phone?: string | null) {
    return prisma.customer.update({
        where: { id: customerId },
        data: { name, phone: phone || null },
    });
}

export async function clearAllCustomerData() {
    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({});
        await tx.billItem.deleteMany({});
        await tx.bill.deleteMany({});
        await tx.meterReading.deleteMany({});
        await tx.customer.deleteMany({});
    });
}

export async function recalculateCustomerTotals() {
    const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        include: {
            payments: { where: { deletedAt: null } },
            meterReadings: {
                where: { deletedAt: null },
                include: { bill: { where: { deletedAt: null } } },
            },
        },
    });

    const results: Array<{
        id: string;
        name: string;
        oldBalance: number;
        newBalance: number;
        totalBill: number;
        totalPaid: number;
    }> = [];

    for (const customer of customers) {
        const totalBill = customer.meterReadings.reduce(
            (sum, reading) => sum + (reading.bill ? Number(reading.bill.totalAmount) : 0),
            0,
        );
        const totalPaid = customer.meterReadings.reduce(
            (sum, reading) => sum + (reading.bill ? Number(reading.bill.amountPaid) : 0),
            0,
        );
        const newBalance = customer.payments.reduce((sum, payment) => {
            const match = payment.description?.match(/\+Rp\s*([\d.,]+)\s*ke saldo/i);
            return match ? sum + (Number.parseInt(match[1].replace(/[.,]/g, ''), 10) || 0) : sum;
        }, 0);
        const oldBalance = Number(customer.balance);

        if (totalBill !== Number(customer.totalBill) || totalPaid !== Number(customer.totalPaid) || newBalance !== oldBalance) {
            await prisma.customer.update({
                where: { id: customer.id },
                data: { totalBill, totalPaid, balance: newBalance },
            });
            results.push({ id: customer.id, name: customer.name, oldBalance, newBalance, totalBill, totalPaid });
        }
    }

    return { fixedCount: results.length, total: customers.length, results: results.slice(0, 20) };
}

export async function getAllCustomers(isAdmin: boolean) {
    const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        orderBy: { customerNumber: 'asc' },
        select: {
            id: true,
            name: true,
            customerNumber: true,
            phone: true,
            totalBill: true,
            totalPaid: true,
            balance: true,
            lastNotifiedAt: true,
            meterReadings: {
                where: { deletedAt: null, bill: { deletedAt: null, paymentStatus: { not: 'PAID' } } },
                select: {
                    period: true,
                    bill: { select: { remaining: true, paymentStatus: true, paidAt: true } },
                },
            },
        },
    });

    return customers.map((customer) => {
        const unpaidTotal = customer.meterReadings.reduce((sum, reading) => {
            if (!reading.bill) return sum;
            const penalty = calculateBillPenalty(
                reading.period,
                reading.bill.paymentStatus === 'PAID' ? 'PAID' : reading.bill.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID',
                reading.bill.paidAt,
            );
            return sum + Number(reading.bill.remaining) + penalty;
        }, 0);

        return {
            id: customer.id,
            name: customer.name,
            customerNumber: customer.customerNumber,
            phone: isAdmin ? customer.phone : null,
            totalBill: Number(customer.totalBill),
            totalPaid: Number(customer.totalPaid),
            unpaidTotal,
            depositBalance: Number(customer.balance),
            lastNotifiedAt: customer.lastNotifiedAt,
        };
    });
}

export async function getCustomerDetail(customerId: string) {
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: {
            id: true,
            name: true,
            customerNumber: true,
            phone: true,
            totalPaid: true,
            balance: true,
            lastNotifiedAt: true,
            payments: { orderBy: { createdAt: 'desc' }, where: { deletedAt: null } },
        },
    });
    if (!customer) return null;

    const bills = await prisma.bill.findMany({
        where: { deletedAt: null, meterReading: { customerId, deletedAt: null } },
        include: { meterReading: true, items: { where: { deletedAt: null } } },
        orderBy: { meterReading: { period: 'desc' } },
    });
    const formattedBills = bills.map((bill) => {
        const paymentStatus = bill.paymentStatus === 'PAID' || bill.paymentStatus === 'PARTIAL'
            ? bill.paymentStatus
            : 'UNPAID';
        const penalty = calculateBillPenalty(bill.meterReading.period, paymentStatus, bill.paidAt);
        return {
            id: bill.id,
            period: bill.meterReading.period,
            meterStart: bill.meterReading.meterStart,
            meterEnd: bill.meterReading.meterEnd,
            usage: bill.meterReading.usage,
            totalAmount: Number(bill.totalAmount),
            penalty,
            totalWithPenalty: Number(bill.totalAmount) + penalty,
            amountPaid: Number(bill.amountPaid),
            remaining: Number(bill.remaining) + penalty,
            paymentStatus,
            paidAt: bill.paidAt,
            items: bill.items.map((item) => ({
                type: item.type,
                usage: item.usage,
                rate: item.rate,
                amount: Number(item.amount),
            })),
        };
    });
    const unpaidTotal = formattedBills
        .filter((bill) => bill.paymentStatus !== 'PAID')
        .reduce((sum, bill) => sum + bill.totalWithPenalty - bill.amountPaid, 0);

    return {
        customer: {
            id: customer.id,
            name: customer.name,
            customerNumber: customer.customerNumber,
            phone: customer.phone,
            totalBill: formattedBills.reduce((sum, bill) => sum + bill.totalWithPenalty, 0),
            totalPaid: Number(customer.totalPaid),
            unpaidTotal,
            depositBalance: Number(customer.balance),
            lastNotifiedAt: customer.lastNotifiedAt,
        },
        bills: formattedBills,
        payments: customer.payments.map((payment) => ({
            id: payment.id,
            amount: Number(payment.amount),
            description: payment.description || '-',
            createdAt: payment.createdAt.toISOString(),
        })),
    };
}

export async function softDeleteCustomer(customerId: string) {
    return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
        if (!customer) throw new Error('Customer not found');
        const deletedAt = new Date();
        const readings = await tx.meterReading.findMany({ where: { customerId, deletedAt: null }, select: { id: true } });
        const readingIds = readings.map((reading) => reading.id);
        if (readingIds.length) {
            const bills = await tx.bill.findMany({ where: { meterReadingId: { in: readingIds }, deletedAt: null }, select: { id: true } });
            const billIds = bills.map((bill) => bill.id);
            if (billIds.length) await tx.billItem.updateMany({ where: { billId: { in: billIds }, deletedAt: null }, data: { deletedAt } });
            await tx.bill.updateMany({ where: { id: { in: billIds }, deletedAt: null }, data: { deletedAt } });
            await tx.meterReading.updateMany({ where: { id: { in: readingIds }, deletedAt: null }, data: { deletedAt } });
        }
        await tx.payment.updateMany({ where: { customerId, deletedAt: null }, data: { deletedAt } });
        await tx.customer.update({ where: { id: customerId }, data: { deletedAt } });
    });
}
