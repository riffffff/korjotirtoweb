import prisma from '@/lib/prisma';
import type {
    DashboardStatsDTO,
    DelinquentCustomerDTO,
    PendingProofsSummaryDTO,
    WaterUsageAnomalyDTO,
    WaterUsageInsightDTO,
} from '@/types';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export async function getDashboardStats(): Promise<DashboardStatsDTO> {
    const [
        totalCustomers,
        revenueResult,
        balanceResult,
        periods,
        pendingProofsResult,
        unpaidBills,
    ] = await Promise.all([
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
        prisma.paymentProof.aggregate({
            where: { status: 'PENDING' },
            _count: { id: true },
            _sum: { amount: true },
        }),
        prisma.bill.findMany({
            where: {
                deletedAt: null,
                paymentStatus: { not: 'PAID' },
                meterReading: { deletedAt: null, customer: { deletedAt: null } },
            },
            select: {
                remaining: true,
                totalAmount: true,
                amountPaid: true,
                meterReading: {
                    select: {
                        customerId: true,
                        customer: {
                            select: { id: true, name: true, customerNumber: true, phone: true },
                        },
                    },
                },
            },
        }),
    ]);

    const periodList = periods.map((p) => p.period);
    const periodBills = periodList.length > 0
        ? await prisma.bill.findMany({
            where: {
                deletedAt: null,
                meterReading: {
                    period: { in: periodList },
                    deletedAt: null,
                    customer: { deletedAt: null },
                },
            },
            select: {
                paymentStatus: true,
                totalAmount: true,
                amountPaid: true,
                meterReading: { select: { customerId: true, period: true } },
            },
        })
        : [];

    const billsByPeriod = new Map<string, typeof periodBills>();
    for (const bill of periodBills) {
        const p = bill.meterReading.period;
        const list = billsByPeriod.get(p);
        if (list) {
            list.push(bill);
        } else {
            billsByPeriod.set(p, [bill]);
        }
    }

    const periodStats = periodList.map((period) => {
        const bills = billsByPeriod.get(period) ?? [];
        const [year, month] = period.split('-');
        return {
            period,
            periodLabel: `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`,
            totalBills: bills.length,
            paidCount: bills.filter((bill) => bill.paymentStatus === 'PAID').length,
            payingCustomerCount: new Set(
                bills
                    .filter((bill) => Number(bill.amountPaid) > 0)
                    .map((bill) => bill.meterReading.customerId),
            ).size,
            unpaidCount: bills.filter((bill) => bill.paymentStatus !== 'PAID').length,
            totalAmount: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
            paidAmount: bills.reduce((sum, bill) => sum + Number(bill.amountPaid), 0),
        };
    });

    // Calculate pending payment proofs summary
    const pendingProofs: PendingProofsSummaryDTO = {
        count: pendingProofsResult._count.id,
        totalAmount: Number(pendingProofsResult._sum.amount ?? 0),
    };

    // Calculate Top Delinquents (prioritize most unpaid months, then highest debt)
    const delinquentMap = new Map<string, DelinquentCustomerDTO>();
    for (const bill of unpaidBills) {
        const cust = bill.meterReading?.customer;
        if (!cust) continue;

        const remaining = Number(
            Number(bill.remaining) > 0
                ? bill.remaining
                : Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid))
        );

        const existing = delinquentMap.get(cust.id);
        if (!existing) {
            delinquentMap.set(cust.id, {
                customerId: cust.id,
                customerNumber: cust.customerNumber,
                name: cust.name,
                phone: cust.phone,
                monthsUnpaid: 1,
                totalUnpaid: remaining,
            });
        } else {
            existing.monthsUnpaid += 1;
            existing.totalUnpaid += remaining;
        }
    }

    const topDelinquents = Array.from(delinquentMap.values())
        .sort((a, b) => {
            if (b.monthsUnpaid !== a.monthsUnpaid) {
                return b.monthsUnpaid - a.monthsUnpaid;
            }
            return b.totalUnpaid - a.totalUnpaid;
        })
        .slice(0, 5);

    // Calculate Water Usage Insights & Anomalies
    let waterUsageInsight: WaterUsageInsightDTO | null = null;
    if (periods.length > 0) {
        const latestPeriod = periods[0].period;
        const prevPeriod = periods[1]?.period ?? null;
        const targetPeriods = [latestPeriod, prevPeriod].filter(Boolean) as string[];

        const meterReadings = await prisma.meterReading.findMany({
            where: {
                deletedAt: null,
                period: { in: targetPeriods },
                customer: { deletedAt: null },
            },
            select: {
                period: true,
                usage: true,
                customerId: true,
                customer: {
                    select: { id: true, name: true, customerNumber: true },
                },
            },
        });

        const currentReadings = meterReadings.filter((m) => m.period === latestPeriod);
        const prevReadingsMap = new Map<string, number>();
        for (const m of meterReadings) {
            if (m.period === prevPeriod) {
                prevReadingsMap.set(m.customerId, m.usage);
            }
        }

        const totalUsage = currentReadings.reduce((sum, r) => sum + r.usage, 0);
        const prevTotalUsage = prevPeriod
            ? meterReadings.filter((m) => m.period === prevPeriod).reduce((sum, r) => sum + r.usage, 0)
            : null;

        let usageChangePercent: number | null = null;
        if (prevTotalUsage !== null && prevTotalUsage > 0) {
            usageChangePercent = Math.round(((totalUsage - prevTotalUsage) / prevTotalUsage) * 100);
        }

        const averageUsage = currentReadings.length > 0
            ? Math.round((totalUsage / currentReadings.length) * 10) / 10
            : 0;

        let highestUser: WaterUsageInsightDTO['highestUser'] = null;
        if (currentReadings.length > 0) {
            const sorted = [...currentReadings].sort((a, b) => b.usage - a.usage);
            const top = sorted[0];
            if (top) {
                highestUser = {
                    customerId: top.customerId,
                    customerNumber: top.customer.customerNumber,
                    name: top.customer.name,
                    usage: top.usage,
                };
            }
        }

        const anomalies: WaterUsageAnomalyDTO[] = [];
        for (const r of currentReadings) {
            const prevUsage = prevReadingsMap.get(r.customerId) ?? null;
            if (prevUsage !== null && prevUsage > 0 && r.usage >= 2 * prevUsage && r.usage > 20) {
                const percentChange = Math.round(((r.usage - prevUsage) / prevUsage) * 100);
                anomalies.push({
                    customerId: r.customerId,
                    customerNumber: r.customer.customerNumber,
                    name: r.customer.name,
                    type: 'SPIKE',
                    currentUsage: r.usage,
                    previousUsage: prevUsage,
                    percentChange,
                });
            } else if (r.usage === 0) {
                anomalies.push({
                    customerId: r.customerId,
                    customerNumber: r.customer.customerNumber,
                    name: r.customer.name,
                    type: 'ZERO_USAGE',
                    currentUsage: 0,
                    previousUsage: prevUsage,
                    percentChange: prevUsage !== null && prevUsage > 0 ? -100 : null,
                });
            }
        }

        const [year, month] = latestPeriod.split('-');
        const periodLabel = `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;

        waterUsageInsight = {
            period: latestPeriod,
            periodLabel,
            totalUsage,
            previousPeriodTotalUsage: prevTotalUsage,
            usageChangePercent,
            averageUsage,
            highestUser,
            anomalies,
        };
    }

    return {
        totalCustomers,
        totalRevenue: Number(revenueResult._sum.amount ?? 0),
        totalOutstanding: Number(balanceResult._sum.balance ?? 0),
        periods: periodStats,
        pendingProofs,
        topDelinquents,
        waterUsageInsight,
    };
}
