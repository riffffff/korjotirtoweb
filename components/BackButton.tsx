'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type BackButtonProps = {
    label?: string;
    className?: string;
    href?: string; // Navigasi eksplisit jika diberikan
}

export default function BackButton({
    label = 'Kembali',
    className = '',
    href
}: BackButtonProps) {
    const router = useRouter();

    if (href) {
        return (
            <Link
                href={href}
                className={`flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition ${className}`}
            >
                <ChevronLeft className="w-4 h-4" />
                {label}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={() => router.back()}
            className={`flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition ${className}`}
        >
            <ChevronLeft className="w-4 h-4" />
            {label}
        </button>
    );
}
