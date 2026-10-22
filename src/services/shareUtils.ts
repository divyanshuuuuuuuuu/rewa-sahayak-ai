// Utility functions for Complaint Photo Download and Personal WhatsApp Sharing
// Supports SVG data URLs, Blob URLs, remote Supabase URLs, and Web Share API

export interface ShareComplaintData {
  ticketNumber: string;
  id?: string;
  title: string;
  category: string;
  address: string;
  status: string;
  statusLabelText?: string;
  severity?: string;
  dateStr?: string;
  imageUrl?: string | null;
}

/**
 * Downloads a photo from a URL (data URL, blob, or remote Supabase Storage URL)
 * securely to the user's mobile or desktop device.
 */
export async function downloadComplaintPhoto(
  imageUrl: string,
  ticketNumber: string,
  suffix = 'evidence'
): Promise<boolean> {
  if (!imageUrl) return false;

  const safeTicket = (ticketNumber || 'TICKET').replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename = `Rewa-Sahayak-${safeTicket}-${suffix}.png`;

  try {
    // If it's an SVG data URL, we can convert it to PNG on canvas or download as SVG
    if (imageUrl.startsWith('data:image/svg+xml')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const loaded = new Promise<boolean>((resolve) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 640;
            canvas.height = img.naturalHeight || 420;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  triggerDownload(url, filename);
                  setTimeout(() => URL.revokeObjectURL(url), 4000);
                  resolve(true);
                  return;
                }
                // Fallback to direct data URL
                triggerDownload(imageUrl, `Rewa-Sahayak-${safeTicket}-${suffix}.svg`);
                resolve(true);
              }, 'image/png');
              return;
            }
          } catch {
            triggerDownload(imageUrl, `Rewa-Sahayak-${safeTicket}-${suffix}.svg`);
            resolve(true);
          }
        };
        img.onerror = () => {
          triggerDownload(imageUrl, `Rewa-Sahayak-${safeTicket}-${suffix}.svg`);
          resolve(true);
        };
      });

      img.src = imageUrl;
      return await loaded;
    }

    // For remote HTTP/HTTPS or Blob URLs:
    const response = await fetch(imageUrl, { mode: 'cors' });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // Determine extension from MIME type
    let ext = 'jpg';
    if (blob.type.includes('png')) ext = 'png';
    else if (blob.type.includes('webp')) ext = 'webp';
    else if (blob.type.includes('svg')) ext = 'svg';

    triggerDownload(objectUrl, `Rewa-Sahayak-${safeTicket}-${suffix}.${ext}`);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    return true;
  } catch (err) {
    console.warn('Direct fetch download failed, falling back to anchor click:', err);
    triggerDownload(imageUrl, filename);
    return true;
  }
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Builds the official Rewa Municipal Corporation WhatsApp sharing text
 */
export function buildWhatsAppMessage(data: ShareComplaintData): string {
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#/complaints/${data.id || data.ticketNumber}`
    : `https://divyanshuuuuuuuuu.github.io/rewa-sahayak-ai/#/complaints/${data.id || data.ticketNumber}`;

  return [
    `🏛️ *रीवा नगर निगम — जन-शिकायत पावती*`,
    `*REWA SAHAYAK AI • CITIZEN GRIEVANCE*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *शिकायत क्रमांक / Ticket:* ${data.ticketNumber}`,
    `📌 *समस्या:* ${data.title}`,
    `📂 *श्रेणी / Category:* ${data.category}`,
    `📍 *स्थान / Location:* ${data.address}`,
    `⚡ *प्राथमिकता / Priority:* ${data.severity || 'MEDIUM'}`,
    `🔄 *स्थिति / Status:* ${data.statusLabelText || data.status}`,
    data.dateStr ? `📅 *दिनांक / Date:* ${data.dateStr}` : '',
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *लाइव स्थिति ट्रैक करें (Track Live):*`,
    portalUrl,
    ``,
    `📸 _(संलग्न साक्ष्य फोटो देखने या WhatsApp पर भेजने हेतु पोर्टल लिंक खोलें)_`,
    `_स्वच्छ रीवा, सुंदर रीवा • नगर पालिक निगम रीवा_`
  ].filter(Boolean).join('\n');
}

/**
 * Shares complaint to personal WhatsApp.
 * Opens WhatsApp Web or WhatsApp Mobile App directly with prefilled formatted message.
 */
export async function shareToWhatsApp(data: ShareComplaintData, autoDownloadPhoto = false): Promise<void> {
  const message = buildWhatsAppMessage(data);

  // If user requested to download photo along with share
  if (autoDownloadPhoto && data.imageUrl) {
    try {
      await downloadComplaintPhoto(data.imageUrl, data.ticketNumber);
    } catch (e) {
      console.warn('Auto photo download before share failed:', e);
    }
  }

  // Personal WhatsApp URL (works on Android, iOS, Windows, macOS, Web)
  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;

  // Open in new tab/window or app
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Native Web Share API (if supported) for sharing both text + photo file
 */
export async function shareViaWebShare(data: ShareComplaintData): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  const message = buildWhatsAppMessage(data);
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#/complaints/${data.id || data.ticketNumber}`
    : `https://divyanshuuuuuuuuu.github.io/rewa-sahayak-ai/#/complaints/${data.id || data.ticketNumber}`;

  try {
    // Try to attach image file if supported
    if (data.imageUrl && navigator.canShare) {
      try {
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `Rewa-${data.ticketNumber}.jpg`, { type: blob.type || 'image/jpeg' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Rewa Civic Issue: ${data.ticketNumber}`,
            text: message,
            url: portalUrl,
            files: [file],
          });
          return true;
        }
      } catch {
        // Fall back to text share
      }
    }

    await navigator.share({
      title: `रीवा जन-शिकायत: ${data.ticketNumber}`,
      text: message,
      url: portalUrl,
    });
    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') return true; // user cancelled share
    return false;
  }
}
