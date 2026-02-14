/**
 * Compress an image file to approximately targetSizeBytes.
 * Uses canvas resize + progressive JPEG quality reduction.
 * Returns a new File object.
 *
 * HEIC/HEIF files are returned as-is since canvas cannot render them
 * in most browsers.
 */
export async function compressImage(
  file: File,
  targetSizeBytes: number = 1_048_576 // 1MB
): Promise<File> {
  // If already under target, return as-is
  if (file.size <= targetSizeBytes) return file;

  // Skip HEIC/HEIF — canvas cannot render these
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
    return file;
  }

  // Only compress image types that canvas can handle
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate scale factor: sqrt(target / current) for area-based scaling
      const scaleFactor = Math.min(1, Math.sqrt(targetSizeBytes / file.size));
      const width = Math.round(img.width * scaleFactor);
      const height = Math.round(img.height * scaleFactor);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Progressive quality reduction
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // If under target or quality floor reached, return result
            if (blob.size <= targetSizeBytes * 1.2 || quality <= 0.5) {
              const compressed = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: file.lastModified,
              });
              resolve(compressed);
              return;
            }

            // Try lower quality
            tryQuality(quality - 0.1);
          },
          "image/jpeg",
          quality
        );
      };

      tryQuality(0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback: return original
    };

    img.src = url;
  });
}
