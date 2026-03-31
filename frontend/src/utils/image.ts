/**
 * Resizes a File to a 96×96 WebP thumbnail using the Canvas API.
 * This is the browser equivalent of the generate-thumbs.ts build script
 * (which uses sharp — a Node/native binary that can't run in the browser).
 * The output is a base64 data URL small enough (~2–5 KB) to store in DynamoDB.
 */
export function createThumbnail(file: File): Promise<string> {
  const SIZE = 96;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // Cover crop: scale so the shorter side fills the canvas, then center
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const offsetX = (SIZE - scaledW) / 2;
      const offsetY = (SIZE - scaledH) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
      resolve(canvas.toDataURL("image/webp", 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
