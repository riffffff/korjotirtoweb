interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-2">
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonDetailCard() {
    return (
        <div className="bg-white rounded-xl p-4 border border-neutral-200 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-28" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-28" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonBillCard() {
    return (
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
            </div>
        </div>
    );
}
