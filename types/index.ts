// ================================
// ENUMS
// ================================

export enum UserRole {
    ADMIN = 'admin',
}

export enum PaymentStatus {
    UNPAID = 'UNPAID',
    PARTIAL = 'PARTIAL',
    PAID = 'PAID',
}

export enum BillItemType {
    ADMIN_FEE = 'ADMIN_FEE',
    K1 = 'K1',
    K2 = 'K2',
}

// ================================
// BASIC TYPES
// ================================

export interface CustomerSimple {
    id: number;
    name: string;
    customerNumber: number;
    phone?: string;
    totalBill?: number;
    totalPaid?: number;
    balance?: number;
}

export interface BillItem {
    type: string;
    usage: number;
    rate: number;
    amount: string; // API returns string like "48000.00"
}

// ================================
// API RESPONSE TYPES - Bills
// ================================

export interface MeterReadingSimple {
    period: string;
    meterStart: number;
    meterEnd: number;
    usage: number;
}





// ================================
// API RESPONSE TYPES - Payments
// ================================

export interface Payment {
    id: number;
    amount: number;
    description: string;
    createdAt: string;
}

// ================================
// API REQUEST TYPES
// ================================

export interface LoginRequest {
    username: string;
    password: string;
}



// ================================
// LEGACY TYPES (for compatibility)
// ================================

export interface Customer {
    id: number;
    name: string;
    customerNumber: number;
    balance: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface User {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    isActive: boolean;
}

export interface LoginResponse {
    access_token: string;
    user: User;
}

// V2 API contracts. Legacy types above remain temporarily for incremental migration.
export type PaymentStatusCode = 'UNPAID' | 'PARTIAL' | 'PAID';
export type BillItemTypeCode = 'BEBAN' | 'K1' | 'K2';

export interface BillItemDTO {
    id?: string;
    type: BillItemTypeCode;
    usage: number;
    rate: number;
    amount: number;
}

export interface BillDTO {
    id: string;
    period: string;
    meterStart: number;
    meterEnd: number;
    usage: number;
    totalAmount: number;
    penalty: number;
    totalWithPenalty: number;
    amountPaid: number;
    remaining: number;
    paymentStatus: PaymentStatusCode;
    paidAt: string | null;
    items: BillItemDTO[];
}

export interface PaymentHistoryDTO {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
}

export interface CustomerSummaryDTO {
    id: string;
    customerNumber: number;
    name: string;
    phone: string | null;
    totalBill: number;
    totalPaid: number;
    unpaidTotal: number;
    depositBalance: number;
    lastNotifiedAt: string | null;
}

export interface CustomerDetailDTO {
    customer: CustomerSummaryDTO;
    bills: BillDTO[];
    payments: PaymentHistoryDTO[];
}

export interface DashboardPeriodDTO {
    period: string;
    periodLabel: string;
    totalBills: number;
    paidCount: number;
    unpaidCount: number;
}

export interface DashboardStatsDTO {
    totalCustomers: number;
    totalRevenue: number;
    totalOutstanding: number;
    periods: DashboardPeriodDTO[];
}
