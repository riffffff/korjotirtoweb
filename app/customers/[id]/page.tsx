'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCustomerDetail } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
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

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? -1 : index);
    };

    if (loading) return <LoadingState message="Memuat data pelanggan..." />;
    if (error) return <ErrorState message={error} />;
    if (!customer) return <ErrorState message="Pelanggan tidak ditemukan" />;

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
                    <p className="text-white/80 text-sm font-medium">Total Tunggakan</p>
                    <p className="text-white text-3xl font-bold">
                        {formatCurrency(customer.outstandingBalance)}
                    </p>
                    <div className="flex gap-4 text-white/70 text-xs mt-2">
                        <span>Total Tagihan: {formatCurrency(customer.totalBill)}</span>
                        <span>Dibayar: {formatCurrency(customer.totalPaid)}</span>
                    </div>
                </div>

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
                        <p className="text-green-500 text-sm">Tidak ada tunggakan</p>
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
