import React from 'react';

export function AshokaEmblem({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="National Emblem of India"
    >
      {/* Circle base with gold/navy civic styling */}
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0B3A6D" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="44" fill="#F8FAFC" stroke="#D97706" strokeWidth="1" strokeDasharray="2 2" />
      
      {/* Ashoka Lion representation */}
      {/* Center Lion Head */}
      <path
        d="M50 20 C46 20 42 23 42 28 C42 32 45 35 48 37 L48 44 C46 44 43 46 43 49 C43 52 46 54 50 54 C54 54 57 52 57 49 C57 46 54 44 52 44 L52 37 C55 35 58 32 58 28 C58 23 54 20 50 20 Z"
        fill="#0B3A6D"
      />
      {/* Left Lion Head profile */}
      <path
        d="M40 25 C36 24 33 27 33 31 C33 34 35 37 38 39 L40 43 C38 44 36 46 36 48 C37 50 40 50 42 49 L43 45 L41 39 C41 37 41 35 40 33 Z"
        fill="#0B3A6D"
      />
      {/* Right Lion Head profile */}
      <path
        d="M60 25 C64 24 67 27 67 31 C67 34 65 37 62 39 L60 43 C62 44 64 46 64 48 C63 50 60 50 58 49 L57 45 L59 39 C59 37 59 35 60 33 Z"
        fill="#0B3A6D"
      />
      {/* Crown / Mane details */}
      <circle cx="50" cy="22" r="3" fill="#D97706" />
      <circle cx="36" cy="26" r="2.5" fill="#D97706" />
      <circle cx="64" cy="26" r="2.5" fill="#D97706" />

      {/* Ashoka Abacus Base */}
      <rect x="28" y="55" width="44" height="6" rx="2" fill="#0B3A6D" />
      {/* Ashoka Chakra in base */}
      <circle cx="50" cy="58" r="4.5" fill="#FFFFFF" stroke="#0B3A6D" strokeWidth="1" />
      <circle cx="50" cy="58" r="1.5" fill="#0B3A6D" />
      {/* Bull and Horse emblems */}
      <circle cx="36" cy="58" r="2" fill="#D97706" />
      <circle cx="64" cy="58" r="2" fill="#D97706" />

      {/* Lotus Bell Base */}
      <path
        d="M32 62 C38 67 44 68 50 68 C56 68 62 67 68 62 L66 65 C60 70 55 71 50 71 C45 71 40 70 34 65 Z"
        fill="#D97706"
      />

      {/* Satyameva Jayate Banner / Text */}
      <rect x="22" y="73" width="56" height="12" rx="3" fill="#0B3A6D" />
      <text
        x="50"
        y="82"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="800"
        fontFamily="'Noto Sans Devanagari', sans-serif"
        letterSpacing="0.5"
      >
        सत्यमेव जयते
      </text>

      {/* MP Govt Micro-banner */}
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fill="#0B3A6D"
        fontSize="5"
        fontWeight="700"
        fontFamily="'Noto Sans Devanagari', sans-serif"
      >
        मध्य प्रदेश शासन
      </text>
    </svg>
  );
}

export function RewaMunicipalLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Rewa Municipal Corporation Emblem"
    >
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#E65100" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="44" fill="#0B3A6D" />
      <circle cx="50" cy="50" r="32" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.5" />
      
      {/* Rewa Fort / White Tiger / Smart City icon representation */}
      {/* Rewa Fort arches */}
      <path
        d="M36 54 L36 44 L40 40 L44 44 L44 54 Z"
        fill="#0B3A6D"
      />
      <path
        d="M44 54 L44 38 L50 34 L56 38 L56 54 Z"
        fill="#E65100"
      />
      <path
        d="M56 54 L56 44 L60 40 L64 44 L64 54 Z"
        fill="#0B3A6D"
      />
      {/* Water wave at base for Bichhiya & Beehar river confluence of Rewa */}
      <path
        d="M32 58 Q41 54 50 58 T68 58"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 62 Q42 59 50 62 T66 62"
        stroke="#15803D"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Outer Circle Circular Hindi Text */}
      <text
        x="50"
        y="13"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="800"
        fontFamily="'Noto Sans Devanagari', sans-serif"
      >
        नगर पालिक निगम रीवा
      </text>

      <text
        x="50"
        y="91"
        textAnchor="middle"
        fill="#FFD54F"
        fontSize="6"
        fontWeight="700"
        fontFamily="sans-serif"
        letterSpacing="0.8"
      >
        SMART CITY REWA
      </text>
    </svg>
  );
}

export function SwachhBharatLogo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="स्वच्छ भारत मिशन">
      <svg width={size} height={size * 0.55} viewBox="0 0 100 55" fill="none">
        {/* Spectacles of Mahatma Gandhi */}
        <circle cx="28" cy="28" r="22" stroke="#15803D" strokeWidth="5" fill="#FFFFFF" />
        <circle cx="72" cy="28" r="22" stroke="#15803D" strokeWidth="5" fill="#FFFFFF" />
        {/* Bridge */}
        <path d="M50 24 Q50 16 50 24" stroke="#15803D" strokeWidth="5" fill="none" />
        <path d="M48 24 L52 24" stroke="#15803D" strokeWidth="5" />
        {/* Spectacle sides */}
        <path d="M6 24 L10 24" stroke="#15803D" strokeWidth="5" />
        <path d="M90 24 L94 24" stroke="#15803D" strokeWidth="5" />
        {/* Text inside lenses */}
        <text x="28" y="32" textAnchor="middle" fill="#0B3A6D" fontSize="12" fontWeight="800" fontFamily="'Noto Sans Devanagari', sans-serif">स्वच्छ</text>
        <text x="72" y="32" textAnchor="middle" fill="#0B3A6D" fontSize="12" fontWeight="800" fontFamily="'Noto Sans Devanagari', sans-serif">भारत</text>
      </svg>
    </div>
  );
}
