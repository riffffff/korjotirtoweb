import { formatCurrency } from '@/lib/formatCurrency';

type CustomerCardProps = {
  customerNumber: string;
  name: string;
  meterEnd: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  onClick?: () => void;
};

export default function CustomerCard({
  customerNumber,
  name,
  meterEnd,
  totalAmount,
  paymentStatus,
  onClick
}: CustomerCardProps) {

  const statusConfig = {
    pending: {
      bg: 'bg-gradient-to-r from-red-50 to-red-100',
      text: 'text-red-600',
      badge: 'bg-red-500',
      label: 'Belum Bayar'
    },
    partial: {
      bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
      text: 'text-amber-600',
      badge: 'bg-amber-500',
      label: 'Sebagian'
    },
    paid: {
      bg: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
      text: 'text-emerald-600',
      badge: 'bg-emerald-500',
      label: 'Lunas'
    }
  };

  const status = statusConfig[paymentStatus];

  return (
    <div
      onClick={onClick}
      className="
                relative overflow-hidden
                bg-white rounded-xl
                border border-neutral-200/60
                shadow-sm hover:shadow-lg
                transition-all duration-300
                hover:-translate-y-0.5
                cursor-pointer group
            "
    >
      {/* Status Strip */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${status.badge}`} />

      {/* Card Content - Compact */}
      <div className="p-3">
        {/* Row 1: Number, Name, Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-neutral-800 truncate group-hover:text-primary-600 transition-colors">
            {customerNumber} - {name}
          </h3>
          <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        {/* Row 2: Meter & Total */}
        <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
          <div>
            <span className="text-xs text-neutral-400">Meter</span>
            <p className="font-bold text-neutral-700">{meterEnd} m³</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-400">Tagihan</span>
            <p className={`font-bold ${paymentStatus === 'paid' ? 'text-neutral-800' : 'text-red-600'}`}>
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
