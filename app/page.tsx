'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCustomers, clearCustomerCaches } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import { generateBillMessage, sendWhatsAppViaFonnte } from '@/lib/whatsapp';
import AppLayout from '@/components/layout/AppLayout';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import { formatCurrency } from '@/lib/formatCurrency';
import CustomerForm from '@/components/CustomerForm';

export default function HomePage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { customers, loading, error, refetch } = useCustomers();
  const [search, setSearch] = useState('');
  const [sendingWA, setSendingWA] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect admin to dashboard on first load
  useEffect(() => {
    if (!authLoading && isAdmin) {
      const hasVisitedHome = sessionStorage.getItem('hasVisitedHome');
      if (!hasVisitedHome) {
        sessionStorage.setItem('hasVisitedHome', 'true');
        router.push('/admin/dashboard');
      }
    }
  }, [isAdmin, authLoading, router]);

  // Filter customers by search term
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    String(customer.customerNumber).includes(search)
  );

  // Customers with unpaid bills and phone
  const customersWithUnpaid = customers.filter(
    (c) => c.balance > 0 && c.phone
  );

  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);

  // Handle broadcast WA - sends via Fonnte API
  const handleBroadcastWA = async () => {
    if (customersWithUnpaid.length === 0) return;

    setSendingWA(true);
    setBroadcastResult(null);
    let sent = 0;
    let failed = 0;

    for (const customer of customersWithUnpaid) {
      try {
        // Fetch customer detail to get unpaid bills
        const detail = await customerService.getById(customer.id);
        const unpaidBills = detail.bills.filter((b) => b.paymentStatus !== 'paid');

        if (unpaidBills.length > 0 && customer.phone) {
          const message = generateBillMessage(customer, unpaidBills);
          const result = await sendWhatsAppViaFonnte(customer.phone, message);
          if (result.success) {
            // Update lastNotifiedAt in database
            await customerService.notify(customer.id);
            sent++;
          } else {
            failed++;
          }
          // Small delay between messages
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Failed to send WA to ${customer.name}:`, err);
        failed++;
      }
    }

    setSendingWA(false);
    setBroadcastResult({ sent, failed });

    // Store last broadcast time in localStorage (separate from individual customer notifications)
    if (sent > 0) {
      localStorage.setItem('lastBroadcastTime', new Date().toISOString());
    }

    // Refetch to update lastNotifiedAt in UI
    refetch();

    // Clear result after 5 seconds
    setTimeout(() => setBroadcastResult(null), 5000);
  };

  // Handle inline customer creation
  const handleCreateCustomer = async (data: { name: string; customerNumber: string; phone: string }) => {
    setSubmitting(true);
    try {
      const result = await customerService.create(data);
      if (result.success) {
        setShowAddForm(false);
        clearCustomerCaches();
        refetch();
      } else {
        alert(result.error || 'Gagal menambah pelanggan');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('Gagal menambah pelanggan');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <AppLayout>
      {/* Header - simplified on tablet/laptop since sidebar handles navigation */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="md:hidden">
            <h1 className="text-xl font-bold text-neutral-800">Korjo Tirto</h1>
            <p className="text-sm text-neutral-500">Sistem Pembayaran Air</p>
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-neutral-800">Daftar Pelanggan</h1>
            <p className="text-sm text-neutral-500">Kelola data pelanggan air</p>
          </div>
          {/* Mobile-only admin buttons - hidden on tablet/laptop where sidebar is used */}
          {isAdmin && (
            <div className="flex gap-2 md:hidden">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                title="Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                  title="Tambah"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {/* Dropdown Menu */}
                {showAddMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-20">
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        setShowAddForm(true);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-center gap-3 text-neutral-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="font-medium">Tambah Pelanggan</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        router.push('/admin/import');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-center gap-3 text-neutral-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="font-medium">Import Tagihan Bulanan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Add Customer Form - Inline collapsible */}
        {isAdmin && showAddForm && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-neutral-800">Tambah Pelanggan Baru</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CustomerForm
              onSubmit={handleCreateCustomer}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* Header with Search and Add Button */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari nama atau nomor pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {/* Desktop Add Button */}
          {isAdmin && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="hidden md:flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah</span>
            </button>
          )}
        </div>

        {/* Broadcast WA Button - Admin only */}
        {isAdmin && !loading && !error && customersWithUnpaid.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={handleBroadcastWA}
              disabled={sendingWA}
              className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {sendingWA ? 'Mengirim...' : `Kirim Tagihan ke ${customersWithUnpaid.length} Pelanggan`}
            </button>
            {broadcastResult && (
              <div className="text-center text-sm py-2 rounded-lg bg-blue-100 text-blue-700">
                ✓ Terkirim: {broadcastResult.sent} | ✗ Gagal: {broadcastResult.failed}
              </div>
            )}
            {/* Last broadcast time from localStorage */}
            {(() => {
              const lastBroadcast = typeof window !== 'undefined'
                ? localStorage.getItem('lastBroadcastTime')
                : null;
              return lastBroadcast ? (
                <p className="text-xs text-neutral-400 text-center">
                  Terakhir dikirim: {formatDateTime(lastBroadcast)}
                </p>
              ) : null;
            })()}
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingState message="Memuat data pelanggan..." />}

        {/* Error State */}
        {error && !loading && <ErrorState message={error} />}

        {/* Customer List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                Tidak ada pelanggan ditemukan
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Number & Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-neutral-600 font-bold text-sm">
                          {customer.customerNumber}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800">{customer.name}</h3>
                        {customer.phone && (
                          <p className="text-xs text-neutral-400">{customer.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Remaining Bill */}
                    <div className="text-right">
                      <p className="text-xs text-neutral-400">Sisa Tagihan</p>
                      <p className={`font-bold ${(customer.totalBill - customer.totalPaid) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {(customer.totalBill - customer.totalPaid) > 0 ? formatCurrency(customer.totalBill - customer.totalPaid) : 'Lunas'}
                      </p>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

// Helper to format datetime to Indonesian format
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}