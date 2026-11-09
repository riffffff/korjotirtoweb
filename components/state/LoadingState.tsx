import {
    SkeletonDashboard,
    SkeletonFormCard,
    SkeletonImportForm,
    SkeletonList,
    SkeletonDetailCard,
    SkeletonSettingsForm,
    SkeletonOnlinePayment,
    SkeletonPaymentProofList,
    SkeletonPeriodDetail,
} from '@/components/ui/Skeleton';

type LoadingStateProps = {
    message?: string;
    variant?: 'skeleton-list' | 'skeleton-detail' | 'skeleton-dashboard' | 'skeleton-form' | 'skeleton-import' | 'skeleton-settings' | 'skeleton-online-payment' | 'skeleton-payment-proofs' | 'skeleton-period-detail';
    count?: number;
}

export default function LoadingState({
    variant = 'skeleton-list',
    count = 5
}: LoadingStateProps) {
    if (variant === 'skeleton-list') {
        return <SkeletonList count={count} />;
    }

    if (variant === 'skeleton-detail') {
        return <SkeletonDetailCard />;
    }
    if (variant === 'skeleton-dashboard') return <SkeletonDashboard />;
    if (variant === 'skeleton-import') return <SkeletonImportForm />;
    if (variant === 'skeleton-settings') return <SkeletonSettingsForm />;
    if (variant === 'skeleton-online-payment') return <SkeletonOnlinePayment />;
    if (variant === 'skeleton-payment-proofs') return <SkeletonPaymentProofList count={count} />;
    if (variant === 'skeleton-period-detail') return <SkeletonPeriodDetail />;
    return <SkeletonFormCard />;
}
