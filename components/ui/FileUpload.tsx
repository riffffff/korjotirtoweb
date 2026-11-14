'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, ImageIcon, FileText, X } from 'lucide-react';

export interface FileUploadProps {
    id?: string;
    label?: string;
    labelIcon?: React.ReactNode;
    file: File | null;
    onFileSelect: (file: File | null) => void;
    accept?: string;
    placeholder?: string;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
    onError?: (error: string) => void;
}

export default function FileUpload({
    id = 'file-upload',
    label,
    labelIcon,
    file,
    onFileSelect,
    accept,
    placeholder = 'Pilih atau drag file ke sini',
    disabled = false,
    compact = false,
    className = '',
    onError,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        if (disabled) return;
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            validateAndSelect(files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            validateAndSelect(selected);
        }
    };

    const validateAndSelect = (selectedFile: File) => {
        if (accept) {
            const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
            const fileName = selectedFile.name.toLowerCase();
            const fileType = selectedFile.type.toLowerCase();

            const isValid = acceptedTypes.some((type) => {
                if (type.startsWith('.')) {
                    return fileName.endsWith(type);
                }
                if (type.endsWith('/*')) {
                    const prefix = type.slice(0, -1);
                    return fileType.startsWith(prefix);
                }
                return fileType === type;
            });

            if (!isValid) {
                onError?.(`Format file tidak didukung (${accept})`);
                return;
            }
        }
        onFileSelect(selectedFile);
    };

    const renderFileIcon = () => {
        if (!file) return null;
        const name = file.name.toLowerCase();
        if (name.endsWith('.xlsx') || name.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
            return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
        }
        if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name)) {
            return <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />;
        }
        return <FileText className="w-4 h-4 text-emerald-600 shrink-0" />;
    };

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label htmlFor={id} className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                    {labelIcon}
                    {label}
                </label>
            )}

            {!file ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && inputRef.current?.click()}
                    className={`group relative border-dashed transition-all cursor-pointer ${
                        compact
                            ? 'border rounded-lg px-3.5 py-2.5'
                            : 'border-2 rounded-xl px-5 py-3.5'
                    } ${
                        isDragging
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-neutral-200 bg-neutral-50/50 hover:border-blue-400 hover:bg-blue-50/20'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    <input
                        ref={inputRef}
                        id={id}
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        className="hidden"
                        disabled={disabled}
                    />
                    <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
                        <div className={`rounded-lg bg-white shadow-xs border border-neutral-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-all shrink-0 ${
                            compact ? 'w-7 h-7' : 'w-9 h-9'
                        }`}>
                            <UploadCloud className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                        </div>
                        <div className="min-w-0">
                            <p className={`font-semibold text-neutral-700 truncate ${
                                compact ? 'text-xs' : 'text-xs sm:text-sm'
                            }`}>
                                {isDragging ? 'Lepaskan file di sini' : placeholder}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
                    compact ? 'px-3 py-2' : 'px-4 py-2.5'
                }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        {renderFileIcon()}
                        <div className="min-w-0 flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-semibold text-neutral-800 truncate">
                                {file.name}
                            </p>
                            <span className="text-[11px] text-neutral-400 shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    </div>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onFileSelect(null);
                                if (inputRef.current) inputRef.current.value = '';
                            }}
                            className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer shrink-0"
                            title="Hapus file"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

