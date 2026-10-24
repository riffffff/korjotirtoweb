import type { BillHistoryItem } from '@/services/client/customer.client';

const WEB_URL = 'https://www.korjotirto.my.id';

interface Customer {
    id: string;
    customerNumber: number;
    name: string;
    phone: string | null;
    depositBalance: number;
}

export const DEFAULT_WA_BILL_TEMPLATE = `Yth. Bpk/Ibu *{nama_pelanggan}*,

Dengan hormat, kami dari Korjo Tirto menginformasikan rincian tagihan air Anda:

{rincian_tagihan}

*Total Tagihan: {total_tagihan}*

Silakan lakukan pembayaran melalui admin atau lihat detail tagihan di:
{link_tagihan}

_Pesan ini dikirim secara otomatis oleh sistem. Mohon jangan membalas pesan ini._

Terima kasih atas perhatiannya.
Salam,
Korjo Tirto`;

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

type BillTemplateParams = {
    customerName: string;
    billLines: string;
    totalDebt: number;
    billLink: string;
};

function renderBillTemplate(template: string, params: BillTemplateParams): string {
    return template
        .replace(/\{\s*nama_pelanggan\s*\}/g, params.customerName)
        .replace(/\{\s*rincian_tagihan\s*\}/g, params.billLines)
        .replace(/\{\s*total_tagihan\s*\}/g, formatCurrency(params.totalDebt))
        .replace(/\{\s*link_tagihan\s*\}/g, params.billLink)
        .trim();
}

/**
 * Generate WhatsApp message for unpaid bills
 */
export function generateBillMessage(
    customer: Customer,
    unpaidBills: BillHistoryItem[],
    messageTemplate?: string
): string {
    const billLines = unpaidBills.map((bill) =>
        `• ${formatPeriod(bill.period)}: ${formatCurrency(bill.penalty > 0 ? bill.totalWithPenalty : bill.totalAmount)}${bill.penalty > 0 ? ' (termasuk denda)' : ''}`
    ).join('\n');

    const totalDebt = unpaidBills.reduce((sum, bill) => sum + (bill.penalty > 0 ? bill.totalWithPenalty : bill.totalAmount), 0);

    const billLink = `${WEB_URL}/customerNumber/${customer.customerNumber}`;
    const templateToUse = messageTemplate?.trim() || DEFAULT_WA_BILL_TEMPLATE;
    const message = renderBillTemplate(templateToUse, {
        customerName: customer.name,
        billLines,
        totalDebt,
        billLink,
    });

    return message;
}

/**
 * Open WhatsApp via wa.me link (replaces Fonnte API)
 * Opens a new tab/window with wa.me URL
 */
export function openWhatsAppLink(phone: string, message: string): void {
    const waNumber = formatPhoneForWA(phone);
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
}

/**
 * Open bill notification via WhatsApp (using wa.me link)
 */
export function openBillNotification(
    customer: Customer,
    unpaidBills: BillHistoryItem[],
    messageTemplate?: string
): { success: boolean; error?: string } {
    if (!customer.phone) {
        return { success: false, error: 'Tidak ada nomor HP' };
    }

    if (unpaidBills.length === 0) {
        return { success: false, error: 'Tidak ada tagihan' };
    }

    const message = generateBillMessage(customer, unpaidBills, messageTemplate);
    openWhatsAppLink(customer.phone, message);
    return { success: true };
}
