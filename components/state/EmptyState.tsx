import { ReactNode } from "react";
import { FileText } from 'lucide-react';

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
                    <FileText className="w-8 h-8 text-neutral-400" />
                )}
            </div>
            <p className="text-neutral-500 mb-2">{title}</p>
            {description && (
                <p className="text-sm text-neutral-400">{description}</p>
            )}
        </div>
    );
}
