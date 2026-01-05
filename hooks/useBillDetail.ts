import { useState, useEffect, useCallback } from 'react';
import { billService } from '@/services/billService';
import { BillDetail, BillItem } from '@/types';

// Parse string amounts to numbers (shared helper)
const parseAmount = (amount?: string | number): number => {
    if (!amount) return 0;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
};

// Extract bill data helper
function extractBillData(bill: BillDetail | null) {
    const items = bill?.items ?? [];
    const k1Item = items.find((i: BillItem) => i.type === 'K1');
    const k2Item = items.find((i: BillItem) => i.type === 'K2');
    const adminFeeItem = items.find((i: BillItem) => i.type === 'ADMIN_FEE');

    return {
        meterStart: bill?.meterStart ?? 0,
        meterEnd: bill?.meterEnd ?? 0,
        usage: bill?.usage ?? 0,
        k1Usage: k1Item?.usage ?? 0,
        k2Usage: k2Item?.usage ?? 0,
        k1Amount: parseAmount(k1Item?.amount),
        k2Amount: parseAmount(k2Item?.amount),
        adminFee: parseAmount(adminFeeItem?.amount),
        totalAmount: parseAmount(bill?.totalAmount),
        paymentStatus: bill?.paymentStatus ?? 'pending',
        customer: bill?.customer ?? null,
    };
}

// Hook for fetching bill by ID
export function useBillDetail(id: number | null) {
    const [bill, setBill] = useState<BillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const fetchBill = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await billService.getById(id);
                setBill(data);
            } catch (err) {
                setError('Gagal memuat data tagihan');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBill();
    }, [id]);

    return {
        bill,
        loading,
        error,
        ...extractBillData(bill),
    };
}

// Hook for fetching bill by customer + period (customerId/year/month)
export function useBillDetailByPeriod(
    customerId: number | null,
    year: string | undefined,
    month: string | undefined
) {
    const [bill, setBill] = useState<BillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!customerId || !year || !month) {
            setLoading(false);
            setError('Parameter tidak lengkap');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await billService.getByCustomerPeriod(customerId, year, month);
            setBill(data);
        } catch (err) {
            setError('Gagal memuat data tagihan');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [customerId, year, month]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        bill,
        loading,
        error,
        refetch,
        ...extractBillData(bill),
    };
}

