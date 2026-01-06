'use client';
import { useParams } from 'next/navigation';
import { useBillDetailByPeriod } from '@/hooks/useBillDetail';
import { useAuth } from '@/hooks/useAuth';
import StandMeter from '@/components/StandMeter';
import DetailStandMeter from '@/components/DetailStandMeter';
import PaymentSection from '@/components/PaymentSection';
import BackButton from '@/components/BackButton';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import { billService } from '@/services/billService';

export default function CustomerBillDetailPage() {
    const params = useParams();
    const { isAdmin } = useAuth();
    const customerId = params?.customerId ? Number(params.customerId) : null;
    const year = params?.year as string | undefined;
    const month = params?.month as string | undefined;

    // Use hook instead of manual useEffect - all fetching and parsing done inside hook
    const {
        bill,
        loading,
        error,
        meterStart,
        meterEnd,
        usage,
        k1Usage,
        k2Usage,
        k1Amount,
        k2Amount,
        totalAmount,
        paymentStatus,
        customer,
    } = useBillDetailByPeriod(customerId, year, month);

    const handlePayment = async (amountPaid: number) => {
        if (!bill?.id) return;
        try {
            await billService.pay(bill.id, { amountPaid });
            window.location.reload();
        } catch (err) {
            console.error('Payment failed:', err);
        }
    };

    if (loading) return <LoadingState message="Memuat detail tagihan..." />;
    if (error) return <ErrorState message={error} />;
    if (!bill) return <ErrorState message="Data tidak ditemukan" />;

    return (
        <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm space-y-4">
            <BackButton href="/" />

            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-800">Detail Tagihan</h1>
                <p className="text-sm text-neutral-500">{customer?.name}</p>
                <p className="text-xs text-neutral-400">No. Pelanggan: {customer?.customerNumber}</p>
            </div>

            <StandMeter
                meterStart={meterStart}
                meterEnd={meterEnd}
                usage={usage}
            />

            <DetailStandMeter
                k1={k1Usage}
                k2={k2Usage}
                amountK1={k1Amount}
                amountK2={k2Amount}
                totalAmount={totalAmount}
            />

            {/* Payment section - only visible to admin */}
            {isAdmin && paymentStatus !== 'paid' && (
                <PaymentSection
                    totalAmount={totalAmount}
                    onPay={handlePayment}
                />
            )}

            {paymentStatus === 'paid' && (
                <div className="py-4 bg-green-50 rounded-lg text-center">
                    <p className="text-green-600 font-semibold">✓ LUNAS</p>
                </div>
            )}

            {/* Info for non-admin users */}
            {!isAdmin && paymentStatus !== 'paid' && (
                <div className="py-4 bg-yellow-50 rounded-lg text-center">
                    <p className="text-yellow-600 text-sm">
                        Untuk melakukan pembayaran, silakan hubungi admin.
                    </p>
                </div>
            )}
        </div>
    );
}

