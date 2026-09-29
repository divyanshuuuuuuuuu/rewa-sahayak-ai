import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'hi' | 'en';
type FontSize = 'normal' | 'large' | 'larger';

interface GovContextType {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  bilingual: (hi: string, en: string) => string;
  statusLabel: (status: string) => string;
  moduleLabel: (module: string) => string;
  categoryLabel: (cat: string) => string;
}

const statusMap: Record<string, { hi: string; en: string }> = {
  SUBMITTED: { hi: 'दर्ज की गई', en: 'Submitted' },
  UNDER_REVIEW: { hi: 'समीक्षाधीन', en: 'Under Review' },
  ASSIGNED: { hi: 'अधिकारी को आवंटित', en: 'Assigned' },
  IN_PROGRESS: { hi: 'प्रक्रियाधीन', en: 'In Progress' },
  RESOLVED: { hi: 'निराकृत', en: 'Resolved' },
  CLOSED: { hi: 'बंद', en: 'Closed' },
};

const moduleMap: Record<string, { hi: string; en: string }> = {
  smart_waste: { hi: 'स्मार्ट वेस्ट (कचरा प्रबंधन)', en: 'Smart Waste Management' },
  jalrakshak: { hi: 'जल रक्षक (पेयजल व जल निकासी)', en: 'JalRakshak (Water & Drainage)' },
  rewa_sahayak: { hi: 'रीवा सहायक (सड़क व प्रकाश)', en: 'Rewa Sahayak (Roads & Lights)' },
  other: { hi: 'सामान्य नागरिक सेवाएं', en: 'General Civic Services' },
};

const categoryMap: Record<string, { hi: string; en: string }> = {
  'Waste Management': { hi: 'कचरा प्रबंधन', en: 'Waste Management' },
  'Water & Leakage': { hi: 'पेयजल एवं लीकेज', en: 'Water & Pipeline Leakage' },
  'Waterlogging & Drainage': { hi: 'जलभराव एवं नाली जाम', en: 'Waterlogging & Drainage' },
  'Roads & Potholes': { hi: 'सड़क एवं गड्ढे', en: 'Roads & Potholes' },
  'Streetlights': { hi: 'स्ट्रीट लाइट एवं प्रकाश', en: 'Streetlights & Electrical' },
  'Public Cleanliness': { hi: 'सार्वजनिक स्वच्छता', en: 'Public Cleanliness' },
  'Sanitation': { hi: 'सीवरेज एवं सैनिटेशन', en: 'Sanitation & Hygiene' },
  'Government Service Assistance': { hi: 'शासकीय सेवा सहायता', en: 'Govt Service Assistance' },
  'Other Civic Issue': { hi: 'अन्य नागरिक समस्या', en: 'Other Civic Issues' },
};

const GovContext = createContext<GovContextType>({
  lang: 'hi',
  setLang: () => {},
  toggleLang: () => {},
  fontSize: 'normal',
  setFontSize: () => {},
  bilingual: (hi, en) => hi,
  statusLabel: (s) => s,
  moduleLabel: (m) => m,
  categoryLabel: (c) => c,
});

export function GovProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('hi');
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('lang', lang);
  }, [fontSize, lang]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'hi' ? 'en' : 'hi'));
  };

  const bilingual = (hi: string, en: string): string => {
    return lang === 'hi' ? hi : en;
  };

  const statusLabel = (status: string): string => {
    const entry = statusMap[status];
    if (entry) return lang === 'hi' ? entry.hi : entry.en;
    return status;
  };

  const moduleLabel = (module: string): string => {
    const entry = moduleMap[module];
    if (entry) return lang === 'hi' ? entry.hi : entry.en;
    return module;
  };

  const categoryLabel = (cat: string): string => {
    const entry = categoryMap[cat];
    if (entry) return lang === 'hi' ? entry.hi : entry.en;
    return cat;
  };

  return (
    <GovContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        fontSize,
        setFontSize,
        bilingual,
        statusLabel,
        moduleLabel,
        categoryLabel,
      }}
    >
      {children}
    </GovContext.Provider>
  );
}

export function useGov() {
  return useContext(GovContext);
}
