interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-600">
                {label}
            </label>
            <input
                {...props}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200
                    ${error
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                        : 'border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                    focus:outline-none ${className}`}
            />
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}
