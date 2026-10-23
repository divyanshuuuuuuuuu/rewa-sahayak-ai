// Evidence & Completion Photo Download Utility — Rewa Sahayak AI
// Provides secure, reliable browser downloads with meaningful filenames.
// Publicly accessible for citizens and visitors without requiring login.

/**
 * Downloads a photo file from a given URL with a specific filename.
 * Uses blob download where supported, with safe fallback to direct anchor download.
 *
 * @param url The image URL (Supabase storage public URL or data URI)
 * @param filename Desired download filename (e.g., "REW-2026-01002-completion.jpg")
 */
export async function downloadPhotoFile(url: string, filename: string): Promise<{ success: boolean; error?: string }> {
  if (!url) {
    return { success: false, error: "Photo URL is not available." };
  }

  try {
    // Attempt blob-based download to enforce explicit filename
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    return { success: true };
  } catch (err) {
    console.warn("Direct blob download failed, falling back to anchor link:", err);
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr?.message || "Download failed" };
    }
  }
}

/**
 * Formats a clean completion photo download filename based on complaint reference.
 * Example: REW-2026-01002-completion.png
 */
export function getCompletionPhotoFilename(ticketNumber: string, originalUrl?: string | null): string {
  const cleanTicket = (ticketNumber || "REW-COMPLAINT").replace(/[^a-zA-Z0-9-_]/g, "");
  let ext = "jpg";
  if (originalUrl) {
    const cleanUrl = originalUrl.split("?")[0];
    const extractedExt = cleanUrl.split(".").pop()?.toLowerCase();
    if (extractedExt && ["jpg", "jpeg", "png", "webp"].includes(extractedExt)) {
      ext = extractedExt === "jpeg" ? "jpg" : extractedExt;
    }
  }
  return `${cleanTicket}-completion.${ext}`;
}

/**
 * Formats a clean original citizen complaint photo download filename.
 * Example: REW-2026-01002-original-evidence.png
 */
export function getOriginalPhotoFilename(ticketNumber: string, originalUrl?: string | null): string {
  const cleanTicket = (ticketNumber || "REW-COMPLAINT").replace(/[^a-zA-Z0-9-_]/g, "");
  let ext = "jpg";
  if (originalUrl) {
    const cleanUrl = originalUrl.split("?")[0];
    const extractedExt = cleanUrl.split(".").pop()?.toLowerCase();
    if (extractedExt && ["jpg", "jpeg", "png", "webp"].includes(extractedExt)) {
      ext = extractedExt === "jpeg" ? "jpg" : extractedExt;
    }
  }
  return `${cleanTicket}-original-evidence.${ext}`;
}
