import * as XLSX from 'xlsx';

export interface ParsedExcelRow {
    customerNumber: number;
    name: string;
    phone: string | null;
    meterStart: number;
    meterEnd: number;
    usage: number;
    usageK1: number;
    usageK2: number;
    beban: number;
    beayaK1: number;
    beayaK2: number;
    totalAmount: number;
    keterangan: string | null;
}

/**
 * Parses the application Excel import format into validated domain rows.
 */
export function parseCustomerExcelBuffer(buffer: Buffer): ParsedExcelRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const rows: ParsedExcelRow[] = [];
    for (let row = 8; row <= range.e.r; row++) {
        const getValue = (column: number) => {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
            return cell?.v;
        };

        const rawNumber = getValue(0);
        const rawName = getValue(1);
        if (!rawNumber || !rawName) continue;

        const customerNumber = Number.parseInt(String(rawNumber).replace(/^0+/, ''), 10);
        const name = String(rawName).trim();
        let phone: string | null = null;
        const rawPhone = getValue(12);
        if (rawPhone) {
            phone = String(rawPhone).trim();
            if (phone && !phone.startsWith('0') && !phone.startsWith('+')) phone = `0${phone}`;
        }

        const meterStart = Number(getValue(2)) || 0;
        const meterEnd = Number(getValue(3)) || 0;
        const usage = Number(getValue(4)) || Math.max(0, meterEnd - meterStart);
        const usageK1 = Number(getValue(5)) || Math.min(usage, 40);
        const usageK2 = Number(getValue(6)) || Math.max(usage - 40, 0);
        const beban = Number(getValue(7)) || 3000;
        const beayaK1 = Number(getValue(8)) || usageK1 * 1800;
        const beayaK2 = Number(getValue(9)) || usageK2 * 3000;
        const totalAmount = Number(getValue(10)) || beban + beayaK1 + beayaK2;
        const rawDescription = getValue(11);
        const keterangan = rawDescription ? String(rawDescription).trim() : null;

        if (Number.isInteger(customerNumber) && customerNumber > 0 && name) {
            rows.push({
                customerNumber,
                name,
                phone,
                meterStart,
                meterEnd,
                usage,
                usageK1,
                usageK2,
                beban,
                beayaK1,
                beayaK2,
                totalAmount,
                keterangan,
            });
        }
    }
    return rows;
}
