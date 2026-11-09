'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/ui/Logo';
import { BarChart3, Users, Upload, Settings, ChevronsLeft, ChevronsRight, LogOut, WalletCards } from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3, adminOnly: true },
    { label: 'Pelanggan', href: '/', icon: Users },
    { label: 'Pembayaran Online', href: '/admin/payment-proofs', icon: WalletCards, adminOnly: true },
    { label: 'Import Data', href: '/admin/import', icon: Upload, adminOnly: true },
    { label: 'Pengaturan', href: '/admin/settings', icon: Settings, adminOnly: true },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin, logout } = useAuth();
    const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

    return (
        <aside className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-neutral-800 text-white transition-all duration-300 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
            <div className="px-3 py-4 border-b border-neutral-700 flex items-center justify-between min-h-[60px]">
                {!isCollapsed && (
                    <div className="px-1 overflow-hidden">
                        <Logo size="md" theme="dark" showText={true} />
                    </div>
                )}
                <button onClick={onToggle} className={`p-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    {isCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
                </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {filteredItems.map(({ label, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        aria-current={pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? label : undefined}
                    >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
                    </Link>
                ))}
            </nav>
            <div className="px-2 py-3 border-t border-neutral-700">
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => {
                            void logout().then(() => router.push('/'));
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-neutral-300 hover:bg-red-600 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Keluar' : undefined}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">Keluar</span>}
                    </button>
                )}
                {!isCollapsed && <p className="px-2 pt-3 text-xs text-neutral-500">© {new Date().getFullYear()} Korjo Tirto</p>}
            </div>
        </aside>
    );
}
