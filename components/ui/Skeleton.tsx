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
        <div className="bg-white rounded-xl p-4 border border-neutral-200 min-h-22">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                </div>
            </div>
            <Skeleton className="h-3 w-full mt-3" />
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
        <div className="space-y-4">
            <Skeleton className="h-9 w-20 rounded-lg" />
            {/* Customer Header */}
            <div className="bg-white rounded-xl p-4 border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-14 h-14 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="w-9 h-9 rounded-lg" />
                        <Skeleton className="w-9 h-9 rounded-lg" />
                    </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Sisa Tagihan (Outstanding Balance Card) */}
            <Skeleton className="h-32 w-full rounded-xl" />

            {/* Riwayat Pembayaran (Payment History) */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
                <Skeleton className="h-4 w-36" />
                <div className="space-y-3">
                    <div className="flex justify-between items-start pb-3 border-b border-neutral-100">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </div>

            {/* Payment Container */}
            <SkeletonPaymentContainer />

            {/* Riwayat Tagihan (Billing History) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
                <SkeletonBillCard />
                <SkeletonBillCard />
                <SkeletonBillCard />
            </div>
        </div>
    );
}

export function SkeletonOnlinePaymentStatus() {
    return (
        <div className="space-y-4 pt-1">
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
            </div>
            <div className="space-y-3">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <Skeleton className="h-11 w-full rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonOnlinePayment() {
    return (
        <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
            <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-56" />
                </div>
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
        </div>
    );
}

export function SkeletonPaymentContainer() {
    return (
        <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <SkeletonOnlinePayment />
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

export function SkeletonDashboard() {
    return (
        <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-2.5 md:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full md:w-28 rounded-lg" />
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex gap-6"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-2.5 md:p-4 space-y-3">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex gap-6"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
                    </div>
                </div>
                <div className="col-start-1 row-start-2 md:col-auto md:row-auto bg-white rounded-xl border border-neutral-200 p-2.5 md:p-4 flex items-center gap-2 md:gap-4">
                    <Skeleton className="h-8 w-8 md:h-12 md:w-12 rounded-lg" />
                    <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-10" /></div>
                </div>
                <div className="col-start-2 row-start-2 md:col-auto md:row-auto bg-white rounded-xl border border-neutral-200 p-2.5 md:p-4 flex items-center gap-2 md:gap-4">
                    <Skeleton className="h-8 w-8 md:h-12 md:w-12 rounded-lg" />
                    <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-24" /></div>
                </div>
                <div className="col-start-1 row-start-3 col-span-2 md:col-span-2 md:row-auto lg:col-span-4 lg:col-start-auto lg:row-start-auto bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-3 md:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-32 rounded-lg" /></div>
                    <Skeleton className="h-44 sm:h-60 md:h-72 w-full rounded-lg" />
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-28 rounded-lg" /></div>
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonFormCard() {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-32" />
        </div>
    );
}

export function SkeletonImportForm() {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-64" />
            </div>
            <div className="bg-white border-2 border-dashed border-neutral-200 rounded-xl p-8">
                <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="border-t border-neutral-200 pt-4 space-y-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonSettingsForm() {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 md:p-6 space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-88 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="flex flex-col md:flex-row gap-3">
                <Skeleton className="h-10 w-full md:w-48 rounded-lg" />
                <Skeleton className="h-10 w-full md:w-40 rounded-lg" />
            </div>
        </div>
    );
}

export function SkeletonPaymentProofCard() {
    return (
        <article className="bg-white rounded-xl border border-neutral-200 p-3 space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-2.5 w-28" />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-2.5">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
        </article>
    );
}

export function SkeletonPaymentProofList({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonPaymentProofCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonPeriodDetail() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 animate-formal-fade-in">
            <div className="p-4 md:p-6 min-w-0">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="w-7 h-7 rounded-full" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-4 w-12 rounded" />
                            </div>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 md:p-6 min-w-0">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="w-7 h-7 rounded-full" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-4 w-16 rounded" />
                            </div>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
