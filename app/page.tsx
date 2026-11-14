'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
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
import { BarChart3, Check, FileUp, Loader2, Plus, Search, SlidersHorizontal, UserPlus, X } from 'lucide-react';
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

  // Filter and Sort states
  type StatusFilter = 'ALL' | 'UNPAID' | 'PAID' | 'HAS_DEPOSIT';
  type SortOption = 'number_asc' | 'number_desc' | 'name_asc' | 'name_desc' | 'unpaid_desc' | 'unpaid_asc';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('number_asc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const hasActiveFilters = statusFilter !== 'ALL' || sortBy !== 'number_asc';
  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + (sortBy !== 'number_asc' ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setSortBy('number_asc');
  };

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

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = customers.filter((customer) => {
      // Search term
      if (term) {
        const matchesName = customer.name.toLowerCase().includes(term);
        const matchesNumber = String(customer.customerNumber).includes(term);
        const matchesPhone = customer.phone ? customer.phone.includes(term) : false;
        if (!matchesName && !matchesNumber && !matchesPhone) return false;
      }

      // Status filter
      if (statusFilter === 'UNPAID') {
        return customer.unpaidTotal > 0;
      }
      if (statusFilter === 'PAID') {
        return customer.unpaidTotal === 0;
      }
      if (statusFilter === 'HAS_DEPOSIT') {
        return customer.depositBalance > 0;
      }
      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'number_asc':
          return a.customerNumber - b.customerNumber;
        case 'number_desc':
          return b.customerNumber - a.customerNumber;
        case 'name_asc':
          return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
        case 'name_desc':
          return b.name.localeCompare(a.name, 'id', { sensitivity: 'base' });
        case 'unpaid_desc':
          return b.unpaidTotal - a.unpaidTotal;
        case 'unpaid_asc':
          return a.unpaidTotal - b.unpaidTotal;
        default:
          return 0;
      }
    });

    return result;
  }, [customers, search, statusFilter, sortBy]);

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

        {/* Header with Search, Filter & Sort, and Add Button */}
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            {/* Search */}
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari nama atau nomor pelanggan..."
              containerClassName="flex-1"
            />

            {/* Filter & Sort Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                title="Filter & Urutkan"
                className={`h-11 sm:h-12 px-3 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-xl border transition-all ${
                  hasActiveFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-600 font-medium'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5 shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-blue-600 text-white shrink-0">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter & Sort Dropdown Popover */}
              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-neutral-800 text-sm">Filter & Urutkan</span>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="py-3 border-b border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Status Tagihan</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'ALL', label: 'Semua' },
                          { id: 'UNPAID', label: 'Belum Lunas' },
                          { id: 'PAID', label: 'Lunas' },
                          { id: 'HAS_DEPOSIT', label: 'Ada Saldo' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStatusFilter(opt.id as StatusFilter)}
                            className={`px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                              statusFilter === opt.id
                                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-transparent'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sorting */}
                    <div className="py-3">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Urutan</p>
                      <div className="space-y-1">
                        {[
                          { id: 'number_asc', label: 'No. Pelanggan (1 → 99)' },
                          { id: 'number_desc', label: 'No. Pelanggan (99 → 1)' },
                          { id: 'name_asc', label: 'Nama (A - Z)' },
                          { id: 'name_desc', label: 'Nama (Z - A)' },
                          { id: 'unpaid_desc', label: 'Tagihan Terbanyak' },
                          { id: 'unpaid_asc', label: 'Tagihan Terkecil' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSortBy(opt.id as SortOption)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                              sortBy === opt.id
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.id && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Done Button */}
                    <div className="pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => setShowFilterMenu(false)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Desktop Add Button */}
            {isAdmin && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="hidden md:flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah</span>
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-neutral-400">Filter aktif:</span>
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <span>
                    {statusFilter === 'UNPAID' && 'Belum Lunas'}
                    {statusFilter === 'PAID' && 'Lunas'}
                    {statusFilter === 'HAS_DEPOSIT' && 'Ada Saldo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="hover:text-blue-900 rounded-full"
                    title="Hapus filter status"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {sortBy !== 'number_asc' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <span>
                    {sortBy === 'number_desc' && 'No. 99 → 1'}
                    {sortBy === 'name_asc' && 'Nama A-Z'}
                    {sortBy === 'name_desc' && 'Nama Z-A'}
                    {sortBy === 'unpaid_desc' && 'Tagihan Terbanyak'}
                    {sortBy === 'unpaid_asc' && 'Tagihan Terkecil'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortBy('number_asc')}
                    className="hover:text-blue-900 rounded-full"
                    title="Hapus urutan"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-neutral-400 hover:text-neutral-600 hover:underline ml-1"
              >
                Reset Semua
              </button>
            </div>
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
              <div className="space-y-3">
                <EmptyState
                  title={search || hasActiveFilters ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
                  description={
                    search || hasActiveFilters
                      ? 'Tidak ada pelanggan yang cocok dengan pencarian atau filter yang dipilih.'
                      : 'Tambahkan pelanggan untuk mulai mengelola tagihan.'
                  }
                  icon={<Search className="w-7 h-7 text-neutral-400" />}
                />
                {(search || hasActiveFilters) && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        handleResetFilters();
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Reset Filter & Pencarian
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customerNumber/${customer.customerNumber}`}
                  className="block bg-white rounded-xl p-4 border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/70 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Number & Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                        <span className="text-neutral-600 font-bold text-sm">
                          {customer.customerNumber}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-neutral-800 truncate">{customer.name}</h3>
                        {customer.phone && (
                          <p className="text-xs text-neutral-400 truncate">{customer.phone}</p>
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
