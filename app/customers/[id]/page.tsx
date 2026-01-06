'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCustomerDetail } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import { sendBillNotification } from '@/lib/whatsapp';
import BackButton from '@/components/BackButton';
import PaymentSection from '@/components/PaymentSection';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import { formatCurrency } from '@/lib/formatCurrency';

export default function CustomerDetailPage() {
    const params = useParams();
    const { isAdmin } = useAuth();
    const customerId = params?.id ? Number(params.id) : null;
    const { customer, bills, loading, error, refetch } = useCustomerDetail(customerId);

    // Track which bill is expanded (latest by default = index 0)
    const [expandedIndex, setExpandedIndex] = useState<number>(0);

    const handlePayment = async (amount: number) => {
        if (!customerId) return;
        try {
            await customerService.pay(customerId, amount);
            refetch();
        } catch (err) {
            console.error('Payment failed:', err);
        }
    };

    const [sendingWA, setSendingWA] = useState(false);
    const [waResult, setWaResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSendWhatsApp = async () => {
        if (!customer) return;
        setSendingWA(true);
        setWaResult(null);

        const unpaidBills = bills.filter((b) => b.paymentStatus !== 'paid');
        const result = await sendBillNotification(customer, unpaidBills);

        setSendingWA(false);
        if (result.success) {
            setWaResult({ success: true, message: 'Pesan terkirim!' });
        } else {
            setWaResult({ success: false, message: result.error || 'Gagal mengirim' });
        }

        // Clear message after 3 seconds
        setTimeout(() => setWaResult(null), 3000);
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? -1 : index);
    };

    if (loading) return <LoadingState message="Memuat data pelanggan..." />;
    if (error) return <ErrorState message={error} />;
    if (!customer) return <ErrorState message="Pelanggan tidak ditemukan" />;

    const unpaidBills = bills.filter((b) => b.paymentStatus !== 'paid');

    return (
        <div className="min-h-screen bg-neutral-50">
            <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {/* Customer Header */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xl">
                                {customer.customerNumber}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-neutral-800">{customer.name}</h1>
                            {customer.phone && (
                                <p className="text-sm text-neutral-500">{customer.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Outstanding Balance Card */}
                <div className={`rounded-xl p-4 ${customer.outstandingBalance > 0
                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                    <p className="text-white/80 text-sm font-medium">Total Tagihan</p>
                    <p className="text-white text-3xl font-bold">
                        {formatCurrency(customer.outstandingBalance)}
                    </p>
                    <div className="flex gap-4 text-white/70 text-xs mt-2">
                        <span>Total Tagihan: {formatCurrency(customer.totalBill)}</span>
                        <span>Dibayar: {formatCurrency(customer.totalPaid)}</span>
                    </div>
                </div>

                {/* WhatsApp Button - Admin only, if has phone and unpaid bills */}
                {isAdmin && customer.phone && unpaidBills.length > 0 && (
                    <div className="space-y-2">
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={sendingWA}
                            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {sendingWA ? 'Mengirim...' : 'Kirim Tagihan via WhatsApp'}
                        </button>
                        {waResult && (
                            <div className={`text-center text-sm py-2 rounded-lg ${waResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {waResult.message}
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Section - Admin only */}
                {isAdmin && customer.outstandingBalance > 0 && (
                    <PaymentSection
                        totalAmount={customer.outstandingBalance}
                        onPay={handlePayment}
                    />
                )}

                {/* All Paid */}
                {customer.outstandingBalance === 0 && (
                    <div className="py-4 bg-green-50 rounded-xl text-center border border-green-200">
                        <p className="text-green-600 font-semibold text-lg">✓ LUNAS SEMUA</p>
                        <p className="text-green-500 text-sm">Tidak ada tagihan</p>
                    </div>
                )}

                {/* Bill History */}
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-neutral-700">Riwayat Tagihan</h2>

                    {bills.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            Belum ada tagihan
                        </div>
                    ) : (
                        bills.map((bill, index) => (
                            <div
                                key={bill.id}
                                className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
                            >
                                {/* Bill Header - Always visible */}
                                <div
                                    onClick={() => toggleExpand(index)}
                                    className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${bill.paymentStatus === 'paid' ? 'bg-green-500' :
                                                bill.paymentStatus === 'partial' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`} />
                                            <div>
                                                <p className="font-semibold text-neutral-800">
                                                    {formatPeriod(bill.period)}
                                                </p>
                                                <p className="text-xs text-neutral-400">
                                                    Pemakaian: {bill.usage} m³
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <div>
                                                <p className="font-bold text-neutral-800">
                                                    {formatCurrency(bill.totalAmount)}
                                                </p>
                                                <p className={`text-xs ${bill.paymentStatus === 'paid' ? 'text-green-600' :
                                                    bill.paymentStatus === 'partial' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {bill.paymentStatus === 'paid' ? 'Lunas' :
                                                        bill.paymentStatus === 'partial' ? 'Sebagian' :
                                                            'Belum Bayar'}
                                                </p>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-neutral-400 transition-transform ${expandedIndex === index ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Bill Detail - Expandable */}
                                {expandedIndex === index && (
                                    <div className="px-4 pb-4 border-t border-neutral-100">
                                        {/* Meter Reading */}
                                        <div className="grid grid-cols-3 gap-2 py-3">
                                            <div className="text-center">
                                                <p className="text-xs text-neutral-400">Awal</p>
                                                <p className="font-semibold text-neutral-700">{bill.meterStart}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-neutral-400">Akhir</p>
                                                <p className="font-semibold text-neutral-700">{bill.meterEnd}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-neutral-400">Pakai</p>
                                                <p className="font-semibold text-blue-600">{bill.usage} m³</p>
                                            </div>
                                        </div>

                                        {/* Bill Items */}
                                        <div className="space-y-2 pt-2 border-t border-neutral-100">
                                            {bill.items.map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-neutral-600">
                                                        {item.type === 'K1' ? `K1 (${item.usage}m³ × Rp${item.rate})` :
                                                            item.type === 'K2' ? `K2 (${item.usage}m³ × Rp${item.rate})` :
                                                                'Biaya Admin'}
                                                    </span>
                                                    <span className="font-medium text-neutral-800">
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pt-2 border-t border-dashed border-neutral-200">
                                                <span className="font-semibold">Total</span>
                                                <span className="font-bold text-neutral-800">
                                                    {formatCurrency(bill.totalAmount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper to format period "2026-01" to "Januari 2026"
function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}
