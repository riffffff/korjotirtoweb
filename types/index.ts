// ================================
// ENUMS
// ================================

export enum UserRole {
    ADMIN = 'admin',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PARTIAL = 'partial',
    PAID = 'paid',
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
    outstandingBalance?: number;
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

// GET /bills/period/:period - response.data item
export interface BillPeriodItem {
    id: number;
    customer: CustomerSimple;
    meterReading: MeterReadingSimple;
    totalAmount: number;
    remaining: number;
    amountPaid: number;
    paymentStatus: string;
}

// GET /bills/period/:period - full response
export interface BillPeriodResponse {
    period: string;
    data: BillPeriodItem[];
}

// GET /bills/:id - bill detail response
export interface BillDetail {
    id: number;
    period: string;
    customer: CustomerSimple;
    meterStart: number;
    meterEnd: number;
    usage: number;
    items: BillItem[];
    totalAmount: string;
    penalty: string;
    amountPaid: string;
    remaining: string;
    change: string;
    paymentStatus: string;
    paidAt: string | null;
    createdAt: string;
}

// GET /bills/customer/:customerId - bill history item
export interface BillHistoryItem {
    id: number;
    period: string;
    meterStart: number;
    meterEnd: number;
    usage: number;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
    paymentStatus: string;
    paidAt: string | null;
}

// GET /bills/customer/:customerId - full response
export interface BillHistoryResponse {
    customer: CustomerSimple | null;
    bills: BillHistoryItem[];
}

// ================================
// API REQUEST TYPES
// ================================

export interface LoginRequest {
    username: string;
    password: string;
}

export interface PayBillRequest {
    amountPaid: number;
    hasPenalty?: boolean;
}

// ================================
// LEGACY TYPES (for compatibility)
// ================================

export interface Customer {
    id: number;
    name: string;
    customerNumber: number;
    outstandingBalance: number;
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
