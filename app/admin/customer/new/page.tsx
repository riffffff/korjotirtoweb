'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import AppLayout from '@/components/layout/AppLayout';
import BackButton from '@/components/BackButton';
import CustomerForm from '@/components/CustomerForm';
import LoadingState from '@/components/state/LoadingState';

export default function NewCustomerPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    const handleCreateCustomer = async (data: { name: string; customerNumber: string; phone: string }) => {
        setSubmitting(true);
        try {
            const result = await customerService.create(data);
            if (result.success) {
                router.push('/');
            } else {
                alert(result.error || 'Gagal menambah pelanggan');
            }
        } catch (error) {
            console.error('Failed to create customer:', error);
            alert('Gagal menambah pelanggan');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) return <LoadingState message="Memeriksa akses..." />;
    if (!isAdmin) {
        router.push('/');
        return null;
    }

    return (
        <AppLayout>
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-neutral-800">Tambah Pelanggan</h1>
                    <p className="text-sm text-neutral-500">Tambah pelanggan baru ke sistem</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
                <BackButton href="/admin/dashboard" className="md:hidden" />

                <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <CustomerForm
                        onSubmit={handleCreateCustomer}
                        onCancel={() => router.push('/admin/dashboard')}
                    />
                </div>
            </main>
        </AppLayout>
    );
}
