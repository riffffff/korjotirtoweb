import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 md:gap-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-neutral-800">{title}</h1>
                    {subtitle && <p className="text-xs md:text-sm text-neutral-500">{subtitle}</p>}
                </div>
                {actions}
            </div>
        </header>
    );
}
