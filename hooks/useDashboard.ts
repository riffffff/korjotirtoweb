import { useState, useEffect, useCallback } from 'react';

interface PeriodStats {
    period: string;
    periodLabel: string;
    totalBills: number;
    paidCount: number;
    unpaidCount: number;
}

export interface DashboardData {
    totalCustomers: number;
    totalOutstanding: number;
    periods: PeriodStats[];
}

// In-memory cache for dashboard data
let dashboardCache: DashboardData | null = null;
let dashboardCacheTime = 0;
const CACHE_EXPIRY = 30 * 1000; // 30 seconds

/**
 * Hook for fetching dashboard data with caching
 */
export function useDashboard() {
    // Initialize with cached data if available and valid
    const [data, setData] = useState<DashboardData | null>(() => {
        if (dashboardCache && (Date.now() - dashboardCacheTime) < CACHE_EXPIRY) {
            return dashboardCache;
        }
        return null;
    });
    const [loading, setLoading] = useState(() => {
        // Only show loading if no valid cache
        return !dashboardCache || (Date.now() - dashboardCacheTime) >= CACHE_EXPIRY;
    });
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if valid and not forcing refresh
        if (!force && dashboardCache && (now - dashboardCacheTime) < CACHE_EXPIRY) {
            setData(dashboardCache);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const res = await fetch('/api/dashboard');
            const result = await res.json();
            
            if (result.success) {
                // Update cache
                dashboardCache = result.data;
                dashboardCacheTime = Date.now();
                setData(result.data);
            } else {
                setError(result.error || 'Gagal memuat dashboard');
            }
        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
            setError('Gagal memuat dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Force refresh and clear cache
    const refetch = useCallback(() => {
        dashboardCache = null;
        dashboardCacheTime = 0;
        fetchData(true);
    }, [fetchData]);

    return { data, loading, error, refetch };
}

/**
 * Utility to clear dashboard cache
 */
export function clearDashboardCache() {
    dashboardCache = null;
    dashboardCacheTime = 0;
}
