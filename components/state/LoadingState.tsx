import { SkeletonList, SkeletonDetailCard } from '@/components/ui/Skeleton';

type LoadingStateProps = {
    message?: string;
    variant?: 'spinner' | 'skeleton-list' | 'skeleton-detail';
    count?: number;
}

export default function LoadingState({
    message = "Memuat data...",
    variant = 'spinner',
    count = 5
}: LoadingStateProps) {
    if (variant === 'skeleton-list') {
        return <SkeletonList count={count} />;
    }

    if (variant === 'skeleton-detail') {
        return <SkeletonDetailCard />;
    }

    return (
        <div className="flex justify-center items-center py-20">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-lg text-primary-600">{message}</p>
            </div>
        </div>
    );
}
