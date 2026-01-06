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
import { formatCurrency } from '@/lib/formatCurrency';

export default function CustomerBillDetailPage() {
    const params = useParams();
    const { isAdmin } = useAuth();
    const customerId = params?.customerId ? Number(params.customerId) : null;
    const year = params?.year as string | undefined;
    const month = params?.month as string | undefined;

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
        if (!customerId) return;
        try {
            await billService.payCustomer(customerId, amountPaid);
            window.location.reload();
        } catch (err) {
            console.error('Payment failed:', err);
        }
    };

    if (loading) return <LoadingState message="Memuat detail tagihan..." />;
    if (error) return <ErrorState message={error} />;
    if (!bill) return <ErrorState message="Data tidak ditemukan" />;

    // Get customer totals from response
    const outstandingBalance = customer?.outstandingBalance ?? 0;
    const customerTotalBill = customer?.totalBill ?? 0;
    const customerTotalPaid = customer?.totalPaid ?? 0;

    return (
        <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm space-y-4">
            <BackButton href="/" />

            {/* Customer Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-800">{customer?.name}</h1>
                <p className="text-sm text-neutral-500">No. Pelanggan: {customer?.customerNumber}</p>
                {customer?.phone && (
                    <p className="text-xs text-neutral-400">{customer.phone}</p>
                )}
            </div>

            {/* Customer Outstanding Balance Card */}
            <div className={`rounded-xl p-4 ${outstandingBalance > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}>
                <p className="text-white/80 text-xs font-medium">Total Tunggakan</p>
                <p className="text-white text-2xl font-bold">
                    {formatCurrency(outstandingBalance)}
                </p>
                <div className="flex justify-between text-white/70 text-xs mt-2">
                    <span>Total Tagihan: {formatCurrency(customerTotalBill)}</span>
                    <span>Dibayar: {formatCurrency(customerTotalPaid)}</span>
                </div>
            </div>

            {/* Period Info */}
            <div className="text-center py-2 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-400">Tagihan Periode</p>
                <p className="text-lg font-semibold text-neutral-700">
                    {month}/{year}
                </p>
            </div>

            {/* Meter Reading */}
            <StandMeter
                meterStart={meterStart}
                meterEnd={meterEnd}
                usage={usage}
            />

            {/* Bill Details */}
            <DetailStandMeter
                k1={k1Usage}
                k2={k2Usage}
                amountK1={k1Amount}
                amountK2={k2Amount}
                totalAmount={totalAmount}
            />

            {/* Bill Status */}
            <div className={`py-2 px-3 rounded-lg flex justify-between items-center ${paymentStatus === 'paid' ? 'bg-green-50' :
                    paymentStatus === 'partial' ? 'bg-yellow-50' : 'bg-neutral-50'
                }`}>
                <span className="text-sm text-neutral-600">Status Bulan Ini</span>
                <span className={`font-semibold ${paymentStatus === 'paid' ? 'text-green-600' :
                        paymentStatus === 'partial' ? 'text-yellow-600' : 'text-neutral-600'
                    }`}>
                    {paymentStatus === 'paid' ? '✓ LUNAS' :
                        paymentStatus === 'partial' ? 'SEBAGIAN' : 'BELUM BAYAR'}
                </span>
            </div>

            {/* Payment Section - Admin only, show if customer has outstanding */}
            {isAdmin && outstandingBalance > 0 && (
                <PaymentSection
                    totalAmount={outstandingBalance}
                    onPay={handlePayment}
                />
            )}

            {/* All Paid */}
            {outstandingBalance === 0 && (
                <div className="py-4 bg-green-50 rounded-lg text-center">
                    <p className="text-green-600 font-semibold text-lg">✓ LUNAS SEMUA</p>
                    <p className="text-green-500 text-sm">Tidak ada tunggakan</p>
                </div>
            )}

            {/* Info for non-admin */}
            {!isAdmin && outstandingBalance > 0 && (
                <div className="py-4 bg-yellow-50 rounded-lg text-center">
                    <p className="text-yellow-600 text-sm">
                        Untuk pembayaran, silakan hubungi admin.
                    </p>
                </div>
            )}
        </div>
    );
}
