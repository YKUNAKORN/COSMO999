// Uploads an avatar data URL to Firebase Storage and returns its download URL,
// so players/ holds a short https link instead of a 10-40 KB base64 string
// (which is downloaded on every page load and rewritten on every round save).
//
// Never blocks saving a player: if Storage is not configured, the rules reject
// the upload, or it takes too long, the original data URL is returned and the
// avatar is stored inline exactly as before. The UI already renders both.
import { getDownloadURL, getStorage, ref, uploadString } from "firebase/storage";
import { app, isConfigured } from "./firebase";

const UPLOAD_TIMEOUT_MS = 15000;

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export async function uploadAvatar(image: string): Promise<string> {
  if (!isConfigured || !isDataUrl(image)) return image;

  try {
    const random = Math.random().toString(36).slice(2, 8);
    const fileRef = ref(getStorage(app), `avatars/${Date.now()}-${random}.jpg`);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Avatar upload timed out")),
        UPLOAD_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([
        uploadString(fileRef, image, "data_url").then(() => getDownloadURL(fileRef)),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (error) {
    console.warn("[avatar] Storage upload failed, keeping inline image", error);
    return image;
  }
}
