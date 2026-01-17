'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import BackButton from '@/components/BackButton';
import LoadingState from '@/components/state/LoadingState';

export default function SettingsPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();

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

                {/* Coming Soon Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-8 text-center">
                    <div className="w-16 h-16 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-700 mb-2">Fitur Segera Tersedia</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Pengaturan tarif K1, K2, biaya admin, dan denda sedang dalam pengembangan. 
                        Fitur ini akan segera tersedia di update berikutnya.
                    </p>
                </div>

                {/* Disabled Settings Preview */}
                <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 opacity-50 pointer-events-none">
                    <div className="p-4">
                        <span className="text-sm font-medium text-neutral-400">Tarif K1 (0-10 m³)</span>
                        <p className="text-xs text-neutral-400 mb-2">Harga per m³ untuk pemakaian 0-10 m³</p>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">Rp</span>
                            <input disabled className="w-full pl-10 pr-4 py-3 bg-neutral-100 rounded-xl border border-neutral-200 text-neutral-400" placeholder="1.800" />
                        </div>
                    </div>
                    <div className="p-4">
                        <span className="text-sm font-medium text-neutral-400">Tarif K2 (&gt;10 m³)</span>
                        <p className="text-xs text-neutral-400 mb-2">Harga per m³ untuk pemakaian di atas 10 m³</p>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">Rp</span>
                            <input disabled className="w-full pl-10 pr-4 py-3 bg-neutral-100 rounded-xl border border-neutral-200 text-neutral-400" placeholder="3.000" />
                        </div>
                    </div>
                    <div className="p-4">
                        <span className="text-sm font-medium text-neutral-400">Biaya Admin</span>
                        <p className="text-xs text-neutral-400 mb-2">Biaya administrasi per tagihan</p>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">Rp</span>
                            <input disabled className="w-full pl-10 pr-4 py-3 bg-neutral-100 rounded-xl border border-neutral-200 text-neutral-400" placeholder="3.000" />
                        </div>
                    </div>
                    <div className="p-4">
                        <span className="text-sm font-medium text-neutral-400">Denda per Bulan</span>
                        <p className="text-xs text-neutral-400 mb-2">Denda keterlambatan per bulan</p>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">Rp</span>
                            <input disabled className="w-full pl-10 pr-4 py-3 bg-neutral-100 rounded-xl border border-neutral-200 text-neutral-400" placeholder="5.000" />
                        </div>
                    </div>
                </div>

                <button disabled className="w-full py-3 px-4 bg-neutral-300 text-neutral-500 font-semibold rounded-xl cursor-not-allowed">
                    Simpan Pengaturan
                </button>
            </main>
        </>
    );
}
