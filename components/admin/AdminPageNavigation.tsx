'use client';

import { BarChart3 } from 'lucide-react';
import Link from 'next/link';

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

export default function AdminPageNavigation() {
    return null;
}
