// Client-side image downscaler. Ported from the legacy getBase64Image:
// fit inside a 150x150 box, keep aspect ratio, encode as JPEG quality 0.6,
// and hand back a data URL string suitable for storing on a Player.image.
// Browser only - it uses FileReader, Image, and a canvas.

const MAX_EDGE = 150;
const JPEG_QUALITY = 0.6;

export function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      const img = new Image();

      img.onerror = () => reject(new Error("ไฟล์รูปไม่ถูกต้อง"));
      img.onload = () => {
        let { width, height } = img;

        // Scale the longer edge down to MAX_EDGE, leave smaller images alone.
        if (width > height) {
          if (width > MAX_EDGE) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          }
        } else if (height > MAX_EDGE) {
          width = Math.round((width * MAX_EDGE) / height);
          height = MAX_EDGE;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("เบราว์เซอร์ไม่รองรับการย่อรูป"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };

      img.src = source;
    };

    reader.readAsDataURL(file);
  });
}
