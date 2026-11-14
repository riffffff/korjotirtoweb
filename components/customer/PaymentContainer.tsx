'use client';

import { useState } from 'react';

type PaymentContainerProps = {
    isAdmin: boolean;
    cashPayment: React.ReactNode;
    onlinePayment: React.ReactNode;
};

export default function PaymentContainer({
    isAdmin,
    cashPayment,
    onlinePayment,
}: PaymentContainerProps) {
    const [activeTab, setActiveTab] = useState<'cash' | 'online'>(isAdmin ? 'cash' : 'online');

    return (
        <section className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 pb-0">
                <h2 className="text-sm font-semibold text-blue-700">Pembayaran</h2>
                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-3">
                    Pembayaran otomatis dialokasikan ke tagihan paling lama terlebih dahulu (FIFO).
                </p>
                <div className="grid grid-cols-2 gap-1 p-1 mt-4 bg-neutral-100 rounded-lg" role="tablist" aria-label="Metode pembayaran">
                    {isAdmin && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'cash'}
                            onClick={() => setActiveTab('cash')}
                            className={`min-h-10 rounded-md px-3 text-xs font-semibold transition-colors ${
                                activeTab === 'cash' ? 'bg-white text-blue-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            Bayar di Loket
                        </button>
                    )}
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'online'}
                        onClick={() => setActiveTab('online')}
                        className={`${isAdmin ? '' : 'col-span-2 '}min-h-10 rounded-md px-3 text-xs font-semibold transition-colors ${
                            activeTab === 'online' ? 'bg-white text-blue-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        Bayar Online
                    </button>
                </div>
            </div>
            <div className="p-4">
                <div className={activeTab === 'cash' && isAdmin ? 'block' : 'hidden'}>
                    {cashPayment}
                </div>
                <div className={activeTab === 'online' || !isAdmin ? 'block' : 'hidden'}>
                    {onlinePayment}
                </div>
            </div>
        </section>
    );
}
