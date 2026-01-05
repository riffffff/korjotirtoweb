import { ReactNode } from "react";

type EmptyStateProps = {
    title?: string;
    description?: string;
    icon?: ReactNode;
}

export default function EmptyState({
    title = "Tidak ada data",
    description,
    icon
}: EmptyStateProps) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-10 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {icon || (
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
            </div>
            <p className="text-neutral-500 mb-2">{title}</p>
            {description && (
                <p className="text-sm text-neutral-400">{description}</p>
            )}
        </div>
    );
}
