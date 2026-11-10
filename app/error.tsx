'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        // Log the error for observability
        console.error('Unhandled application error:', error);
    }, [error]);

    return (
        <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-center">
                    <Logo size="lg" theme="light" showText={true} />
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600">
                        <AlertCircle className="w-7 h-7" />
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold text-neutral-800">
                            Terjadi Kendala Sistem
                        </h1>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                            Maaf, terjadi gangguan tak terduga saat memproses permintaan Anda. Silakan coba muat ulang halaman.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Muat Ulang
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-sm transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Kembali ke Beranda
                        </Link>
                    </div>

                    {process.env.NODE_ENV !== 'production' && error.message && (
                        <div className="mt-4 pt-3 border-t border-neutral-100 text-left">
                            <p className="text-[11px] font-mono text-neutral-400 break-all bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                                {error.message}
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-xs text-neutral-400">
                    Korjo Tirto · Sistem Pengelolaan Pembayaran Air Bersih
                </p>
            </div>
        </main>
    );
}

