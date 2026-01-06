import { BillHistoryItem } from '@/services/customerService';

const WEB_URL = 'http://localhost:3001'; // TODO: Change to production URL
const FONNTE_TOKEN = 'vJqCcZq5xQ1uEEV91jFk';

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
 * Send WhatsApp message via Fonnte API
 */
export async function sendWhatsAppViaFonnte(
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const waNumber = formatPhoneForWA(phone);

        const formData = new URLSearchParams();
        formData.append('target', waNumber);
        formData.append('message', message);

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': FONNTE_TOKEN,
            },
            body: formData,
        });

        const result = await response.json();

        if (result.status === true || result.status === 'true') {
            return { success: true };
        } else {
            console.error('Fonnte error:', result.reason);
            return { success: false, error: result.reason || 'Gagal kirim' };
        }
    } catch (error) {
        console.error('Fonnte API error:', error);
        return { success: false, error: 'Gagal kirim pesan' };
    }
}

/**
 * Send bill notification via WhatsApp (using Fonnte API)
 */
export async function sendBillNotification(
    customer: Customer,
    unpaidBills: BillHistoryItem[]
): Promise<{ success: boolean; error?: string }> {
    if (!customer.phone) {
        return { success: false, error: 'Tidak ada nomor HP' };
    }

    if (unpaidBills.length === 0) {
        return { success: false, error: 'Tidak ada tagihan' };
    }

    const message = generateBillMessage(customer, unpaidBills);
    return await sendWhatsAppViaFonnte(customer.phone, message);
}
