import Link from 'next/link';
import { ArrowLeft, Home, Search } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-center">
                    <Logo size="lg" theme="light" showText={true} />
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xl tracking-tight">
                        404
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold text-neutral-800">
                            Halaman Tidak Ditemukan
                        </h1>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                            Halaman yang Anda tuju tidak ditemukan atau alamat URL mungkin telah dipindahkan.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
                        >
                            <Home className="w-4 h-4" />
                            Kembali ke Beranda
                        </Link>
                        <Link
                            href="/search"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-sm transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            Cari Pelanggan
                        </Link>
                    </div>
                </div>

                <p className="text-xs text-neutral-400">
                    Korjo Tirto · Sistem Pengelolaan Pembayaran Air Bersih
                </p>
            </div>
        </main>
    );
}

