'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomerDetail } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import { sendBillNotification } from '@/lib/whatsapp';
import BackButton from '@/components/BackButton';
import PaymentSection from '@/components/PaymentSection';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import Modal from '@/components/ui/Modal';
import CustomerForm from '@/components/CustomerForm';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDateShort } from '@/lib/formatDate';

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAdmin } = useAuth();
    const customerId = params?.id ? Number(params.id) : null;
    const { customer, bills, payments, loading, error, refetch } = useCustomerDetail(customerId);

    // Track which bill is expanded (latest by default = index 0)
    const [expandedIndex, setExpandedIndex] = useState<number>(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // State for delete bill
    const [showDeleteBillConfirm, setShowDeleteBillConfirm] = useState(false);
    const [billToDelete, setBillToDelete] = useState<{ id: number; period: string } | null>(null);
    const [deletingBill, setDeletingBill] = useState(false);

    // State for add bill
    const [showAddBillModal, setShowAddBillModal] = useState(false);
    const [newBillPeriod, setNewBillPeriod] = useState('');
    const [newBillMeterStart, setNewBillMeterStart] = useState('');
    const [newBillMeterEnd, setNewBillMeterEnd] = useState('');
    const [addingBill, setAddingBill] = useState(false);

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
        if (!customer || !customerId) return;
        setSendingWA(true);
        setWaResult(null);

        const unpaidBills = bills.filter((b) => b.paymentStatus !== 'paid');
        const result = await sendBillNotification(customer, unpaidBills);

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
                refetch();
            } else {
                alert(result.error || 'Gagal mengupdate pelanggan');
            }
        } catch (error) {
            console.error('Failed to update customer:', error);
            alert('Gagal mengupdate pelanggan');
        }
    };

    // Handle delete customer
    const handleDeleteCustomer = async () => {
        if (!customerId) return;
        setDeleting(true);
        try {
            const result = await customerService.delete(customerId);
            if (result.success) {
                router.push('/');
            } else {
                alert(result.error || 'Gagal menghapus pelanggan');
            }
        } catch (error) {
            console.error('Failed to delete customer:', error);
            alert('Gagal menghapus pelanggan');
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
                refetch();
            } else {
                alert(result.error || 'Gagal menghapus tagihan');
            }
        } catch (error) {
            console.error('Failed to delete bill:', error);
            alert('Gagal menghapus tagihan');
        } finally {
            setDeletingBill(false);
        }
    };

    const openDeleteBillModal = (bill: { id: number; period: string }) => {
        setBillToDelete(bill);
        setShowDeleteBillConfirm(true);
    };

    // Handle add bill for this customer
    const handleAddBill = async () => {
        if (!customerId || !newBillPeriod || !newBillMeterEnd) {
            alert('Lengkapi semua field');
            return;
        }

        // If no previous bills, require meter start
        if (bills.length === 0 && !newBillMeterStart) {
            alert('Meter awal wajib diisi untuk tagihan pertama');
            return;
        }

        setAddingBill(true);
        try {
            const payload: Record<string, unknown> = {
                period: newBillPeriod,
                meterEnd: parseInt(newBillMeterEnd, 10),
                role: localStorage.getItem('role'),
            };

            // Include meter start if this is first bill
            if (bills.length === 0 && newBillMeterStart) {
                payload.meterStart = parseInt(newBillMeterStart, 10);
            }

            const res = await fetch(`/api/customers/${customerId}/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                setShowAddBillModal(false);
                setNewBillPeriod('');
                setNewBillMeterStart('');
                setNewBillMeterEnd('');
                refetch();
            } else {
                alert(data.error || 'Gagal menambah tagihan');
            }
        } catch (error) {
            console.error('Failed to add bill:', error);
            alert('Gagal menambah tagihan');
        } finally {
            setAddingBill(false);
        }
    };

    if (loading) return <LoadingState message="Memuat data pelanggan..." />;
    if (error) return <ErrorState message={error} />;
    if (!customer) return <ErrorState message="Pelanggan tidak ditemukan" />;

    const unpaidBills = bills.filter((b) => b.paymentStatus !== 'paid');

    return (<>
        <div className="min-h-screen bg-neutral-50">
            <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                <BackButton href="/" />

                {/* Customer Header */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center justify-between">
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
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                    title="Edit"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                    title="Hapus"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
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
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
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

                {/* Outstanding Balance Card */}
                <div className={`rounded-xl p-4 ${customer.outstandingBalance > 0
                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                    <p className="text-white/80 text-sm font-medium">Total Tagihan</p>
                    <p className="text-white text-3xl font-bold">
                        {formatCurrency(customer.outstandingBalance)}
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
                                        <p className="text-xs text-neutral-500 mt-0.5 max-w-[200px]">
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
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
                                            <div className={`w-2 h-2 rounded-full ${bill.paymentStatus === 'paid' ? 'bg-green-500' :
                                                bill.paymentStatus === 'partial' ? 'bg-yellow-500' :
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
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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
        </div>

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
    </>
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

// Helper to format datetime to Indonesian format
function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
