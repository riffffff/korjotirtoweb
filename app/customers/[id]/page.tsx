'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useCustomerDetail, clearCustomerCaches } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { customerClient as customerService } from '@/services/client/customer.client';
import { billClient } from '@/services/client/bill.client';
import { openBillNotification } from '@/lib/whatsapp';
import AppLayout from '@/components/layout/AppLayout';
import PaymentSection from '@/components/customer/PaymentSection';
import OnlinePaymentSection from '@/components/customer/OnlinePaymentSection';
import PaymentContainer from '@/components/customer/PaymentContainer';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import Modal from '@/components/ui/Modal';
import CustomerForm from '@/components/customer/CustomerForm';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDateShort, formatDateTime, formatPeriod } from '@/lib/formatDate';
import { ArrowLeft, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/Icons';

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAdmin } = useAuth();
    const { settings } = useSettings();
    const idParam = typeof params?.id === 'string' ? params.id : null;
    const customerNumberParam = typeof params?.customerNumber === 'string' ? params.customerNumber : null;
    const routeIdentifier = customerNumberParam || idParam;
    const customerId = routeIdentifier;
    const { customer, bills, payments, loading, error, refetch } = useCustomerDetail(customerId);

    // Track which bill is expanded (latest by default = index 0)
    const [expandedIndex, setExpandedIndex] = useState<number>(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // State for delete bill
    const [showDeleteBillConfirm, setShowDeleteBillConfirm] = useState(false);
    const [billToDelete, setBillToDelete] = useState<{ id: string; period: string } | null>(null);
    const [deletingBill, setDeletingBill] = useState(false);

    // State for add bill
    const [showAddBillModal, setShowAddBillModal] = useState(false);
    const [newBillPeriod, setNewBillPeriod] = useState('');
    const [newBillMeterStart, setNewBillMeterStart] = useState('');
    const [newBillMeterEnd, setNewBillMeterEnd] = useState('');
    const [addingBill, setAddingBill] = useState(false);
    const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

    const handlePayment = async (amount: number, saveToBalance: number = 0, balanceUsed: number = 0) => {
        if (!customerId) return;
        try {
            await customerService.pay(customerId, amount, saveToBalance, balanceUsed);
            clearCustomerCaches();
            refetch();
        } catch (err) {
            console.error('Payment failed:', err);
        }
    };

    const [sendingWA, setSendingWA] = useState(false);
    const [waResult, setWaResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSendWhatsApp = async () => {
        if (!customer || !customerId) return;
        setSendingWA(true);
        setWaResult(null);

        const unpaidBills = bills.filter((b) => b.paymentStatus !== 'PAID');
        const result = openBillNotification(
            customer,
            unpaidBills,
            settings.wa_bill_template || settings.wa_message_text
        );

        setSendingWA(false);
        if (result.success) {
            // Update lastNotifiedAt in database
            await customerService.notify(customerId);
            setWaResult({ success: true, message: 'Pesan terkirim!' });
            refetch(); // Refresh to get updated lastNotifiedAt
        } else {
            setWaResult({ success: false, message: result.error || 'Gagal mengirim' });
        }

        // Clear message after 3 seconds
        setTimeout(() => setWaResult(null), 3000);
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? -1 : index);
    };

    // Handle edit customer
    const handleEditCustomer = async (data: { name: string; customerNumber: string; phone: string }) => {
        if (!customerId) return;
        try {
            const result = await customerService.update(customerId, { name: data.name, phone: data.phone });
            if (result.success) {
                setShowEditModal(false);
                clearCustomerCaches();
                refetch();
            } else {
                setFeedback({ title: 'Gagal mengupdate pelanggan', message: result.error || 'Perubahan tidak dapat disimpan.' });
            }
        } catch (error) {
            console.error('Failed to update customer:', error);
            setFeedback({ title: 'Gagal mengupdate pelanggan', message: 'Terjadi kesalahan saat menyimpan perubahan.' });
        }
    };

    // Handle delete customer
    const handleDeleteCustomer = async () => {
        if (!customerId) return;
        setDeleting(true);
        try {
            const result = await customerService.delete(customerId);
            if (result.success) {
                clearCustomerCaches();
                router.push('/');
            } else {
                setFeedback({ title: 'Gagal menghapus pelanggan', message: result.error || 'Data pelanggan tidak dapat dihapus.' });
            }
        } catch (error) {
            console.error('Failed to delete customer:', error);
            setFeedback({ title: 'Gagal menghapus pelanggan', message: 'Terjadi kesalahan saat menghapus pelanggan.' });
        } finally {
            setDeleting(false);
        }
    };

    // Handle delete bill
    const handleDeleteBill = async () => {
        if (!billToDelete) return;
        setDeletingBill(true);
        try {
            const result = await customerService.deleteBill(billToDelete.id);
            if (result.success) {
                setShowDeleteBillConfirm(false);
                setBillToDelete(null);
                clearCustomerCaches();
                refetch();
            } else {
                setFeedback({ title: 'Gagal menghapus tagihan', message: result.error || 'Data tagihan tidak dapat dihapus.' });
            }
        } catch (error) {
            console.error('Failed to delete bill:', error);
            setFeedback({ title: 'Gagal menghapus tagihan', message: 'Terjadi kesalahan saat menghapus tagihan.' });
        } finally {
            setDeletingBill(false);
        }
    };

    const openDeleteBillModal = (bill: { id: string; period: string }) => {
        setBillToDelete(bill);
        setShowDeleteBillConfirm(true);
    };

    // Handle add bill for this customer
    const handleAddBill = async () => {
        if (!customerId || !newBillPeriod || !newBillMeterEnd) {
            setFeedback({ title: 'Data belum lengkap', message: 'Periode dan meter akhir wajib diisi.' });
            return;
        }

        // If no previous bills, require meter start
        if (bills.length === 0 && !newBillMeterStart) {
            setFeedback({ title: 'Data belum lengkap', message: 'Meter awal wajib diisi untuk tagihan pertama.' });
            return;
        }

        setAddingBill(true);
        try {
            const payload: { period: string; meterEnd: number; meterStart?: number } = {
                period: newBillPeriod,
                meterEnd: parseInt(newBillMeterEnd, 10),
            };

            // Include meter start if this is first bill
            if (bills.length === 0 && newBillMeterStart) {
                payload.meterStart = parseInt(newBillMeterStart, 10);
            }

            await billClient.createForCustomer(customerId, payload);
            setShowAddBillModal(false);
            setNewBillPeriod('');
            setNewBillMeterStart('');
            setNewBillMeterEnd('');
            clearCustomerCaches();
            refetch();
        } catch (error) {
            console.error('Failed to add bill:', error);
            setFeedback({ title: 'Gagal menambah tagihan', message: 'Terjadi kesalahan saat membuat tagihan.' });
        } finally {
            setAddingBill(false);
        }
    };

    if (loading) return <AppLayout><main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6"><LoadingState variant="skeleton-detail" /></main></AppLayout>;
    if (error) return <AppLayout><ErrorState message={error} /></AppLayout>;
    if (!customer) return <AppLayout><ErrorState message="Pelanggan tidak ditemukan" /></AppLayout>;

    const unpaidBills = bills.filter((b) => b.paymentStatus !== 'PAID');

    return (<>
        <AppLayout>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
                {/* Desktop Breadcrumbs */}
                <div className="hidden md:flex items-center gap-2 text-sm text-neutral-500">
                    <Link href="/" className="hover:text-blue-600 transition-colors">
                        Pelanggan
                    </Link>
                    <span>/</span>
                    <span className="text-neutral-800 font-medium">{customer.name}</span>
                </div>

                {/* Customer Header */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <Link
                                href="/"
                                aria-label="Kembali ke Daftar Pelanggan"
                                title="Kembali ke Daftar Pelanggan"
                                className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 font-bold text-lg md:text-xl">
                                    {customer.customerNumber}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-xl font-bold text-neutral-800 truncate">{customer.name}</h1>
                                {customer.phone && (
                                    <p className="text-xs md:text-sm text-neutral-500 truncate">{customer.phone}</p>
                                )}
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                    title="Hapus"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* WhatsApp Button - Admin only, if has phone and unpaid bills */}
                    {isAdmin && customer.phone && unpaidBills.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={sendingWA}
                                className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                            >
                                <WhatsAppIcon className="w-4 h-4" />
                                {sendingWA ? 'Mengirim...' : 'Kirim Tagihan via WhatsApp'}
                            </button>
                            {waResult && (
                                <div className={`text-center text-sm py-2 rounded-lg ${waResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {waResult.message}
                                </div>
                            )}
                            {customer.lastNotifiedAt && (
                                <p className="text-xs text-neutral-400 text-center">
                                    Terakhir dikirim: {formatDateTime(customer.lastNotifiedAt)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Outstanding Balance Card - Only show when there's outstanding balance */}
                {customer.unpaidTotal > 0 && (
                    <div className="rounded-xl p-4 bg-linear-to-r from-orange-500 to-red-500">
                    <p className="text-white/80 text-sm font-medium">Sisa Tagihan</p>
                    <p className="text-white text-3xl font-bold">
                        {formatCurrency(customer.unpaidTotal)}
                    </p>

                    {/* Breakdown per bulan */}
                    {unpaidBills.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                            <p className="text-white/70 text-xs mb-2">Rincian:</p>
                            <div className="space-y-1">
                                {unpaidBills.map((bill) => (
                                    <div key={bill.id} className="flex justify-between text-xs">
                                        <span className="text-white/80">{formatPeriod(bill.period)}</span>
                                        <span className="text-white font-medium">
                                            {formatCurrency(bill.remaining)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Customer Balance/Deposit Card - Show when customer has saved balance */}
                {customer.depositBalance > 0 && (
                    <div className="rounded-xl p-4 bg-linear-to-r from-blue-500 to-cyan-500">
                        <p className="text-white/80 text-sm font-medium">Saldo Simpanan</p>
                        <p className="text-white text-3xl font-bold">
                            {formatCurrency(customer.depositBalance)}
                        </p>
                        <p className="text-white/70 text-xs mt-1">
                            Dapat digunakan untuk pembayaran selanjutnya
                        </p>
                    </div>
                )}


                {/* Riwayat Pembayaran (Payment History) */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <h2 className="text-sm font-semibold text-neutral-500 mb-3">Riwayat Pembayaran</h2>
                    {!payments || payments.length === 0 ? (
                        <p className="text-sm text-neutral-400 italic">Belum ada riwayat pembayaran</p>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment) => (
                                <div key={payment.id} className="flex justify-between items-start text-sm pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-neutral-800">
                                            {formatDateShort(payment.createdAt)}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-0.5 max-w-50">
                                            {payment.description}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">
                                            {formatCurrency(payment.amount)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {customer.unpaidTotal > 0 && (
                    <PaymentContainer
                        isAdmin={isAdmin}
                        cashPayment={
                            <PaymentSection
                                embedded
                                totalAmount={customer.unpaidTotal}
                                customerBalance={customer.depositBalance}
                                onPay={handlePayment}
                            />
                        }
                        onlinePayment={
                            <OnlinePaymentSection
                                embedded
                                customerId={customer.id}
                                customerName={customer.name}
                                customerNumber={customer.customerNumber}
                                defaultPhone={customer.phone}
                                totalAmount={customer.unpaidTotal}
                                settings={settings}
                            />
                        }
                    />
                )}

                {/* All Paid */}
                {customer.unpaidTotal <= 0 && (
                    <div className="py-4 bg-green-50 rounded-xl text-center border border-green-200">
                        <p className="text-green-600 font-semibold text-lg">✓ LUNAS SEMUA</p>
                        <p className="text-green-500 text-sm">Tidak ada tagihan</p>
                    </div>
                )}

                {/* Bill History */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-neutral-700">Riwayat Tagihan</h2>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    // Set default period to current month
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    setNewBillPeriod(`${year}-${month}`);
                                    setNewBillMeterEnd('');
                                    setShowAddBillModal(true);
                                }}
                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah
                            </button>
                        )}
                    </div>
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
                                            <div className={`w-2 h-2 rounded-full ${bill.paymentStatus === 'PAID' ? 'bg-green-500' :
                                                bill.paymentStatus === 'PARTIAL' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`} />
                                            <div>
                                                <p className="font-semibold text-neutral-800">
                                                    {formatPeriod(bill.period)}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-neutral-400">
                                                        Pemakaian: {bill.usage} m³
                                                    </p>
                                                    {bill.penalty > 0 && (
                                                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                            +Denda
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <div>
                                                    <p className="font-bold text-neutral-800">
                                                    {formatCurrency(bill.penalty > 0 ? bill.totalWithPenalty : bill.totalAmount)}
                                                </p>
                                                <p className={`text-xs ${bill.paymentStatus === 'PAID' ? 'text-green-600' :
                                                    bill.paymentStatus === 'PARTIAL' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {bill.paymentStatus === 'PAID' ? 'Lunas' :
                                                        bill.paymentStatus === 'PARTIAL' ? 'Sebagian' :
                                                            'Belum Bayar'}
                                                </p>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`} />
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
                                                        {['K1', 'k1'].includes(item.type) ? `Pemakaian Air K1 (${item.usage}m³ × Rp${item.rate})` :
                                                            ['K2', 'k2'].includes(item.type) ? `Pemakaian Air K2 (${item.usage}m³ × Rp${item.rate})` :
                                                            ['beban', 'ADMIN_FEE'].includes(item.type) ? 'Biaya Admin / Beban' :
                                                                'Biaya Lainnya'}
                                                    </span>
                                                    <span className="font-medium text-neutral-800">
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                            {bill.penalty > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-red-600">Denda Keterlambatan</span>
                                                    <span className="font-medium text-red-600">
                                                        {formatCurrency(bill.penalty)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between pt-2 border-t border-dashed border-neutral-200">
                                                <span className="font-semibold">Total</span>
                                                <span className="font-bold text-neutral-800">
                                                    {formatCurrency(bill.penalty > 0 ? bill.totalWithPenalty : bill.totalAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete Bill Button - Admin only */}
                                        {isAdmin && (
                                            <div className="pt-3 mt-3 border-t border-neutral-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteBillModal({ id: bill.id, period: bill.period });
                                                    }}
                                                    className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Hapus Tagihan Ini
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>

        {/* Edit Customer Modal */}
        <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Edit Pelanggan"
        >
            <CustomerForm
                initialData={{
                    name: customer.name,
                    customerNumber: String(customer.customerNumber),
                    phone: customer.phone || '',
                }}
                onSubmit={handleEditCustomer}
                onCancel={() => setShowEditModal(false)}
                isEdit
            />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Hapus Pelanggan"
        >
            <div className="space-y-4">
                <p className="text-neutral-600">
                    Yakin ingin menghapus <strong>{customer.name}</strong>?
                    Data pelanggan akan dihapus permanen dari sistem.
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteCustomer}
                        loading={deleting}
                        className="flex-1"
                    >
                        Hapus
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Delete Bill Confirmation Modal */}
        <Modal
            isOpen={showDeleteBillConfirm}
            onClose={() => {
                setShowDeleteBillConfirm(false);
                setBillToDelete(null);
            }}
            title="Hapus Tagihan"
        >
            <div className="space-y-4">
                <p className="text-neutral-600">
                    Yakin ingin menghapus tagihan <strong>{billToDelete ? formatPeriod(billToDelete.period) : ''}</strong>?
                    Data tagihan akan dihapus permanen dari sistem.
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowDeleteBillConfirm(false);
                            setBillToDelete(null);
                        }}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteBill}
                        loading={deletingBill}
                        className="flex-1"
                    >
                        Hapus
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Add Bill Modal */}
        <Modal
            isOpen={showAddBillModal}
            onClose={() => setShowAddBillModal(false)}
            title="Tambah Tagihan"
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Periode
                    </label>
                    <input
                        type="month"
                        value={newBillPeriod}
                        onChange={(e) => setNewBillPeriod(e.target.value)}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {/* Show meter start input if no previous bills */}
                {bills.length === 0 && (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Meter Awal
                        </label>
                        <input
                            type="number"
                            value={newBillMeterStart}
                            onChange={(e) => setNewBillMeterStart(e.target.value)}
                            placeholder="Masukkan angka meter awal"
                            className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-neutral-400 mt-1">
                            Wajib diisi untuk tagihan pertama
                        </p>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Meter Akhir
                    </label>
                    <input
                        type="number"
                        value={newBillMeterEnd}
                        onChange={(e) => setNewBillMeterEnd(e.target.value)}
                        placeholder="Masukkan angka meter akhir"
                        className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {bills.length > 0 && (
                        <p className="text-xs text-neutral-400 mt-1">
                            Meter terakhir: {bills[0]?.meterEnd || 0}
                        </p>
                    )}
                </div>
                <div className="flex gap-3 pt-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowAddBillModal(false)}
                        className="flex-1"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddBill}
                        loading={addingBill}
                        className="flex-1"
                    >
                        Tambah
                    </Button>
                </div>
            </div>
        </Modal>
        <Modal
            isOpen={Boolean(feedback)}
            onClose={() => setFeedback(null)}
            title={feedback?.title || 'Informasi'}
        >
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">{feedback?.message}</p>
                <Button type="button" onClick={() => setFeedback(null)} className="w-full">
                    Mengerti
                </Button>
            </div>
        </Modal>
    </>
    );
}
