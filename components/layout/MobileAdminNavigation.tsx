'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Settings, Upload, Users, WalletCards } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navigationItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { label: 'Pelanggan', href: '/', icon: Users },
    { label: 'Pembayaran', href: '/admin/payment-proofs', icon: WalletCards },
    { label: 'Import', href: '/admin/import', icon: Upload },
    { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
];

export default function MobileAdminNavigation() {
    const pathname = usePathname();
    const { isAdmin } = useAuth();

    if (!isAdmin || pathname === '/login') return null;

    return (
        <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur md:hidden" aria-label="Navigasi admin">
            <div className="grid grid-cols-5 gap-1">
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
                            className={`flex min-h-14 items-center justify-center rounded-xl transition-colors ${
                                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                        >
                            <Icon className="h-6 w-6" aria-hidden="true" />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
