/**
 * Optimizes a base64 image or File by resizing it and reducing quality
 * to ensure it fits within Firestore's 1MB document limit.
 */
/**
 * Standard interface for image optimization to ensure portability between Web and Native.
 */
export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

/**
 * Optimizes an image (Web Implementation).
 * In React Native, this function would be swapped for a native library like expo-image-manipulator.
 */
export async function optimizeImage(
    source: string | File,
    options: ImageOptimizationOptions = {}
): Promise<string> {
    const { maxWidth = 800, maxHeight = 800, quality = 0.7 } = options;

    // Detection for non-web environments (Native)
    if (typeof document === 'undefined') {
        console.warn('optimizeImage called in non-browser environment. Returning source as-is.');
        return typeof source === 'string' ? source : ''; 
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(optimizedBase64);
        };

        img.onerror = (err) => reject(err);

        if (typeof source === 'string') {
            img.src = source;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(source);
        }
    });
}

/**
 * Helper to check if a base64 string is within size limits
 */
export function getBase64Size(base64String: string): number {
    const stringLength = base64String.length - 'data:image/png;base64,'.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
    return sizeInBytes;
}
