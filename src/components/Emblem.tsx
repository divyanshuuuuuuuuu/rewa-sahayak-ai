import React from 'react';

/**
 * Professional Municipal Civic Tech Insignia
 * Designed specifically for Rewa Sahayak AI Civic Grievance Redressal Portal.
 * Complies with public demonstration ethics:
 * - Does not impersonate official national emblem of India.
 * - Does not falsely claim official government seal.
 * - Conveys civic infrastructure, municipal responsibility, public transparency, and AI innovation.
 */
export function CivicInsignia({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Rewa Sahayak AI Civic Service Insignia"
      role="img"
    >
      {/* Outer authoritative circular border */}
      <circle cx="50" cy="50" r="47" fill="#FFFFFF" stroke="#17365D" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill="#F4F6F8" stroke="#147D83" strokeWidth="1" strokeDasharray="3 2" />

      {/* Municipal Civic Building / Dome Silhouette */}
      <path
        d="M50 16 L50 21 M43 23 L57 23 M50 23 C42 27 40 33 40 38 L60 38 C60 33 58 27 50 23 Z"
        fill="#17365D"
        stroke="#17365D"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Archway Columns */}
      <rect x="36" y="38" width="28" height="4" rx="1" fill="#245B88" />
      <rect x="38" y="42" width="4" height="15" rx="1" fill="#17365D" />
      <rect x="45" y="42" width="4" height="15" rx="1" fill="#17365D" />
      <rect x="51" y="42" width="4" height="15" rx="1" fill="#17365D" />
      <rect x="58" y="42" width="4" height="15" rx="1" fill="#17365D" />

      {/* Base Foundation */}
      <rect x="32" y="57" width="36" height="5" rx="1.5" fill="#17365D" />

      {/* Civic Tech Sparkles / AI node points */}
      <circle cx="50" cy="30" r="2" fill="#147D83" />
      <circle cx="28" cy="48" r="2.5" fill="#245B88" />
      <circle cx="72" cy="48" r="2.5" fill="#245B88" />

      {/* River Beehar & Bichhiya Confluence Waves at Base */}
      <path
        d="M26 68 Q38 64 50 68 T74 68"
        stroke="#147D83"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M29 73 Q40 70 50 73 T71 73"
        stroke="#245B88"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Civic Redressal Text Banner */}
      <rect x="18" y="78" width="64" height="13" rx="3" fill="#17365D" />
      <text
        x="50"
        y="87"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="800"
        fontFamily="'Inter', 'Noto Sans Devanagari', sans-serif"
        letterSpacing="0.4"
      >
        REWA SAHAYAK AI
      </text>
    </svg>
  );
}

/**
 * Backward compatibility alias for AshokaEmblem
 * Renders the legitimate, respectful CivicInsignia.
 */
export function AshokaEmblem(props: { size?: number; className?: string }) {
  return <CivicInsignia {...props} />;
}

/**
 * Backward compatibility alias for RewaMunicipalLogo
 * Renders the legitimate, respectful CivicInsignia.
 */
export function RewaMunicipalLogo(props: { size?: number; className?: string }) {
  return <CivicInsignia {...props} />;
}

/**
 * Public Cleanliness & Sanitation Icon
 */
export function SwachhBharatLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: '6px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
      }}
      title="नागरिक स्वच्छता पहल (Civic Cleanliness Mission)"
    >
      <svg width={size} height={size * 0.55} viewBox="0 0 100 55" fill="none" role="img" aria-label="स्वच्छता मिशन">
        <circle cx="28" cy="28" r="20" stroke="#166534" strokeWidth="4" fill="#FFFFFF" />
        <circle cx="72" cy="28" r="20" stroke="#166534" strokeWidth="4" fill="#FFFFFF" />
        <path d="M48 24 Q50 18 52 24" stroke="#166534" strokeWidth="4" fill="none" />
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fill="#17365D"
          fontSize="11"
          fontWeight="800"
          fontFamily="'Noto Sans Devanagari', sans-serif"
        >
          स्वच्छ
        </text>
        <text
          x="72"
          y="32"
          textAnchor="middle"
          fill="#17365D"
          fontSize="11"
          fontWeight="800"
          fontFamily="'Noto Sans Devanagari', sans-serif"
        >
          रीवा
        </text>
      </svg>
    </div>
  );
}

/**
 * Clear Hackathon Demonstration Notice Badge
 */
export function CivicPrototypeBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #bfdbfe',
        borderRadius: '4px',
        padding: '2px 7px',
        fontSize: '0.72rem',
        fontWeight: 700,
      }}
    >
      <span>💡</span>
      <span>Demonstration Prototype • Hackathon Initiative</span>
    </span>
  );
}
