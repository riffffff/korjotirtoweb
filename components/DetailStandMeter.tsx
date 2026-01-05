import { formatCurrency } from '@/lib/formatCurrency';

type DetailStandMeterProps = {
    k1: number;
    k2: number;
    amountK1: number;
    amountK2: number;
    totalAmount: number;
}

export default function DetailStandMeter({
    k1,
    k2,
    amountK1,
    amountK2,
    totalAmount
}: DetailStandMeterProps) {
    return (
        <div className="space-y-3">
            {/* Pemakaian */}
            <div className="border border-neutral-200 rounded-lg p-3">
                <p className="text-xs font-medium text-neutral-400 mb-2">Pemakaian</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="py-2 bg-neutral-50 rounded-md">
                        <p className="text-[10px] text-neutral-400 mb-0.5">K.I (0-40 m³)</p>
                        <p className="text-sm font-bold text-neutral-700">{k1} m³</p>
                    </div>
                    <div className="py-2 bg-neutral-50 rounded-md">
                        <p className="text-[10px] text-neutral-400 mb-0.5">K.II (&gt;40 m³)</p>
                        <p className="text-sm font-bold text-neutral-700">{k2} m³</p>
                    </div>
                </div>
            </div>

            {/* Rincian Biaya */}
            <div className="border border-neutral-200 rounded-lg p-3">
                <p className="text-xs font-medium text-neutral-400 mb-2">Rincian Biaya</p>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-500">K.I ({k1} m³ × Rp1.200)</span>
                        <span className="font-medium text-neutral-700">{formatCurrency(amountK1)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500">K.II ({k2} m³ × Rp3.000)</span>
                        <span className="font-medium text-neutral-700">{formatCurrency(amountK2)}</span>
                    </div>
                    <div className="border-t border-neutral-100 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold text-neutral-600">Total</span>
                        <span className="font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
