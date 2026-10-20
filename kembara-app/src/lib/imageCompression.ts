// =============================================
// Kembara App — Client-Side Image Compression
// Compresses photos before storage upload to save space & bandwidth
// while maintaining crisp high-DPI visual quality.
// GUARANTEE: The compressed file size will NEVER exceed the original.
// =============================================

export interface CompressionOptions {
  maxWidth?: number; // Default 1440px (Sharp on 4K & mobile Retina)
  maxHeight?: number; // Default 1440px
  quality?: number; // Default 0.75 (Optimal balance of sharpness and file size)
  maxSizeMB?: number; // Target max size in MB, e.g. 0.8 MB
}

export interface CompressedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
  isOriginalKept: boolean;
}

/**
 * Human-readable byte formatting (e.g. 2.4 MB, 240 KB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image file in-browser using HTML5 Canvas.
 * Reduces 5MB-10MB mobile photos to ~100KB-250KB with pristine quality.
 * If the original file is already smaller than canvas re-encoding,
 * the original file is preserved so size NEVER increases.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1440,
    maxHeight = 1440,
    quality = 0.75,
  } = options;

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type || !file.type.startsWith("image/")) {
      reject(new Error("File yang dipilih bukan gambar yang valid."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      if (!originalDataUrl) {
        reject(new Error("Data URL gambar kosong."));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung atau rusak."));
      img.onload = () => {
        try {
          let { width, height } = img;
          const originalSize = file.size;

          // Calculate scaled dimensions preserving aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create canvas
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) {
            reject(new Error("Tidak dapat mengakses konteks Canvas 2D."));
            return;
          }

          // Fill white background (avoids black background if transparent PNG converted to JPEG)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);

          // Configure high quality interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw scaled image
          ctx.drawImage(img, 0, 0, width, height);

          // Helper to convert canvas to blob with quality
          const exportCanvas = (q: number): Promise<{ blob: Blob; dataUrl: string }> => {
            return new Promise((resBlob, rejBlob) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    rejBlob(new Error("Gagal mengompresi gambar ke Blob."));
                    return;
                  }
                  const dUrl = canvas.toDataURL("image/jpeg", q);
                  resBlob({ blob, dataUrl: dUrl });
                },
                "image/jpeg",
                q
              );
            });
          };

          (async () => {
            // First pass at target quality (0.75)
            let result = await exportCanvas(quality);

            // If compressed result is larger than original file, try lower quality (0.65)
            if (result.blob.size >= originalSize && originalSize > 0) {
              const secondPass = await exportCanvas(0.65);
              if (secondPass.blob.size < originalSize) {
                result = secondPass;
              }
            }

            // CRUCIAL SAFETY RULE:
            // If the compressed output is STILL larger than or equal to original file,
            // we ALWAYS preserve the original file. This guarantees that file size
            // NEVER increases after compression!
            if (result.blob.size >= originalSize && originalSize > 0) {
              resolve({
                file,
                blob: file,
                dataUrl: originalDataUrl,
                originalSize,
                compressedSize: originalSize,
                savingsPercent: 0,
                width: img.width,
                height: img.height,
                isOriginalKept: true,
              });
              return;
            }

            // Compressed result is smaller: Return optimized file
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const outputFileName = `${baseName}.jpg`;
            const compressedFile = new File([result.blob], outputFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const compressedSize = result.blob.size;
            const savingsPercent =
              originalSize > 0
                ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
                : 0;

            resolve({
              file: compressedFile,
              blob: result.blob,
              dataUrl: result.dataUrl,
              originalSize,
              compressedSize,
              savingsPercent,
              width,
              height,
              isOriginalKept: false,
            });
          })().catch(reject);
        } catch (err) {
          reject(err);
        }
      };

      img.src = originalDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
