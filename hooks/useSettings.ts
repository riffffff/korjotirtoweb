import { useState, useEffect, useCallback } from 'react';
import { settingClient } from '@/services/client/setting.client';

// In-memory cache for settings
let settingsCache: Record<string, string> | null = null;
let settingsCacheTime = 0;
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes (settings rarely change)

/**
 * Hook for fetching settings with stale-while-revalidate caching
 */
export function useSettings() {
    // Show cached settings immediately if available
    const [settings, setSettings] = useState<Record<string, string>>(() => settingsCache || {});
    const [loading, setLoading] = useState(() => !settingsCache);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        
        // Use cache if fresh and not forcing refresh
        if (!force && settingsCache && (now - settingsCacheTime) < CACHE_EXPIRY) {
            setSettings(settingsCache);
            setLoading(false);
            return;
        }

        try {
            if (!settingsCache) {
                setLoading(true);
            }
            setError(null);
            
            const result = await settingClient.getAll();
            settingsCache = result;
            settingsCacheTime = Date.now();
            setSettings(result);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            if (!settingsCache) {
                setError('Gagal memuat pengaturan');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update local settings (for form editing)
    const updateSettings = useCallback((key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    // Force refresh and clear cache
    const refetch = useCallback(() => {
        settingsCache = null;
        settingsCacheTime = 0;
        fetchData(true);
    }, [fetchData]);
    
    // Invalidate cache (call after save)
    const invalidateCache = useCallback(() => {
        settingsCache = null;
        settingsCacheTime = 0;
    }, []);

    // Update cache after successful save
    const updateCache = useCallback((newSettings: Record<string, string>) => {
        settingsCache = newSettings;
        settingsCacheTime = Date.now();
        setSettings(newSettings);
    }, []);

    const saveSettings = useCallback(async (newSettings: Record<string, string>) => {
        await settingClient.update(newSettings);
        updateCache(newSettings);
    }, [updateCache]);

    return { settings, loading, error, updateSettings, refetch, invalidateCache, updateCache, saveSettings };
}

/**
 * Utility to clear settings cache
 */
export function clearSettingsCache() {
    settingsCache = null;
    settingsCacheTime = 0;
}
