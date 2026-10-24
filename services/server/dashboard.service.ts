import prisma from '@/lib/prisma';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export async function getDashboardStats() {
    const [totalCustomers, revenueResult, balanceResult, periods] = await Promise.all([
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.payment.aggregate({
            where: { deletedAt: null },
            _sum: { amount: true },
        }),
        prisma.customer.aggregate({
            where: { deletedAt: null },
            _sum: { balance: true },
        }),
        prisma.meterReading.findMany({
            where: { deletedAt: null, bill: { deletedAt: null } },
            select: { period: true },
            distinct: ['period'],
            orderBy: { period: 'desc' },
            take: 12,
        }),
    ]);

    const periodStats = await Promise.all(periods.map(async ({ period }) => {
        const bills = await prisma.bill.findMany({
            where: {
                deletedAt: null,
                meterReading: { period, deletedAt: null, customer: { deletedAt: null } },
            },
            select: { paymentStatus: true, totalAmount: true, amountPaid: true },
        });
        const [year, month] = period.split('-');
        return {
            period,
            periodLabel: `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`,
            totalBills: bills.length,
            paidCount: bills.filter((bill) => bill.paymentStatus === 'PAID').length,
            unpaidCount: bills.filter((bill) => bill.paymentStatus !== 'PAID').length,
            totalAmount: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
            paidAmount: bills.reduce((sum, bill) => sum + Number(bill.amountPaid), 0),
        };
    }));

    return {
        totalCustomers,
        totalRevenue: Number(revenueResult._sum.amount ?? 0),
        totalOutstanding: Number(balanceResult._sum.balance ?? 0),
        periods: periodStats,
    };
}
