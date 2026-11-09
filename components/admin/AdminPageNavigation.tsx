'use client';

import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface AdminPageNavigationProps {
    backHref?: string;
    backLabel?: string;
}

export function DashboardNavigationButton() {
    return (
        <Link
            href="/admin/dashboard"
            aria-label="Buka Dashboard"
            title="Buka Dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
        >
            <BarChart3 className="h-5 w-5" />
        </Link>
    );
}

export default function AdminPageNavigation({
    backHref = '/admin/dashboard',
    backLabel = 'Kembali',
}: AdminPageNavigationProps) {
    return (
        <div className="flex items-center gap-3">
            <BackButton href={backHref} label={backLabel} />
        </div>
    );
}
