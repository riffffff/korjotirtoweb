'use client'

import { useState, useEffect, useCallback } from 'react'
import { billService } from '@/services/billService'
import { BillPeriodItem, BillHistoryResponse } from '@/types'

// Get current month (01-12)
export function getCurrentMonth(): string {
    return String(new Date().getMonth() + 1).padStart(2, '0');
}

// Get current year
export function getCurrentYear(): string {
    return String(new Date().getFullYear());
}

// Hook for bills with filters (month, year, search)
export function useBills() {
    const [bills, setBills] = useState<BillPeriodItem[]>([])
    const [allBills, setAllBills] = useState<BillPeriodItem[]>([]) // For client-side search
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [month, setMonthState] = useState(getCurrentMonth())
    const [year, setYearState] = useState(getCurrentYear())
    const [search, setSearch] = useState('')

    // Load from sessionStorage on mount
    useEffect(() => {
        const savedMonth = sessionStorage.getItem('bills_month');
        const savedYear = sessionStorage.getItem('bills_year');
        if (savedMonth) setMonthState(savedMonth);
        if (savedYear) setYearState(savedYear);
    }, []);

    // Wrapper to save to sessionStorage
    const setMonth = (m: string) => {
        setMonthState(m);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('bills_month', m);
        }
    };

    const setYear = (y: string) => {
        setYearState(y);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('bills_year', y);
        }
    };

    const fetchBills = useCallback(async (m: string, y: string) => {
        setLoading(true)
        setError(null)
        try {
            const period = `${y}-${m}`
            const res = await billService.getByPeriod(period)
            setAllBills(res.data || [])
            setBills(res.data || [])
        } catch (err) {
            console.error('Error fetching bills:', err)
            setError('Gagal memuat data')
            setBills([])
            setAllBills([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch when month/year changes
    useEffect(() => {
        fetchBills(month, year)
    }, [month, year, fetchBills])

    // Client-side search filtering
    useEffect(() => {
        if (!search.trim()) {
            setBills(allBills)
        } else {
            const searchLower = search.toLowerCase().trim()
            const filtered = allBills.filter(bill =>
                bill.customer.name.toLowerCase().includes(searchLower) ||
                String(bill.customer.customerNumber).includes(searchLower)
            )
            setBills(filtered)
        }
    }, [search, allBills])

    return {
        bills,
        loading,
        error,
        month,
        year,
        search,
        setMonth,
        setYear,
        setSearch,
        refetch: () => fetchBills(month, year)
    }
}

// Legacy hook for compatibility
export function useBillsByPeriod(initialPeriod?: string) {
    const defaultPeriod = `${getCurrentYear()}-${getCurrentMonth()}`;

    const [bills, setBills] = useState<BillPeriodItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [period, setPeriod] = useState(initialPeriod || defaultPeriod)

    const fetchBills = useCallback(async (p: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await billService.getByPeriod(p)
            setBills(res.data || [])
            setPeriod(p)
        } catch (err) {
            console.error('Error fetching bills:', err)
            setError('Gagal memuat data')
            setBills([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBills(period)
    }, [])

    return {
        bills,
        loading,
        error,
        period,
        refetch: () => fetchBills(period),
        changePeriod: (newPeriod: string) => fetchBills(newPeriod)
    }
}

// Hook for bill history by customer
export function useBillHistory(customerId: number | null) {
    const [data, setData] = useState<BillHistoryResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchHistory = useCallback(async () => {
        if (!customerId) return
        setLoading(true)
        setError(null)
        try {
            const res = await billService.getByCustomer(customerId)
            setData(res)
        } catch (err) {
            console.error('Error fetching history:', err)
            setError('Gagal memuat riwayat')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [customerId])

    useEffect(() => {
        if (customerId) fetchHistory()
    }, [customerId, fetchHistory])

    return { data, loading, error, refetch: fetchHistory }
}