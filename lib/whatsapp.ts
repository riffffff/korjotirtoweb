import { BillHistoryItem } from '@/services/customerService';

const WEB_URL = 'http://localhost:3001'; // TODO: Change to production URL

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    outstandingBalance: number;
}

/**
 * Format phone number for WhatsApp (remove leading 0, add 62)
 */
export function formatPhoneForWA(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format period "2026-01" to "Januari 2026"
 */
function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}

/**
 * Generate WhatsApp message for unpaid bills
 */
export function generateBillMessage(
    customer: Customer,
    unpaidBills: BillHistoryItem[]
): string {
    const billLines = unpaidBills.map((bill) =>
        `• ${formatPeriod(bill.period)}: ${formatCurrency(bill.totalAmount)}`
    ).join('\n');

    const message = `
Yth. Bpk/Ibu *${customer.name}*,

Dengan hormat, kami dari PAMSIMAS Korjo Tirto menginformasikan rincian tagihan air Anda:

${billLines}

*Total Tagihan: ${formatCurrency(customer.outstandingBalance)}*

Silakan lakukan pembayaran melalui admin atau lihat detail tagihan di:
${WEB_URL}/customers/${customer.id}

_Pesan ini dikirim secara otomatis oleh sistem._

Terima kasih atas perhatiannya.
Salam,
PAMSIMAS Korjo Tirto
`.trim();

    return message;
}

/**
 * Open WhatsApp with pre-filled message
 */
export function openWhatsApp(phone: string, message: string): void {
    const waNumber = formatPhoneForWA(phone);
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
}

/**
 * Send bill notification via WhatsApp
 */
export function sendBillNotification(
    customer: Customer,
    unpaidBills: BillHistoryItem[]
): boolean {
    if (!customer.phone) {
        console.warn(`Customer ${customer.name} has no phone number`);
        return false;
    }

    if (unpaidBills.length === 0) {
        console.warn(`Customer ${customer.name} has no unpaid bills`);
        return false;
    }

    const message = generateBillMessage(customer, unpaidBills);
    openWhatsApp(customer.phone, message);
    return true;
}
