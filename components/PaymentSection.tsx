'use client';
import { useState, useRef } from 'react';
import { formatCurrency } from '@/lib/formatCurrency';
import PasswordConfirm from '@/components/ui/PasswordConfirm';

type PaymentSectionProps = {
    totalAmount: number;
    onPay?: (amountPaid: number, saveToBalance: number) => void;
}

export default function PaymentSection({
    totalAmount,
    onPay
}: PaymentSectionProps) {
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [saveToBalance, setSaveToBalance] = useState<string>('');
    const [showResult, setShowResult] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const paidValue = parseInt(amountPaid.replace(/\D/g, '')) || 0;
    const saveValue = parseInt(saveToBalance.replace(/\D/g, '')) || 0;
    const difference = paidValue - totalAmount;
    const isEnough = paidValue >= totalAmount;
    const change = Math.max(0, difference);
    const cashChange = change - saveValue;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setAmountPaid(value);
        setShowResult(false);
        setSaveToBalance(''); // Reset save amount when payment changes
    };

    const handleSaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const numValue = parseInt(value) || 0;
        // Can't save more than change
        if (numValue <= change) {
            setSaveToBalance(value);
        }
    };

    const handleQuickSave = (amount: number) => {
        if (amount <= change) {
            setSaveToBalance(amount.toString());
        }
    };

    const handleFocus = () => {
        setTimeout(() => {
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handlePayClick = () => {
        if (paidValue > 0) {
            setShowPasswordConfirm(true);
        }
    };

    const handlePayConfirmed = () => {
        setShowPasswordConfirm(false);
        setIsPaying(true);
        setShowResult(true);
        onPay?.(paidValue, saveValue);
        setIsPaying(false);
    };

    // Quick amounts for saving to balance (common small change)
    const quickSaveAmounts = [100, 200, 300, 500, 1000].filter(amt => amt <= change);

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

            {/* Save to Balance - only show if there's change */}
            {isEnough && change > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Kembalian Total</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(change)}</span>
                    </div>
                    
                    <div>
                        <label className="text-xs text-emerald-600 block mb-1">Simpan ke Saldo</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={saveToBalance ? formatCurrency(parseInt(saveToBalance)).replace('Rp', '').trim() : ''}
                            onChange={handleSaveChange}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm font-semibold border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right bg-white"
                        />
                    </div>

                    {/* Quick amounts */}
                    {quickSaveAmounts.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                            {quickSaveAmounts.map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => handleQuickSave(amt)}
                                    className={`px-2 py-1 text-xs rounded-md transition ${
                                        saveValue === amt
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                >
                                    {formatCurrency(amt)}
                                </button>
                            ))}
                        </div>
                    )}

                    {saveValue > 0 && (
                        <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                            <span className="text-sm text-neutral-600">Kembalian Cash</span>
                            <span className="font-bold text-neutral-800">{formatCurrency(cashChange)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Result */}
            {showResult && paidValue > 0 && (
                <div className={`py-3 rounded-md text-center ${isEnough ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <p className={`text-xs mb-1 ${isEnough ? 'text-green-600' : 'text-orange-600'}`}>
                        {!isEnough ? 'Sisa Tagihan' : saveValue > 0 ? 'Kembalian Cash' : change === 0 ? '✓ Status' : 'Kembalian'}
                    </p>
                    <p className={`text-xl font-bold ${isEnough ? 'text-green-700' : 'text-orange-700'}`}>
                        {!isEnough ? formatCurrency(Math.abs(difference)) : 
                         change === 0 ? 'LUNAS' : 
                         formatCurrency(cashChange)}
                    </p>
                    {saveValue > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">
                            +{formatCurrency(saveValue)} disimpan ke saldo
                        </p>
                    )}
                </div>
            )}

            {/* Pay Button */}
            <button
                onClick={handlePayClick}
                disabled={paidValue === 0 || isPaying}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${paidValue > 0 && !isPaying
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-neutral-300 cursor-not-allowed'
                    }`}
            >
                {isPaying ? 'Memproses...' : paidValue === 0 ? 'Masukkan Nominal' : 'Bayar'}
            </button>

            {/* Password Confirmation Modal */}
            <PasswordConfirm
                isOpen={showPasswordConfirm}
                onClose={() => setShowPasswordConfirm(false)}
                onConfirm={handlePayConfirmed}
                title="Konfirmasi Pembayaran"
                description={`Masukkan password admin untuk memproses pembayaran ${formatCurrency(paidValue)}.`}
                confirmText="Bayar"
                loading={isPaying}
            />
        </div>
    );
}
