/**
 * Format angka menjadi format currency Indonesia (Rupiah)
 * @param amount - Jumlah dalam angka
 * @returns String terformat contoh: "Rp48.000"
 */
export const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
