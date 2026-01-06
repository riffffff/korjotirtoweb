'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomer';
import LoadingState from '@/components/state/LoadingState';
import ErrorState from '@/components/state/ErrorState';
import { formatCurrency } from '@/lib/formatCurrency';

export default function HomePage() {
  const router = useRouter();
  const { customers, loading, error } = useCustomers();
  const [search, setSearch] = useState('');

  // Filter customers by search term
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    String(customer.customerNumber).includes(search)
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-neutral-800">Korjo Tirto</h1>
          <p className="text-sm text-neutral-500">Sistem Pembayaran Air</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
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

        {/* Stats Summary */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <p className="text-xs text-neutral-400">Total Pelanggan</p>
              <p className="text-2xl font-bold text-neutral-800">{customers.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <p className="text-xs text-neutral-400">Ada Tunggakan</p>
              <p className="text-2xl font-bold text-red-600">
                {customers.filter((c) => c.outstandingBalance > 0).length}
              </p>
            </div>
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
                  className="bg-white rounded-xl border border-neutral-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Number & Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">
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

                    {/* Right: Outstanding */}
                    <div className="text-right">
                      {customer.outstandingBalance > 0 ? (
                        <>
                          <p className="text-xs text-neutral-400">Tunggakan</p>
                          <p className="font-bold text-red-600">
                            {formatCurrency(customer.outstandingBalance)}
                          </p>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                          ✓ Lunas
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}