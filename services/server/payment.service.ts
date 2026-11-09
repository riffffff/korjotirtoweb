import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { allocatePaymentFifo, calculateBillPenalty } from '@/lib/billing';

function periodName(period: string) {
    const [year, month] = period.split('-');
    const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${names[Number(month) - 1] ?? month} ${year}`;
}

type PaymentTransaction = Prisma.TransactionClient;

export async function processCustomerPaymentInTransaction(tx: PaymentTransaction, params: {
    customerId: string;
    cashAmount: number;
    saveToDeposit: number;
    useDeposit: number;
}) {
        const customer = await tx.customer.findFirst({ where: { id: params.customerId, deletedAt: null } });
        if (!customer) throw new Error('Customer not found');
        if (params.useDeposit > Number(customer.balance)) throw new Error('Saldo tidak mencukupi');

        const bills = await tx.bill.findMany({
            where: {
                deletedAt: null,
                meterReading: { customerId: params.customerId, deletedAt: null },
            },
            include: { meterReading: true },
            orderBy: { meterReading: { period: 'asc' } },
        });

        // Always calculate FIFO from the complete chronological bill history.
        // This prevents a newer bill from being selected ahead of an older
        // outstanding bill, even when stored status data is stale.
        const outstandingBills = bills.filter((bill) => {
            const penalty = calculateBillPenalty(
                bill.meterReading.period,
                bill.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID',
                bill.paidAt,
            );
            return Number(bill.totalAmount) + penalty - Number(bill.amountPaid) > 0;
        });
        const allocation = allocatePaymentFifo(
            outstandingBills.map((bill) => ({
                id: bill.id,
                period: bill.meterReading.period,
                totalAmount: Number(bill.totalAmount),
                amountPaid: Number(bill.amountPaid),
                penalty: calculateBillPenalty(
                    bill.meterReading.period,
                    bill.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID',
                    bill.paidAt,
                ),
            })),
            params.cashAmount + params.useDeposit,
        );
        if (params.saveToDeposit > allocation.change) throw new Error('Simpan ke saldo melebihi kembalian');

        for (const updated of allocation.bills) {
            await tx.bill.update({
                where: { id: String(updated.id) },
                data: {
                    amountPaid: updated.amountPaid,
                    remaining: updated.remaining,
                    penalty: updated.penalty,
                    paymentStatus: updated.paymentStatus,
                    paidAt: updated.paymentStatus === 'PAID' ? new Date() : null,
                },
            });
        }
        const depositBalance = Number(customer.balance) - params.useDeposit + params.saveToDeposit;
        const totalPaid = Number(customer.totalPaid) + allocation.allocatedAmount;
        const description = allocation.bills.filter((bill) => bill.paymentStatus === 'PAID').length
            ? `Lunas: ${allocation.bills.filter((bill) => bill.paymentStatus === 'PAID').map((bill) => periodName(bill.period)).join(', ')}`
            : 'Pembayaran';
        const updatedCustomer = await tx.customer.update({
            where: { id: params.customerId },
            data: { totalPaid, balance: depositBalance },
        });
        await tx.payment.create({
            data: {
                customerId: params.customerId,
                amount: allocation.allocatedAmount - params.useDeposit + params.saveToDeposit,
                description,
            },
        });
        return {
            customer: updatedCustomer,
            allocation,
            cashChange: allocation.change - params.saveToDeposit,
            savedToDeposit: params.saveToDeposit,
        };
}

export async function processCustomerPayment(params: {
    customerId: string;
    cashAmount: number;
    saveToDeposit: number;
    useDeposit: number;
}) {
    return prisma.$transaction((tx) => processCustomerPaymentInTransaction(tx, params));
}
