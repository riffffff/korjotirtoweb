'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, LogOut, Settings, Upload, Users, WalletCards } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';

const navigationItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { label: 'Pelanggan', href: '/', icon: Users },
    { label: 'Pembayaran', href: '/admin/payment-proofs', icon: WalletCards },
    { label: 'Import', href: '/admin/import', icon: Upload },
    { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
];

export default function MobileAdminNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin, logout } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (!isAdmin || pathname === '/login') return null;

    return (
        <>
            <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur md:hidden" aria-label="Navigasi admin">
                <div className="grid grid-cols-6 gap-1">
                    {navigationItems.map(({ label, href, icon: Icon }) => {
                        const isActive = href === '/'
                            ? pathname === '/' || pathname.startsWith('/customerNumber/') || pathname.startsWith('/customers/')
                            : pathname === href || pathname.startsWith(`${href}/`);

                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-label={label}
                                title={label}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex min-h-12 items-center justify-center rounded-xl transition-colors ${
                                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                            </Link>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        aria-label="Keluar"
                        title="Keluar"
                        className="flex min-h-12 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                        <LogOut className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </nav>

            <Modal
                isOpen={showLogoutModal}
                onClose={() => !isLoggingOut && setShowLogoutModal(false)}
                title="Konfirmasi Keluar"
            >
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                        Apakah Anda yakin ingin keluar dari akun administrator?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowLogoutModal(false)}
                            disabled={isLoggingOut}
                            className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                setIsLoggingOut(true);
                                try {
                                    await logout();
                                    setShowLogoutModal(false);
                                    router.push('/');
                                } finally {
                                    setIsLoggingOut(false);
                                }
                            }}
                            disabled={isLoggingOut}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            {isLoggingOut ? 'Keluar...' : 'Ya, Keluar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
