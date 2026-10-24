import prisma from '@/lib/prisma';
import { DEFAULT_BILLING_CONFIG, type BillingConfig } from '@/lib/billing';

export async function getAllSettings() {
    return prisma.setting.findMany({ orderBy: { key: 'asc' } });
}

export async function getBillingConfig(): Promise<BillingConfig> {
    const settings = await prisma.setting.findMany({
        where: { key: { in: ['RATE_K1', 'RATE_K2', 'ADMIN_FEE', 'PENALTY_FEE', 'PENALTY_RATE'] } },
    });
    const values = Object.fromEntries(settings.map((setting) => [setting.key, Number(setting.value)]));
    return {
        RATE_K1: Number.isFinite(values.RATE_K1) ? values.RATE_K1 : DEFAULT_BILLING_CONFIG.RATE_K1,
        RATE_K2: Number.isFinite(values.RATE_K2) ? values.RATE_K2 : DEFAULT_BILLING_CONFIG.RATE_K2,
        K1_LIMIT: DEFAULT_BILLING_CONFIG.K1_LIMIT,
        ADMIN_FEE: Number.isFinite(values.ADMIN_FEE) ? values.ADMIN_FEE : DEFAULT_BILLING_CONFIG.ADMIN_FEE,
        PENALTY_FEE: Number.isFinite(values.PENALTY_FEE ?? values.PENALTY_RATE)
            ? (values.PENALTY_FEE ?? values.PENALTY_RATE)
            : DEFAULT_BILLING_CONFIG.PENALTY_FEE,
    };
}

export async function updateSettings(settings: Record<string, unknown>) {
    return Promise.all(Object.entries(settings).map(([key, value]) => prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
    })));
}
