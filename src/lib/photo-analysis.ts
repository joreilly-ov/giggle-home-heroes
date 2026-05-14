const SUPPORTED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const PHOTO_EXTENSION_TO_MIME: Record<string, (typeof SUPPORTED_PHOTO_MIME_TYPES)[number]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const MAX_PHOTO_ANALYSIS_FILE_SIZE = 20 * 1024 * 1024;
export const ACCEPTED_PHOTO_ANALYSIS_TYPES = [...SUPPORTED_PHOTO_MIME_TYPES];

export const getSupportedPhotoMimeType = (file: File): string | null => {
  if ((SUPPORTED_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) return file.type;

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return PHOTO_EXTENSION_TO_MIME[extension] ?? null;
};

export const isSupportedPhotoForAnalysis = (file: File): boolean => Boolean(getSupportedPhotoMimeType(file));

export const fileToPhotoDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const mimeType = getSupportedPhotoMimeType(file);
    if (!mimeType) {
      reject(new Error("Please use a JPG, PNG or WebP photo. HEIC photos are not supported."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "").trim();
      const base64 = (dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl).replace(/\s/g, "");

      if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        reject(new Error("The selected photo could not be encoded. Please try a different JPG, PNG or WebP file."));
        return;
      }

      resolve(`data:${mimeType};base64,${base64}`);
    };
    reader.onerror = () => reject(new Error("The selected photo could not be read."));
    reader.readAsDataURL(file);
  });