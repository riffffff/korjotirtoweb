'use client';
import { useRouter } from 'next/navigation';

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

    const handleClick = () => {
        if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition ${className}`}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {label}
        </button>
    );
}
