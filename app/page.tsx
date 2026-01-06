'use client';

import { useRouter } from 'next/navigation';
import { useBills } from '@/hooks/useBills';
import CustomerCard from '@/components/CustomerCard';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import EmptyState from '@/components/state/EmptyState';

// Nama bulan dalam Bahasa Indonesia
const months = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

// Generate tahun (5 tahun terakhir)
const years = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

export default function HomePage() {
  const router = useRouter();
  const {
    bills,
    loading,
    error,
    month,
    year,
    search,
    setMonth,
    setYear,
    setSearch
  } = useBills();

  return (
    <div className="max-w-6xl mx-auto">
      <header className="text-gray-600 p-4 shadow-lg mb-4 rounded-xl bg-white-100">
        <h1 className="lg:text-[48px] text-3xl font-heading font-bold text-center p-8">
          💧 KORJO TIRTO
        </h1>
      </header>
      {/* Compact Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200/60 p-2 mb-4">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Month & Year in one row */}
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-2 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && <LoadingState />}

      {/* Error State */}
      {error && !loading && <ErrorState message={error} />}

      {/* Bills Grid */}
      {!loading && !error && bills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {bills.map((bill) => (
            <CustomerCard
              key={bill.id}
              customerNumber={String(bill.customer.customerNumber)}
              name={bill.customer.name}
              meterEnd={bill.meterReading.meterEnd}
              totalAmount={bill.totalAmount}
              outstandingBalance={bill.customer.outstandingBalance}
              paymentStatus={bill.paymentStatus as 'pending' | 'partial' | 'paid'}
              onClick={() => router.push(`/customers/${bill.customer.id}/bills/${year}/${month}`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && bills.length === 0 && (
        <EmptyState
          title="Tidak ada data tagihan"
          description={`untuk ${months.find(m => m.value === month)?.label} ${year}${search ? ` dengan kata kunci "${search}"` : ''}`}
        />
      )}
    </div>
  );
}