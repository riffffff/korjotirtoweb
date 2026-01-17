'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: 'Pelanggan',
        href: '/',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        label: 'Import Data',
        href: '/admin/import',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: 'Tambah Pelanggan',
        href: '/admin/customer/new',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: 'Pengaturan',
        href: '/admin/settings',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        adminOnly: true,
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin } = useAuth();

    const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

    const handleNavigation = (href: string) => {
        router.push(href);
    };

    return (
        <aside className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-neutral-800 text-white transition-all duration-300 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
            {/* Logo & Toggle */}
            <div className="px-3 py-4 border-b border-neutral-700 flex items-center justify-between min-h-[60px]">
                {!isCollapsed && (
                    <div className="px-1 overflow-hidden">
                        <h1 className="text-lg font-bold whitespace-nowrap">Korjo Tirto</h1>
                        <p className="text-xs text-neutral-400 whitespace-nowrap">Sistem Pembayaran Air</p>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isCollapsed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <button
                            key={item.href}
                            onClick={() => handleNavigation(item.href)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            {!isCollapsed && (
                <div className="px-4 py-3 border-t border-neutral-700">
                    <p className="text-xs text-neutral-500">© 2025 Korjo Tirto</p>
                </div>
            )}
        </aside>
    );
}
