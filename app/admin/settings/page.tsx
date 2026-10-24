'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_WA_BILL_TEMPLATE } from '@/lib/whatsapp';
import BackButton from '@/components/BackButton';
import LoadingState from '@/components/state/LoadingState';
import Button from '@/components/ui/Button';

const TEMPLATE_KEY = 'wa_bill_template';
const LEGACY_MESSAGE_KEY = 'wa_message_text';

export default function SettingsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { settings, loading, error, updateCache } = useSettings();
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ success: boolean; text: string } | null>(null);
    const [templateDraft, setTemplateDraft] = useState('');
    const [savedTemplateValue, setSavedTemplateValue] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    const currentTemplate = useMemo(() => templateDraft, [templateDraft]);

    const isDirty = currentTemplate.trim() !== savedTemplateValue.trim();

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
            setIsInitialized(true);
        }
    }, [isInitialized, loading, settings]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);

        try {
            const payload = {
                settings: {
                    [TEMPLATE_KEY]: currentTemplate,
                },
            };

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Gagal menyimpan pengaturan');
            }

            updateCache({
                ...settings,
                [TEMPLATE_KEY]: currentTemplate,
            });
            setTemplateDraft(currentTemplate);
            setSavedTemplateValue(currentTemplate);
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

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) {
        router.push('/');
        return null;
    }

    if (loading && !isInitialized) {
        return <LoadingState message="Memuat pengaturan..." />;
    }

    return (
        <>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Pengaturan</h1>
                    <p className="text-sm text-neutral-500">Atur template pesan WhatsApp</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
                <BackButton href="/admin/dashboard" className="md:hidden" />

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-neutral-200 p-4 md:p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-800">Template Pesan Tagihan WA</h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            Ubah format pesan WA sesuai kebutuhan. Gunakan placeholder supaya data pelanggan dan tagihan tetap muncul.
                        </p>
                    </div>

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

                    {saveMessage && (
                        <div className={`rounded-xl p-3 text-sm ${saveMessage.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {saveMessage.text}
                        </div>
                    )}

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
                </div>
            </main>
        </>
    );
}
