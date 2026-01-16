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
    // Start with collapsed, will be corrected immediately on mount
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    // Sync with localStorage immediately on mount
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        const collapsed = saved === null ? true : saved === 'true';
        setIsCollapsed(collapsed);
        setIsHydrated(true);
    }, []);

    const toggleSidebar = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            <div className="min-h-screen bg-neutral-50">
                {/* Hide sidebar until hydrated to prevent flash */}
                <div className={isHydrated ? '' : 'md:invisible'}>
                    <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
                </div>
                <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
