'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCustomers, clearCustomerCaches } from '@/hooks/useCustomer';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { customerClient as customerService } from '@/services/client/customer.client';
import { generateBillMessage, openWhatsAppLink } from '@/lib/whatsapp';
import AppLayout from '@/components/layout/AppLayout';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import EmptyState from '@/components/state/EmptyState';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDateTime } from '@/lib/formatDate';
import CustomerForm from '@/components/customer/CustomerForm';
import SearchInput from '@/components/ui/SearchInput';
import Logo from '@/components/ui/Logo';
import { BarChart3, FileUp, Loader2, Plus, Search, UserPlus, X } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/Icons';

export default function HomePage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { customers, loading, error, refetch } = useCustomers();
  const [search, setSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sendingCustomerId, setSendingCustomerId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

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

  // Handle send WA to individual customer via wa.me
  const handleSendWA = async (e: React.MouseEvent, customer: typeof customers[0]) => {
    e.stopPropagation(); // Prevent navigating to customer detail
    if (!customer.phone || customer.unpaidTotal <= 0) return;

    setSendingCustomerId(customer.id);
    try {
      // Fetch customer detail to get unpaid bills
      const detail = await customerService.getById(customer.id);
      const unpaidBills = detail.bills.filter((b) => b.paymentStatus !== 'PAID');

      if (unpaidBills.length > 0) {
        const message = generateBillMessage(
          customer,
          unpaidBills,
          settings.wa_bill_template || settings.wa_message_text
        );
        openWhatsAppLink(customer.phone, message);
        // Update lastNotifiedAt in database
        await customerService.notify(customer.id);
        // Refetch to update lastNotifiedAt in UI
        refetch();
      }
    } catch (err) {
      console.error(`Failed to send WA to ${customer.name}:`, err);
    } finally {
      setSendingCustomerId(null);
    }
  };

  // Handle inline customer creation
  const handleCreateCustomer = async (data: { name: string; customerNumber: string; phone: string }) => {
    try {
      const result = await customerService.create(data);
      if (result.success) {
        setShowAddForm(false);
        setCreateError(null);
        clearCustomerCaches();
        refetch();
      } else {
        setCreateError(result.error || 'Gagal menambah pelanggan');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      setCreateError('Gagal menambah pelanggan');
    }
  };


  if (authLoading) {
    return (
      <AppLayout>
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="md:hidden">
              <Logo size="md" theme="light" showText={true} />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-neutral-800">Daftar Pelanggan</h1>
              <p className="text-sm text-neutral-500">Kelola data pelanggan air</p>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
          <div className="flex gap-2">
            <div className="w-full h-12 bg-neutral-200 rounded-xl animate-pulse" />
          </div>
          <LoadingState variant="skeleton-list" count={6} />
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="md:hidden">
            <Logo size="md" theme="light" showText={true} />
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
                <BarChart3 className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                  title="Tambah"
                >
                  <Plus className="w-5 h-5" />
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
                      <UserPlus className="w-5 h-5" />
                      <span className="font-medium">Tambah Pelanggan</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        router.push('/admin/import');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-center gap-3 text-neutral-700"
                    >
                      <FileUp className="w-5 h-5" />
                      <span className="font-medium">Import Tagihan Bulanan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
        {/* Add Customer Form - Inline collapsible */}
        {isAdmin && showAddForm && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-neutral-800">Tambah Pelanggan Baru</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CustomerForm
              onSubmit={handleCreateCustomer}
              onCancel={() => setShowAddForm(false)}
            />
            {createError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{createError}</p>}
          </div>
        )}

        {/* Header with Search and Add Button */}
        <div className="flex gap-3">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau nomor pelanggan..."
            containerClassName="flex-1"
          />
          {/* Desktop Add Button */}
          {isAdmin && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="hidden md:flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah</span>
            </button>
          )}
        </div>



        {/* Loading State */}
        {loading && <LoadingState message="Memuat data pelanggan..." />}

        {/* Error State */}
        {error && !loading && <ErrorState message={error} />}

        {/* Customer List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <EmptyState
                title={search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
                description={search ? 'Coba gunakan nama atau nomor pelanggan lain.' : 'Tambahkan pelanggan untuk mulai mengelola tagihan.'}
                icon={<Search className="w-7 h-7 text-neutral-400" />}
              />
            ) : (
              filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customerNumber/${customer.customerNumber}`}
                  className="block bg-white rounded-xl p-4 border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/70 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Number & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-neutral-600 font-bold text-sm">
                          {customer.customerNumber}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800 truncate">{customer.name}</h3>
                        {customer.phone && (
                          <p className="text-xs text-neutral-400">{customer.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Remaining Bill + WA Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* WA Button - show only for customers with phone and unpaid bills */}
                      {isAdmin && customer.phone && customer.unpaidTotal > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSendWA(e, customer);
                          }}
                          disabled={sendingCustomerId === customer.id}
                          className="w-9 h-9 shrink-0 rounded-full bg-[#25D366] hover:bg-success-500 disabled:bg-neutral-300 flex items-center justify-center transition-colors shadow-sm"
                          title="Kirim WA"
                        >
                          {sendingCustomerId === customer.id ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <WhatsAppIcon className="w-4 h-4 text-white" />}
                        </button>
                      )}
                      <div className="text-right min-w-20">
                        <p className="text-xs text-neutral-400">Sisa Tagihan</p>
                        <p className={`font-bold ${customer.unpaidTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {customer.unpaidTotal > 0 ? formatCurrency(customer.unpaidTotal) : 'Lunas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Notified Info - always show if has phone */}
                  {customer.phone && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-400">
                      {customer.lastNotifiedAt 
                        ? `Terakhir dikirim: ${formatDateTime(customer.lastNotifiedAt)}`
                        : 'Belum pernah dikirim WA'
                      }
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

// Helper to format datetime to Indonesian format
