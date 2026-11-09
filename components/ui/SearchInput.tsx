'use client';

import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
    value: string;
    onChange: (value: string) => void;
    size?: 'sm' | 'md';
    containerClassName?: string;
}

export default function SearchInput({
    value,
    onChange,
    placeholder = 'Cari...',
    size = 'md',
    containerClassName = '',
    className = '',
    ...props
}: SearchInputProps) {
    const isSmall = size === 'sm';

    return (
        <div className={`relative ${containerClassName}`}>
            <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none ${
                    isSmall ? 'w-4 h-4' : 'w-5 h-5'
                }`}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full rounded-xl border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isSmall ? 'min-h-10 pl-9 pr-8 py-2 text-xs' : 'pl-10 pr-9 py-3 text-sm'
                } ${className}`}
                {...props}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                    <X className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                </button>
            )}
        </div>
    );
}

