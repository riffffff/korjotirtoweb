import type { BillItemTypeCode, PaymentStatusCode } from '@/types';

export interface BillingConfig {
    RATE_K1: number;
    RATE_K2: number;
    K1_LIMIT: number;
    ADMIN_FEE: number;
    PENALTY_FEE: number;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
    RATE_K1: 1800,
    RATE_K2: 3000,
    K1_LIMIT: 40,
    ADMIN_FEE: 3000,
    PENALTY_FEE: 5000,
};

export interface CalculatedBillItem {
    type: BillItemTypeCode;
    usage: number;
    rate: number;
    amount: number;
}

export interface CalculatedWaterBill {
    usage: number;
    usageK1: number;
    usageK2: number;
    amountK1: number;
    amountK2: number;
    totalAmount: number;
    items: CalculatedBillItem[];
}

/**
 * Calculates progressive water charges from meter readings.
 */
export function calculateWaterBill(
    meterStart: number,
    meterEnd: number,
    overrides: Partial<BillingConfig> = {},
): CalculatedWaterBill {
    const config = { ...DEFAULT_BILLING_CONFIG, ...overrides };
    const usage = Math.max(0, meterEnd - meterStart);
    const usageK1 = Math.min(usage, config.K1_LIMIT);
    const usageK2 = Math.max(0, usage - config.K1_LIMIT);
    const amountK1 = usageK1 * config.RATE_K1;
    const amountK2 = usageK2 * config.RATE_K2;

    const items: CalculatedBillItem[] = [
        { type: 'BEBAN', usage: 0, rate: config.ADMIN_FEE, amount: config.ADMIN_FEE },
    ];
    if (usageK1 > 0) {
        items.push({ type: 'K1', usage: usageK1, rate: config.RATE_K1, amount: amountK1 });
    }
    if (usageK2 > 0) {
        items.push({ type: 'K2', usage: usageK2, rate: config.RATE_K2, amount: amountK2 });
    }

    return {
        usage,
        usageK1,
        usageK2,
        amountK1,
        amountK2,
        totalAmount: config.ADMIN_FEE + amountK1 + amountK2,
        items,
    };
}

/**
 * Calculates the flat late-payment penalty for a billing period.
 */
export function calculateBillPenalty(
    period: string,
    paymentStatus: PaymentStatusCode,
    paidAt: Date | string | null,
    penaltyFee = DEFAULT_BILLING_CONFIG.PENALTY_FEE,
    now = new Date(),
): number {
    const [year, month] = period.split('-').map(Number);
    const dueDate = new Date(year, month, 0, 23, 59, 59, 999);

    if (paymentStatus === 'PAID') {
        if (!paidAt) return 0;
        return new Date(paidAt) > dueDate ? penaltyFee : 0;
    }

    return now > dueDate ? penaltyFee : 0;
}

export interface UnpaidBillForAllocation {
    id: string | number;
    period: string;
    totalAmount: number;
    amountPaid: number;
    penalty: number;
}

export interface AllocatedBill {
    id: string | number;
    period: string;
    amountPaid: number;
    remaining: number;
    paymentStatus: PaymentStatusCode;
    penalty: number;
}

export interface PaymentAllocation {
    bills: AllocatedBill[];
    allocatedAmount: number;
    change: number;
}

/**
 * Allocates a payment to the oldest bills first and returns the change.
 */
export function allocatePaymentFifo(
    unpaidBills: UnpaidBillForAllocation[],
    effectivePaymentAmount: number,
): PaymentAllocation {
    let remainingPayment = Math.max(0, effectivePaymentAmount);
    const bills: AllocatedBill[] = [];

    for (const bill of unpaidBills) {
        if (remainingPayment <= 0) break;

        const obligation = Math.max(0, bill.totalAmount + bill.penalty - bill.amountPaid);
        const allocated = Math.min(remainingPayment, obligation);
        const newAmountPaid = bill.amountPaid + allocated;
        const remaining = Math.max(0, obligation - allocated);
        const paymentStatus: PaymentStatusCode = remaining === 0
            ? 'PAID'
            : newAmountPaid > 0
                ? 'PARTIAL'
                : 'UNPAID';

        bills.push({
            id: bill.id,
            period: bill.period,
            amountPaid: newAmountPaid,
            remaining,
            paymentStatus,
            penalty: bill.penalty,
        });
        remainingPayment -= allocated;
    }

    return {
        bills,
        allocatedAmount: effectivePaymentAmount - remainingPayment,
        change: remainingPayment,
    };
}
