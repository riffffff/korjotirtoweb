'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_WA_BILL_TEMPLATE } from '@/lib/whatsapp';
import { DashboardNavigationButton } from '@/components/admin/AdminPageNavigation';
import LoadingState from '@/components/state/LoadingState';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/layout/PageHeader';
import AppLayout from '@/components/layout/AppLayout';

const TEMPLATE_KEY = 'wa_bill_template';
const LEGACY_MESSAGE_KEY = 'wa_message_text';
const PAYMENT_SETTING_KEYS = [
    'payment_bank_name',
    'payment_account_number',
    'payment_account_name',
    'payment_whatsapp_number',
] as const;

export default function SettingsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { settings, loading, error, updateCache, saveSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ success: boolean; text: string } | null>(null);
    const [templateDraft, setTemplateDraft] = useState('');
    const [savedTemplateValue, setSavedTemplateValue] = useState('');
    const [paymentDraft, setPaymentDraft] = useState<Record<string, string>>({});
    const [savedPaymentDraft, setSavedPaymentDraft] = useState<Record<string, string>>({});
    const [isInitialized, setIsInitialized] = useState(false);

    const currentTemplate = useMemo(() => templateDraft, [templateDraft]);

    const isDirty = currentTemplate.trim() !== savedTemplateValue.trim()
        || PAYMENT_SETTING_KEYS.some((key) => paymentDraft[key]?.trim() !== savedPaymentDraft[key]?.trim());

    useEffect(() => {
        if (!isInitialized && !loading) {
            let initialTemplate = DEFAULT_WA_BILL_TEMPLATE;

            if (settings[TEMPLATE_KEY]) {
                initialTemplate = settings[TEMPLATE_KEY];
            } else if (settings[LEGACY_MESSAGE_KEY]) {
                initialTemplate = DEFAULT_WA_BILL_TEMPLATE.replace(
                    'Dengan hormat, kami dari Korjo Tirto menginformasikan rincian tagihan air Anda:',
                    settings[LEGACY_MESSAGE_KEY]
                );
            }

            setTemplateDraft(initialTemplate);
            setSavedTemplateValue(initialTemplate);
            const initialPaymentSettings = Object.fromEntries(PAYMENT_SETTING_KEYS.map((key) => [key, settings[key] || '']));
            setPaymentDraft(initialPaymentSettings);
            setSavedPaymentDraft(initialPaymentSettings);
            setIsInitialized(true);
        }
    }, [isInitialized, loading, settings]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);

        try {
            await saveSettings({ [TEMPLATE_KEY]: currentTemplate, ...paymentDraft });

            updateCache({
                ...settings,
                [TEMPLATE_KEY]: currentTemplate,
                ...paymentDraft,
            });
            setTemplateDraft(currentTemplate);
            setSavedTemplateValue(currentTemplate);
            setSavedPaymentDraft(paymentDraft);
            setSaveMessage({ success: true, text: 'Template pesan WA berhasil disimpan.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan';
            setSaveMessage({ success: false, text: message });
        } finally {
            setSaving(false);
        }
    };

    const handleResetTemplate = () => {
        setTemplateDraft(DEFAULT_WA_BILL_TEMPLATE);
        setSaveMessage(null);
    };

    const settingsLoading = (
        <AppLayout>
            <PageHeader title="Pengaturan" subtitle="Atur template pesan WhatsApp" actions={<DashboardNavigationButton />} />
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                <LoadingState variant="skeleton-settings" />
            </main>
        </AppLayout>
    );

    if (authLoading) return settingsLoading;
    if (!isAdmin) {
        router.push('/');
        return settingsLoading;
    }

    if (loading && !isInitialized) {
        return settingsLoading;
    }

    return (
        <AppLayout>
            <PageHeader title="Pengaturan" subtitle="Atur informasi pembayaran online" actions={<DashboardNavigationButton />} />

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Disembunyikan (Comment): Template Pesan Tagihan WA
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-800">Template Pesan Tagihan WA</h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            Ubah format pesan WA sesuai kebutuhan. Gunakan placeholder supaya data pelanggan dan tagihan tetap muncul.
                        </p>
                    </div>
                    */}

                    <div className="bg-white rounded-xl border border-neutral-200 p-4 md:p-6 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-800">Pembayaran Online</h2>
                            <p className="text-sm text-neutral-500 mt-1">Informasi ini akan ditampilkan kepada pelanggan pada bagian pembayaran.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {[
                                ['payment_bank_name', 'Nama bank'],
                                ['payment_account_number', 'Nomor rekening'],
                                ['payment_account_name', 'Nama pemilik rekening'],
                                ['payment_whatsapp_number', 'Nomor WhatsApp admin'],
                            ].map(([key, label]) => (
                                <label key={key} className="text-sm font-medium text-neutral-700">
                                    {label}
                                    <input
                                        value={paymentDraft[key] || ''}
                                        onChange={(event) => setPaymentDraft((current) => ({ ...current, [key]: event.target.value }))}
                                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 font-normal"
                                        placeholder={key === 'payment_whatsapp_number' ? '628xxxxxxxxxx' : label}
                                    />
                                </label>
                            ))}
                        </div>
                        {saveMessage && (
                            <div className={`rounded-xl p-3 text-sm ${saveMessage.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {saveMessage.text}
                            </div>
                        )}
                        <Button type="button" onClick={handleSave} loading={saving} disabled={saving || !isDirty} className="w-full md:w-auto">
                            Simpan Pengaturan Pembayaran
                        </Button>
                    </div>

                    {/* Disembunyikan (Comment): Form Template Pesan WA & Placeholder
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Isi Template</label>
                        <textarea
                            value={currentTemplate}
                            onChange={(event) => {
                                setTemplateDraft(event.target.value);
                            }}
                            rows={14}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="Tulis template pesan WhatsApp di sini..."
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-sm font-medium text-blue-700 mb-2">Placeholder yang tersedia:</p>
                        <div className="text-sm text-blue-700 space-y-1">
                            <p>{'{nama_pelanggan}'} → Nama pelanggan</p>
                            <p>{'{rincian_tagihan}'} → Daftar rincian tagihan</p>
                            <p>{'{total_tagihan}'} → Total rupiah tagihan</p>
                            <p>{'{link_tagihan}'} → Link detail tagihan</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleResetTemplate}
                            className="w-full md:w-auto"
                        >
                            Reset Template Default
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            loading={saving}
                            disabled={saving || !isDirty}
                            className="w-full md:w-auto"
                        >
                            Simpan Pengaturan
                        </Button>
                    </div>
                    */}
                </div>
            </main>
        </AppLayout>
    );
}
