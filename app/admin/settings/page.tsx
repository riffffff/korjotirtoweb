'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import BackButton from '@/components/BackButton';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/state/LoadingState';

interface SettingItem {
    key: string;
    label: string;
    description: string;
    type: 'number' | 'text';
}

const settingItems: SettingItem[] = [
    { key: 'rate_k1', label: 'Tarif K1 (0-10 m³)', description: 'Harga per m³ untuk pemakaian 0-10 m³', type: 'number' },
    { key: 'rate_k2', label: 'Tarif K2 (>10 m³)', description: 'Harga per m³ untuk pemakaian di atas 10 m³', type: 'number' },
    { key: 'admin_fee', label: 'Biaya Admin', description: 'Biaya administrasi per tagihan', type: 'number' },
    { key: 'penalty_per_month', label: 'Denda per Bulan', description: 'Denda keterlambatan per bulan', type: 'number' },
];

export default function SettingsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { settings, loading, updateSettings, updateCache } = useSettings();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: localStorage.getItem('role'),
                    settings
                })
            });
            const data = await res.json();
            if (data.success) {
                // Update cache with new settings
                updateCache(settings);
                setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal menyimpan' });
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        updateSettings(key, value);
    };

    const formatCurrency = (value: string) => {
        const num = parseInt(value) || 0;
        return new Intl.NumberFormat('id-ID').format(num);
    };

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) {
        router.push('/');
        return null;
    }

    return (
        <>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Pengaturan</h1>
                    <p className="text-sm text-neutral-500">Konfigurasi tarif dan biaya</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
                <BackButton href="/admin/dashboard" className="md:hidden" />

                {loading ? (
                    <LoadingState message="Memuat pengaturan..." />
                ) : (
                    <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                        {settingItems.map((item) => (
                            <div key={item.key} className="p-4">
                                <label className="block">
                                    <span className="text-sm font-medium text-neutral-700">{item.label}</span>
                                    <p className="text-xs text-neutral-500 mb-2">{item.description}</p>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">Rp</span>
                                        <input
                                            type="number"
                                            value={settings[item.key] || ''}
                                            onChange={(e) => handleChange(item.key, e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0"
                                        />
                                    </div>
                                    {settings[item.key] && (
                                        <p className="text-xs text-neutral-500 mt-1">
                                            = Rp {formatCurrency(settings[item.key])}
                                        </p>
                                    )}
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                {message && (
                    <div className={`p-4 rounded-xl ${
                        message.type === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                <Button
                    onClick={handleSave}
                    loading={saving}
                    className="w-full"
                    disabled={loading}
                >
                    Simpan Pengaturan
                </Button>
            </main>
        </>
    );
}
