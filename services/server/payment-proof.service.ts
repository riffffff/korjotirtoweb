import prisma from '@/lib/prisma';
import { processCustomerPaymentInTransaction } from '@/services/server/payment.service';

export const PAYMENT_PROOF_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type PaymentProofStatus = typeof PAYMENT_PROOF_STATUSES[number];

export async function listPaymentProofs(status?: PaymentProofStatus) {
    const proofs = await prisma.paymentProof.findMany({
        where: status ? { status } : undefined,
        include: {
            customer: {
                select: { id: true, name: true, customerNumber: true, phone: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return proofs.map((proof) => ({
        ...proof,
        amount: Number(proof.amount),
    }));
}

export async function getPaymentProof(id: string) {
    const proof = await prisma.paymentProof.findUnique({
        where: { id },
        include: {
            customer: {
                select: { id: true, name: true, customerNumber: true, phone: true },
            },
        },
    });

    return proof ? { ...proof, amount: Number(proof.amount) } : null;
}

export async function getLatestPaymentProofForCustomer(customerId: string) {
    const proof = await prisma.paymentProof.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
    });

    return proof ? { ...proof, amount: Number(proof.amount) } : null;
}

export async function createPaymentProof(params: {
    customerId: string;
    phone: string;
    amount: number;
    proofUrl: string;
    originalName: string;
    mimeType: string;
    note?: string;
}) {
    const customer = await prisma.customer.findFirst({
        where: { id: params.customerId, deletedAt: null },
    });
    if (!customer) throw new Error('Customer not found');
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
        throw new Error('Nominal pembayaran tidak valid');
    }

    return prisma.$transaction(async (tx) => {
        const pendingProof = await tx.paymentProof.findFirst({
            where: { customerId: params.customerId, status: 'PENDING' },
            select: { id: true },
        });
        if (pendingProof) {
            throw new Error('Masih ada pengajuan pembayaran yang menunggu konfirmasi admin');
        }
        return tx.paymentProof.create({
            data: {
                customerId: params.customerId,
                phone: params.phone,
                amount: params.amount,
                proofUrl: params.proofUrl,
                originalName: params.originalName,
                mimeType: params.mimeType,
                note: params.note?.trim() || null,
            },
        });
    });
}

export async function approvePaymentProof(id: string, verifiedBy: string) {
    return prisma.$transaction(async (tx) => {
        const proof = await tx.paymentProof.findFirst({ where: { id, status: 'PENDING' } });
        if (!proof) {
            throw new Error('Pengajuan pembayaran sudah diproses atau tidak ditemukan');
        }
        const result = await processCustomerPaymentInTransaction(tx, {
                customerId: proof.customerId,
                cashAmount: Number(proof.amount),
                saveToDeposit: 0,
                useDeposit: 0,
            });
        const updatedProof = await tx.paymentProof.update({
            where: { id: proof.id },
            data: { status: 'APPROVED', verifiedBy, verifiedAt: new Date() },
        });
        return { proof: updatedProof, result };
    });
}

export async function rejectPaymentProof(id: string, verifiedBy: string, rejectionReason: string) {
    const result = await prisma.paymentProof.updateMany({
        where: { id, status: 'PENDING' },
        data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason.trim(),
            verifiedBy,
            verifiedAt: new Date(),
        },
    });
    if (result.count !== 1) {
        throw new Error('Pengajuan pembayaran sudah diproses atau tidak ditemukan');
    }
    return getPaymentProof(id);
}

export async function markPaymentProofNotified(id: string) {
    const proof = await prisma.paymentProof.update({
        where: { id },
        data: { notifiedAt: new Date() },
        include: {
            customer: {
                select: { id: true, name: true, customerNumber: true, phone: true },
            },
        },
    });
    return {
        ...proof,
        amount: Number(proof.amount),
    };
}
