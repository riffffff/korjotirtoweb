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

// Key for localStorage
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // Default collapsed, hydrated from localStorage
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
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
                {/* Sidebar - visible on md+, no transition until hydrated to prevent flash */}
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

                {/* Main content - shifts right on md+ to accommodate sidebar */}
                <div className={`${isHydrated ? 'transition-all duration-300' : ''} ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
