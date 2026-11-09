interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}
import { Loader2 } from 'lucide-react';

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300',
        secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:bg-neutral-50',
        danger: 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300',
        success: 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300',
    };

    const sizes = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-6 py-4 text-lg',
    };

    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {loading && (
                <Loader2 className="animate-spin w-4 h-4" />
            )}
            {children}
        </button>
    );
}
