import { AlertCircle } from 'lucide-react';

type ErrorStateProps = {
    message: string;
}

export default function ErrorState({
    message
}: ErrorStateProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{message}</p>
        </div>
    );
}
