'use client';
import { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    isCollapsed: false,
    toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            <div className="min-h-screen bg-neutral-50">
                {/* Sidebar - visible on md+ */}
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

                {/* Main content - shifts right on md+ to accommodate sidebar */}
                <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
