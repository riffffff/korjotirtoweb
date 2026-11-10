import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface StorageUploadResult {
    url: string;
    storageType: 'supabase' | 'local';
}

const BUCKET_NAME = 'payment-proofs';

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!url || !key) {
        return null;
    }

    return {
        url: url.replace(/\/+$/, ''),
        key,
    };
}

/**
 * Uploads a payment proof image buffer to Supabase Storage (production),
 * with an automatic fallback to local filesystem storage (/public/uploads)
 * if Supabase environment variables are missing or unconfigured.
 */
export async function uploadPaymentProof(
    fileName: string,
    buffer: Buffer,
    mimeType: string
): Promise<StorageUploadResult> {
    const supabase = getSupabaseConfig();

    if (supabase) {
        try {
            const uploadEndpoint = `${supabase.url}/storage/v1/object/${BUCKET_NAME}/${fileName}`;
            const res = await fetch(uploadEndpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${supabase.key}`,
                    apikey: supabase.key,
                    'Content-Type': mimeType,
                    'x-upsert': 'true',
                },
                body: new Uint8Array(buffer),
            });

            if (res.ok) {
                const publicUrl = `${supabase.url}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
                return {
                    url: publicUrl,
                    storageType: 'supabase',
                };
            }

            const errorText = await res.text();
            console.warn(`Supabase Storage upload returned ${res.status}: ${errorText}. Falling back to local storage.`);
        } catch (supabaseError) {
            console.warn('Failed to upload to Supabase Storage, falling back to local:', supabaseError);
        }
    }

    // Local filesystem storage fallback
    const uploadDirectory = path.join(process.cwd(), 'public', 'uploads', 'payment-proofs');
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, fileName), buffer);

    return {
        url: `/uploads/payment-proofs/${fileName}`,
        storageType: 'local',
    };
}

/**
 * Deletes a stored payment proof file if the database record creation fails or is cleaned up.
 */
export async function deleteStoredPaymentProof(proofUrl: string): Promise<void> {
    const supabase = getSupabaseConfig();

    if (supabase && proofUrl.startsWith('http') && proofUrl.includes(`/${BUCKET_NAME}/`)) {
        try {
            const fileName = proofUrl.split(`/${BUCKET_NAME}/`).pop();
            if (fileName) {
                const deleteEndpoint = `${supabase.url}/storage/v1/object/${BUCKET_NAME}/${fileName}`;
                await fetch(deleteEndpoint, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${supabase.key}`,
                        apikey: supabase.key,
                    },
                });
            }
            return;
        } catch (err) {
            console.error('Failed to delete from Supabase Storage:', err);
        }
    }

    if (proofUrl.startsWith('/uploads/payment-proofs/')) {
        const localPath = path.join(process.cwd(), 'public', proofUrl);
        await unlink(localPath).catch(() => {});
    }
}
