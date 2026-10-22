import React, { useState } from 'react';
import { Download, Check, Copy, Share2 } from 'lucide-react';
import { downloadComplaintPhoto, shareToWhatsApp, shareViaWebShare, type ShareComplaintData } from '../services/shareUtils';
import { useGov } from '../context/GovContext';

// Official WhatsApp Brand SVG Icon
export function WhatsAppIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.904.53 3.69 1.455 5.23L2.05 22.05l4.92-1.39a10.02 10.02 0 0 0 5.06 1.371h.005c5.535 0 10.03-4.495 10.03-10.031C22.065 6.495 17.566 2 12.031 2zm0 18.358h-.004a8.33 8.33 0 0 1-4.24-1.157l-.304-.181-3.14.887.89-3.06-.198-.316A8.307 8.307 0 0 1 3.71 12.03c0-4.588 3.733-8.32 8.324-8.32 2.223 0 4.313.867 5.885 2.439a8.27 8.27 0 0 1 2.437 5.885c0 4.588-3.733 8.324-8.325 8.324zm4.56-6.236c-.25-.125-1.478-.73-1.708-.813-.23-.083-.397-.125-.564.125-.167.25-.648.813-.794.98-.146.167-.292.188-.542.063-.25-.125-1.054-.389-2.008-1.24-.742-.662-1.243-1.48-1.39-1.73-.146-.25-.015-.385.11-.51.113-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.02-.438-.063-.125-.563-1.355-.772-1.855-.203-.488-.41-.422-.563-.43-.146-.008-.313-.01-.48-.01-.167 0-.438.063-.667.313-.23.25-.876.855-.876 2.085s.896 2.418 1.021 2.585c.125.167 1.763 2.693 4.27 3.777.597.258 1.063.412 1.427.528.6.19 1.146.163 1.577.099.48-.072 1.478-.604 1.687-1.188.209-.584.209-1.084.146-1.188-.062-.104-.229-.167-.479-.292z" />
    </svg>
  );
}

interface WhatsAppShareButtonProps {
  data: ShareComplaintData;
  className?: string;
  variant?: 'primary' | 'compact' | 'pill';
  showDownloadHint?: boolean;
}

export function WhatsAppShareButton({
  data,
  className = '',
  variant = 'primary',
  showDownloadHint = false,
}: WhatsAppShareButtonProps) {
  const { bilingual } = useGov();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleShare = async () => {
    // If photo is available and user wants auto download, trigger download
    if (showDownloadHint && data.imageUrl) {
      setDownloading(true);
      await downloadComplaintPhoto(data.imageUrl, data.ticketNumber);
      setDownloading(false);
    }

    // Attempt native Web Share if on mobile browser that supports it
    const sharedNative = await shareViaWebShare(data);
    if (!sharedNative) {
      // Fallback to personal WhatsApp direct open
      await shareToWhatsApp(data);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={`btn-whatsapp-compact ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: '#25D366',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          padding: '5px 10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(37,211,102,0.3)',
          transition: 'all 0.2s ease',
        }}
        title="Share on WhatsApp"
      >
        <WhatsAppIcon size={15} color="#ffffff" />
        <span>WhatsApp</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`btn-whatsapp ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        background: '#25D366',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '0.85rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(37,211,102,0.35)',
        transition: 'transform 0.15s ease, background 0.2s ease',
      }}
      title="Share on WhatsApp"
    >
      <WhatsAppIcon size={17} color="#ffffff" />
      <span>{downloading ? bilingual('फोटो डाउनलोड हो रहा है...', 'Downloading photo...') : bilingual('WhatsApp पर शेयर करें', 'Share on WhatsApp')}</span>
    </button>
  );
}

interface PhotoDownloadButtonProps {
  imageUrl: string;
  ticketNumber: string;
  label?: string;
  suffix?: string;
  variant?: 'button' | 'icon' | 'badge';
  className?: string;
}

export function PhotoDownloadButton({
  imageUrl,
  ticketNumber,
  label,
  suffix = 'evidence',
  variant = 'button',
  className = '',
}: PhotoDownloadButtonProps) {
  const { bilingual } = useGov();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imageUrl || downloading) return;

    setDownloading(true);
    const success = await downloadComplaintPhoto(imageUrl, ticketNumber, suffix);
    setDownloading(false);

    if (success) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: downloaded ? '#15803d' : 'rgba(15, 23, 42, 0.75)',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title={downloaded ? 'Downloaded ✓' : 'Download Photo'}
      >
        {downloaded ? <Check size={14} color="#ffffff" /> : <Download size={14} color="#ffffff" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`btn btn-secondary btn-sm ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 600,
        background: downloaded ? '#f0fdf4' : '#ffffff',
        borderColor: downloaded ? '#86efac' : '#cbd5e1',
        color: downloaded ? '#15803d' : '#0b3a6d',
      }}
      title="Download Photo Evidence to Device"
    >
      {downloaded ? (
        <>
          <Check size={14} color="#15803d" />
          <span>{bilingual('फोटो सुरक्षित हुआ ✓', 'Photo Saved ✓')}</span>
        </>
      ) : (
        <>
          <Download size={14} />
          <span>
            {downloading
              ? bilingual('डाउनलोड हो रहा है...', 'Downloading...')
              : label || bilingual('फोटो डाउनलोड करें', 'Download Photo')}
          </span>
        </>
      )}
    </button>
  );
}

/**
 * Complete Dedicated Share & Download Card for ComplaintDetail page
 */
export function ComplaintShareCard({ data }: { data: ShareComplaintData }) {
  const { bilingual } = useGov();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#/complaints/${data.id || data.ticketNumber}`
      : `https://divyanshuuuuuuuuu.github.io/rewa-sahayak-ai/#/complaints/${data.id || data.ticketNumber}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div
      className="card"
      style={{
        background: '#ffffff',
        border: '1.5px solid #bbf7d0',
        borderRadius: 10,
        padding: '1.1rem',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 14px rgba(37,211,102,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <WhatsAppIcon size={20} color="#25D366" />
        <h3 className="detail-section-title" style={{ margin: 0, color: '#166534', fontSize: '1rem', fontWeight: 800 }}>
          {bilingual('नागरिक सहायता एवं WhatsApp शेयर', 'Citizen WhatsApp Share & Proof')}
        </h3>
      </div>

      <p style={{ fontSize: '0.82rem', color: '#334155', marginBottom: '0.85rem', lineHeight: 1.45 }}>
        {bilingual(
          'इस शिकायत की आधिकारिक पावती व फोटो सीधे अपने पार्षद, वार्ड अधिकारी या WhatsApp ग्रुप में 1-क्लिक में साझा करें।',
          'Instantly share this verified grievance ticket and photo with your Ward Councillor or WhatsApp groups.'
        )}
      </p>

      {/* Button Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <WhatsAppShareButton data={data} showDownloadHint={true} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {data.imageUrl && (
            <PhotoDownloadButton
              imageUrl={data.imageUrl}
              ticketNumber={data.ticketNumber}
              label={bilingual('फोटो डाउनलोड', 'Download Photo')}
            />
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontSize: '0.8rem',
            }}
          >
            {copied ? (
              <>
                <Check size={14} color="#15803d" />
                <span style={{ color: '#15803d' }}>{bilingual('कॉपी हुआ ✓', 'Copied ✓')}</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{bilingual('लिंक कॉपी करें', 'Copy Link')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
