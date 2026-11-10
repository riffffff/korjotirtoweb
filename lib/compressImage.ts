/**
 * Client-side image compression using HTML5 Canvas
 * Reduces camera images (3-5MB) to ~100-200KB before network upload.
 * Zero server load, extremely fast on mobile devices.
 */

interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const {
        maxWidth = 1280,
        maxHeight = 1280,
        quality = 0.8,
    } = options;

    // Safety checks
    if (typeof window === 'undefined' || !file || !file.type.startsWith('image/')) {
        return file;
    }

    // Already small enough (under 180 KB), no need to compress
    if (file.size <= 180 * 1024) {
        return file;
    }

    return new Promise<File>((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            try {
                let { width, height } = img;

                // Calculate target dimensions maintaining aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // Smooth scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fill white background in case of transparent PNG converted to JPEG
                const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
                if (outputType === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            // If compression didn't reduce size, keep original
                            resolve(file);
                            return;
                        }

                        let newName = file.name;
                        if (file.type === 'image/png' && outputType === 'image/jpeg') {
                            newName = newName.replace(/\.png$/i, '.jpg');
                        }

                        const compressedFile = new File([blob], newName, {
                            type: outputType,
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    outputType,
                    quality
                );
            } catch (err) {
                console.warn('Image compression error, using original:', err);
                resolve(file);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        img.src = objectUrl;
    });
}

