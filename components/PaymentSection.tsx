'use client';
import { useState, useRef } from 'react';
import { formatCurrency } from '@/lib/formatCurrency';

type PaymentSectionProps = {
    totalAmount: number;
    onPay?: (amountPaid: number, remaining: number) => void;
}

export default function PaymentSection({
    totalAmount,
    onPay
}: PaymentSectionProps) {
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [showResult, setShowResult] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const paidValue = parseInt(amountPaid.replace(/\D/g, '')) || 0;
    const difference = paidValue - totalAmount;
    const isEnough = paidValue >= totalAmount;
    const remaining = Math.abs(difference);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setAmountPaid(value);
        setShowResult(false);
    };

    const handleFocus = () => {
        // Scroll input into view when keyboard opens
        setTimeout(() => {
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handlePay = () => {
        if (paidValue > 0) {
            setShowResult(true);
            onPay?.(paidValue, isEnough ? 0 : remaining);
        }
    };

    return (
        <div className="border border-neutral-200 rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-neutral-400">Pembayaran</p>

            {/* Total */}
            <div className="flex justify-between items-center py-2 bg-blue-50 rounded-md px-3">
                <span className="text-sm text-blue-600">Total Tagihan</span>
                <span className="font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
            </div>

            {/* Input */}
            <div>
                <label className="text-xs text-neutral-400 block mb-1">Jumlah Uang</label>
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={amountPaid ? formatCurrency(parseInt(amountPaid)).replace('Rp', '').trim() : ''}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    placeholder="0"
                    className="w-full px-3 py-2 text-lg font-semibold border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
            </div>

            {/* Result */}
            {showResult && paidValue > 0 && (
                <div className={`py-3 rounded-md text-center ${isEnough ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <p className={`text-xs mb-1 ${isEnough ? 'text-green-600' : 'text-orange-600'}`}>
                        {remaining === 0 ? '✓ Status' : isEnough ? 'Kembalian' : 'Sisa Tagihan'}
                    </p>
                    <p className={`text-xl font-bold ${isEnough ? 'text-green-700' : 'text-orange-700'}`}>
                        {remaining === 0 ? 'LUNAS' : formatCurrency(remaining)}
                    </p>
                </div>
            )}

            {/* Pay Button */}
            <button
                onClick={handlePay}
                disabled={paidValue === 0}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${paidValue > 0
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-neutral-300 cursor-not-allowed'
                    }`}
            >
                {paidValue === 0 ? 'Masukkan Nominal' : 'Bayar'}
            </button>
        </div>
    );
}
