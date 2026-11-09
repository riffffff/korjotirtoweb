'use client';

import { useId } from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    theme?: 'light' | 'dark';
    className?: string;
}

const ICON_SIZES = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
};

const TEXT_SIZES = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
};

export default function Logo({
    size = 'md',
    showText = true,
    theme = 'light',
    className = '',
}: LogoProps) {
    const rawId = useId().replace(/:/g, '');
    const gradId = `kt-drop-grad-${rawId}`;
    const clipId = `kt-drop-clip-${rawId}`;

    return (
        <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
            <svg
                className={`${ICON_SIZES[size]} shrink-0`}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id={gradId} x1="18" y1="6" x2="46" y2="48" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <clipPath id={clipId}>
                        <path d="M32 5C32 5 49 24.5 49 35.5C49 44.8888 41.3888 51.5 32 51.5C22.6112 51.5 15 44.8888 15 35.5C15 24.5 32 5 32 5Z" />
                    </clipPath>
                </defs>

                {/* Water Ripple Rings at Bottom (Bekas Tetesan Air) */}
                <ellipse
                    cx="32"
                    cy="56.5"
                    rx="22"
                    ry="5"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="45 18"
                    strokeLinecap="round"
                    opacity="0.65"
                />
                <ellipse
                    cx="32"
                    cy="56.5"
                    rx="14"
                    ry="3.2"
                    stroke="#0284c7"
                    strokeWidth="2.8"
                />

                {/* Splash Droplets Left & Right */}
                <circle cx="11" cy="49" r="2" fill="#38bdf8" />
                <circle cx="53" cy="49" r="2" fill="#38bdf8" />

                {/* Main Water Droplet + Inner Waves */}
                <g clipPath={`url(#${clipId})`}>
                    <path
                        d="M32 5C32 5 49 24.5 49 35.5C49 44.8888 41.3888 51.5 32 51.5C22.6112 51.5 15 44.8888 15 35.5C15 24.5 32 5 32 5Z"
                        fill={`url(#${gradId})`}
                    />
                    <path
                        d="M12 38.5C19 33.5 25 33.5 32 38.5C39 43.5 45 43.5 52 38.5V54H12V38.5Z"
                        fill="#7dd3fc"
                        fillOpacity="0.45"
                    />
                    <path
                        d="M12 43C19 39 25 39 32 43C39 47 45 47 52 43V54H12V43Z"
                        fill="#bae6fd"
                        fillOpacity="0.65"
                    />
                </g>

                {/* Glossy Water Highlight */}
                <path
                    d="M23.5 24.5C21.2 28.2 20.2 31.8 20.5 35.2"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    opacity="0.78"
                />
            </svg>

            {showText && (
                <span
                    className={`${TEXT_SIZES[size]} font-bold tracking-tight whitespace-nowrap ${
                        theme === 'dark' ? 'text-white' : 'text-neutral-800'
                    }`}
                >
                    Korjo Tirto
                </span>
            )}
        </div>
    );
}

