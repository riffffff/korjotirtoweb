'use client';
import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface CustomerFormData {
    name: string;
    customerNumber: string;
    phone: string;
}

interface CustomerFormProps {
    initialData?: CustomerFormData;
    onSubmit: (data: CustomerFormData) => Promise<void>;
    onCancel: () => void;
    isEdit?: boolean;
}

export default function CustomerForm({
    initialData,
    onSubmit,
    onCancel,
    isEdit = false
}: CustomerFormProps) {
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        customerNumber: 'auto', // Will be auto-generated
        phone: '',
    });
    const [errors, setErrors] = useState<Partial<CustomerFormData>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const validate = () => {
        const newErrors: Partial<CustomerFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nama wajib diisi';
        }

        // Customer number validation only for edit mode
        if (isEdit && !formData.customerNumber.trim()) {
            newErrors.customerNumber = 'Nomor pelanggan wajib diisi';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof CustomerFormData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Nama Pelanggan"
                placeholder="Contoh: Ahmad Rifai"
                value={formData.name}
                onChange={handleChange('name')}
                error={errors.name}
            />

            {/* Only show customer number field in edit mode */}
            {isEdit && (
                <Input
                    label="Nomor Pelanggan"
                    placeholder="Contoh: 6"
                    value={formData.customerNumber}
                    onChange={handleChange('customerNumber')}
                    error={errors.customerNumber}
                    disabled={true}
                />
            )}

            {/* For new customers, show info that number will be auto-generated */}
            {!isEdit && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-sm text-blue-700">
                        <span className="font-medium">Nomor Pelanggan:</span> akan digenerate otomatis
                    </p>
                </div>
            )}

            <Input
                label="Nomor HP (WhatsApp)"
                placeholder="Contoh: 085227797555"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={errors.phone}
            />

            <div className="flex gap-3 pt-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    className="flex-1"
                >
                    Batal
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="flex-1"
                >
                    {isEdit ? 'Simpan' : 'Tambah'}
                </Button>
            </div>
        </form>
    );
}
