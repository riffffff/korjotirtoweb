'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './Sidebar';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    isCollapsed: true,
    toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // Read initial from data attribute (set by inline script)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.getAttribute('data-sidebar-collapsed') !== 'false';
        }
        return true;
    });

    const toggleSidebar = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
        document.documentElement.setAttribute('data-sidebar-collapsed', String(newValue));
    };

    // Sync on mount for SSR
    useEffect(() => {
        const attr = document.documentElement.getAttribute('data-sidebar-collapsed');
        const collapsed = attr !== 'false';
        setIsCollapsed(collapsed);
    }, []);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            <div className="min-h-screen bg-neutral-50">
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
                {/* Use CSS variable for padding to prevent flash */}
                <div className="hidden md:block main-padding transition-[padding] duration-300">
                    <div className="md:hidden" />
                </div>
                <div className="md:main-padding transition-[padding] duration-300">
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
