'use client';

import type { CustomerSummaryDTO } from '@/types';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDateTime } from '@/lib/formatDate';
import { WhatsAppIcon } from '@/components/ui/Icons';

interface CustomerCardProps {
    customer: CustomerSummaryDTO;
    isAdmin: boolean;
    onSelect: () => void;
    onSendWA: (event: React.MouseEvent) => void;
}

export default function CustomerCard({ customer, isAdmin, onSelect, onSendWA }: CustomerCardProps) {
    return (
        <div onClick={onSelect} className="bg-white rounded-xl p-4 border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/70 cursor-pointer transition-colors duration-150">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-neutral-600 font-bold text-sm">{customer.customerNumber}</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-800">{customer.name}</h3>
                        {customer.phone && <p className="text-xs text-neutral-400">{customer.phone}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && customer.phone && customer.unpaidTotal > 0 && (
                        <button onClick={onSendWA} className="w-9 h-9 shrink-0 rounded-full bg-[#25D366] hover:bg-success-500 flex items-center justify-center transition-colors shadow-sm" title="Kirim WA">
                            <WhatsAppIcon className="w-4 h-4 text-white" />
                        </button>
                    )}
                    <div className="text-right min-w-22.5">
                        <p className="text-xs text-neutral-400">Sisa Tagihan</p>
                        <p className={`font-bold ${customer.unpaidTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {customer.unpaidTotal > 0 ? formatCurrency(customer.unpaidTotal) : 'Lunas'}
                        </p>
                    </div>
                </div>
            </div>
            {customer.phone && (
                <div className="mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-400">
                    {customer.lastNotifiedAt ? `Terakhir dikirim: ${formatDateTime(customer.lastNotifiedAt)}` : 'Belum pernah dikirim WA'}
                </div>
            )}
        </div>
    );
}
