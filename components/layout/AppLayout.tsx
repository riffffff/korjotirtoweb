'use client';
import { useState, useEffect, createContext, useContext, useRef } from 'react';
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

interface SidebarProviderProps {
    children: React.ReactNode;
}

// This component should be placed in root layout.tsx so sidebar doesn't remount
export function SidebarProvider({ children }: SidebarProviderProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    // Read from localStorage after hydration
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
        setIsHydrated(true);
    }, []);
    
    // Save to localStorage when changed (after hydration)
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
        }
    }, [isCollapsed, isHydrated]);

    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev);
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            <div className="min-h-screen bg-neutral-50">
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
                <div className={`md:transition-[padding-left] md:duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}

// Wrapper for pages - no longer handles sidebar, just passes through
interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // AppLayout is now just a passthrough since sidebar is in root layout
    return <>{children}</>;
}
