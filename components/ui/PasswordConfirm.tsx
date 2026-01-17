'use client';
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface PasswordConfirmProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    loading?: boolean;
}

const ADMIN_PASSWORD = '9090';

export default function PasswordConfirm({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Konfirmasi',
    loading = false,
}: PasswordConfirmProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== ADMIN_PASSWORD) {
            setError('Password salah');
            return;
        }

        setPassword('');
        onConfirm();
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-neutral-600 text-sm">{description}</p>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Password Admin
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        placeholder="Masukkan password"
                        className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    {error && (
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant="danger"
                        loading={loading}
                        className="flex-1"
                    >
                        {confirmText}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
