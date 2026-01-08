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
