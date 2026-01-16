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

// Read initial state from data attribute (set by inline script before hydration)
function getInitialCollapsed(): boolean {
    if (typeof document !== 'undefined') {
        const attr = document.documentElement.getAttribute('data-sidebar-collapsed');
        return attr !== 'false';
    }
    return true;
}

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);

    const toggleSidebar = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
        document.documentElement.setAttribute('data-sidebar-collapsed', String(newValue));
    };

    // Sync with localStorage on mount (for SSR)
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved !== null) {
            const collapsed = saved === 'true';
            setIsCollapsed(collapsed);
            document.documentElement.setAttribute('data-sidebar-collapsed', String(collapsed));
        }
    }, []);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            <div className="min-h-screen bg-neutral-50">
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
                <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
