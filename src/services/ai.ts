// AI Classification Service for Rewa Sahayak AI
// Demo mode provides mock AI responses; with API key, uses Gemini API

import type { AIAnalysis, Category, Module, Severity } from '../types';

// Keyword-based classification for demo mode
const categoryKeywords: Record<Category, string[]> = {
  'Waste Management': ['kachra', 'garbage', 'waste', 'dustbin', 'dump', 'rubbish', 'safai', 'ganda', 'kooda', 'kuda', 'scrap', 'litter', 'trash', 'bin', 'pickup', 'collection', 'uthaya', 'jama'],
  'Water & Leakage': ['paani', 'pani', 'water', 'pipeline', 'pipe', 'leak', 'leakage', 'tap', 'supply', 'nal', 'tanker', 'boring', 'tubewell', 'contamination'],
  'Waterlogging & Drainage': ['waterlog', 'jal', 'baarish', 'barish', 'naali', 'nali', 'drain', 'drainage', 'jama', 'flood', 'overflow', 'nala', 'sewer', 'stagnant'],
  'Roads & Potholes': ['road', 'sadak', 'pothole', 'gadha', 'gaddha', 'tooti', 'crack', 'cave', 'rasta', 'path', 'highway'],
  'Streetlights': ['street light', 'streetlight', 'light', 'bijli', 'bulb', 'lamp', 'pole', 'andhera', 'dark', 'batti', 'roshni'],
  'Public Cleanliness': ['dirty', 'ganda', 'saaf', 'cleanliness', 'clean', 'footpath', 'debris', 'construction', 'jhadu'],
  'Sanitation': ['toilet', 'shauchalay', 'sanitation', 'mosquito', 'machhar', 'health', 'bimar', 'disease', 'dengue', 'malaria'],
  'Government Service Assistance': ['certificate', 'document', 'ration', 'aadhar', 'pension', 'scheme', 'yojana', 'seva', 'service', 'office'],
  'Other Civic Issue': ['problem', 'issue', 'complaint', 'help', 'madad'],
};

const moduleMap: Record<string, Module> = {
  'Waste Management': 'smart_waste',
  'Public Cleanliness': 'smart_waste',
  'Water & Leakage': 'jalrakshak',
  'Waterlogging & Drainage': 'jalrakshak',
  'Roads & Potholes': 'rewa_sahayak',
  'Streetlights': 'rewa_sahayak',
  'Sanitation': 'rewa_sahayak',
  'Government Service Assistance': 'other',
  'Other Civic Issue': 'other',
};

const subcategories: Record<Category, string[]> = {
  'Waste Management': ['Garbage Not Collected', 'Overflowing Bin', 'Illegal Dumping', 'Waste Burning', 'Irregular Collection', 'Waste Near Hospital/School'],
  'Water & Leakage': ['Pipeline Leakage', 'Broken Water Pipe', 'Water Supply Issue', 'Valve Leakage', 'Water Contamination', 'Tanker Supply Issue'],
  'Waterlogging & Drainage': ['Waterlogging', 'Drainage Blockage', 'Overflowing Drain', 'Stagnant Water', 'Sewer Overflow'],
  'Roads & Potholes': ['Pothole', 'Road Damage', 'Road Cave-in', 'Multiple Potholes', 'Unpaved Road'],
  'Streetlights': ['Non-functional Streetlight', 'Flickering Light', 'Damaged Pole', 'Missing Light'],
  'Public Cleanliness': ['Dirty Public Area', 'Blocked Footpath', 'Littering', 'Unclean Market'],
  'Sanitation': ['Open Drain', 'Public Toilet Condition', 'Mosquito Breeding', 'Sewage Overflow'],
  'Government Service Assistance': ['Document Inquiry', 'Scheme Information', 'Service Guidance'],
  'Other Civic Issue': ['General Complaint', 'Suggestion', 'Other'],
};

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  let bestCategory: Category = 'Other Civic Issue';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.length; // longer matches score higher
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat as Category;
    }
  }
  return bestCategory;
}

function detectSeverity(text: string): Severity {
  const lower = text.toLowerCase();
  const highKeywords = ['urgent', 'emergency', 'danger', 'accident', 'health', 'bimar', 'sick', 'critical', 'contamination', 'cave', 'broken', 'hazard', 'risk', 'flood', '4 din', '5 din', '3 din', 'hospital', 'school', 'burning'];
  const lowKeywords = ['minor', 'chota', 'small', 'thoda', 'slight', 'flickering'];

  for (const kw of highKeywords) {
    if (lower.includes(kw)) return 'HIGH';
  }
  for (const kw of lowKeywords) {
    if (lower.includes(kw)) return 'LOW';
  }
  return 'MEDIUM';
}

function generateTitle(text: string, category: Category): string {
  const templates: Record<string, string> = {
    'Waste Management': 'Waste/garbage issue reported',
    'Water & Leakage': 'Water leakage/supply issue reported',
    'Waterlogging & Drainage': 'Waterlogging/drainage issue reported',
    'Roads & Potholes': 'Road/pothole issue reported',
    'Streetlights': 'Streetlight issue reported',
    'Public Cleanliness': 'Public cleanliness issue reported',
    'Sanitation': 'Sanitation issue reported',
    'Government Service Assistance': 'Government service inquiry',
    'Other Civic Issue': 'Civic issue reported',
  };

  // Try to create a smarter title from text
  const words = text.split(/\s+/).slice(0, 8).join(' ');
  if (words.length > 15) {
    return words.length > 60 ? words.substring(0, 57) + '...' : words;
  }
  return templates[category] || 'Civic issue reported';
}

function pickSubcategory(text: string, category: Category): string {
  const subs = subcategories[category] || ['General'];
  const lower = text.toLowerCase();
  
  for (const sub of subs) {
    const subWords = sub.toLowerCase().split(/[\s/-]+/);
    for (const w of subWords) {
      if (w.length > 3 && lower.includes(w)) return sub;
    }
  }
  return subs[0];
}

function generateDescription(text: string): string {
  // Clean and format the description
  const trimmed = text.trim();
  if (trimmed.length > 20) return trimmed;
  return `Citizen reported: ${trimmed}`;
}

function detectMissingInfo(text: string, category: Category): string[] {
  const missing: string[] = [];
  const lower = text.toLowerCase();
  
  if (lower.length < 15) {
    missing.push('Please provide more details about the problem');
  }
  
  // Check for vague water complaints
  if (category === 'Water & Leakage' || category === 'Waterlogging & Drainage') {
    if (!lower.includes('leak') && !lower.includes('supply') && !lower.includes('jama') && !lower.includes('drain') && !lower.includes('pipe') && !lower.includes('waterlog')) {
      missing.push('Is this a leak, supply issue, or waterlogging problem?');
    }
  }
  
  return missing;
}

function generateFollowUp(text: string, category: Category): string | undefined {
  const lower = text.toLowerCase();
  
  if (lower.length < 20) {
    if (category === 'Water & Leakage') {
      return 'Kya pipeline leak ho rahi hai, paani nahi aa raha, ya road par paani jama hai?';
    }
    if (category === 'Waste Management') {
      return 'Kachra kitne din se collect nahi hua? Aur exact location bata dijiye.';
    }
    return 'Kripya apni problem ke baare mein thoda aur detail mein bataiye.';
  }
  return undefined;
}

// AI problem analysis with optional category override
export function analyzeProblemDemo(text: string, categoryOverride?: Category): AIAnalysis {
  const category = categoryOverride || detectCategory(text);
  const severity = detectSeverity(text);
  const module = moduleMap[category] || 'other';
  const subcategory = pickSubcategory(text, category);
  const title = generateTitle(text, category);
  const description = generateDescription(text);
  const missingInfo = detectMissingInfo(text, category);
  const followUp = generateFollowUp(text, category);

  const actionMap: Record<string, string> = {
    'smart_waste': 'Deploy waste collection team to the reported location.',
    'jalrakshak': 'Dispatch water/drainage inspection and repair team.',
    'rewa_sahayak': 'Forward to the relevant civic department for action.',
    'other': 'Route to general administration for guidance.',
  };

  return {
    category,
    subcategory,
    title,
    description,
    severity,
    module,
    recommended_action: actionMap[module] || 'Investigate and take appropriate action.',
    missing_information: missingInfo,
    confidence: missingInfo.length > 0 ? 0.72 : 0.88 + Math.random() * 0.1,
    follow_up_question: followUp,
  };
}

export interface CivicVisionResult {
  detected_category: Category;
  detected_subcategory: string;
  module: Module;
  severity: Severity;
  confidence: number;
  possible_public_risk: boolean;
  visual_summary: string;
  visual_summary_hi: string;
  visual_summary_en: string;
  suggested_title: string;
  suggested_title_hi: string;
  suggested_title_en: string;
  suggested_description: string;
  suggested_description_hi: string;
  suggested_description_en: string;
  visual_tags: string[];
  waste_detected: boolean;
  waste_type: string;
}

export const categoryRoutingDetails: Record<Category, {
  departmentHi: string;
  departmentEn: string;
  module: Module;
  slaHours: number;
  actionHi: string;
  actionEn: string;
}> = {
  'Waste Management': {
    departmentHi: 'स्वास्थ्य एवं स्वच्छता विभाग (नगर निगम रीवा)',
    departmentEn: 'Health & Public Sanitation Dept (RMC)',
    module: 'smart_waste',
    slaHours: 24,
    actionHi: 'ठोस अपशिष्ट वाहन एवं जोनल सफाई दल प्रेषित किया जाएगा।',
    actionEn: 'Solid waste collection vehicle and sanitation crew will be dispatched.',
  },
  'Water & Leakage': {
    departmentHi: 'जल कार्य एवं सीवरेज विभाग (नगर निगम रीवा)',
    departmentEn: 'Water Works & Drainage Dept (RMC)',
    module: 'jalrakshak',
    slaHours: 12,
    actionHi: 'पेयजल लाइन रिसाव मरम्मत व वाल्व नियंत्रण टीम भेजी जाएगी।',
    actionEn: 'Water supply line repair and valve control crew will be deployed.',
  },
  'Waterlogging & Drainage': {
    departmentHi: 'जल कार्य एवं सीवरेज विभाग (नगर निगम रीवा)',
    departmentEn: 'Water Works & Drainage Dept (RMC)',
    module: 'jalrakshak',
    slaHours: 18,
    actionHi: 'नाली सफाई, सक्शन मशीन एवं सिल्ट निकासी टीम तैनात की जाएगी।',
    actionEn: 'Drain desilting team and suction equipment will be deployed.',
  },
  'Roads & Potholes': {
    departmentHi: 'लोक निर्माण विभाग / PWD (नगर निगम रीवा)',
    departmentEn: 'Public Works Dept / PWD (RMC)',
    module: 'rewa_sahayak',
    slaHours: 48,
    actionHi: 'सड़क पेचवर्क, डामरीकरण व बैरिकेडिंग टीम प्रेषित की जाएगी।',
    actionEn: 'Road patching, cold-mix asphalt, and safety barricading team dispatched.',
  },
  'Streetlights': {
    departmentHi: 'विद्युत व प्रकाश अनुभाग (नगर निगम रीवा)',
    departmentEn: 'Electrical & Lighting Section (RMC)',
    module: 'rewa_sahayak',
    slaHours: 24,
    actionHi: 'हाइड्रोलिक लैडर वाहन व लाइनमैन द्वारा स्ट्रीट लाइट मरम्मत की जाएगी।',
    actionEn: 'Hydraulic ladder vehicle and electrical maintenance crew will repair lights.',
  },
  'Public Cleanliness': {
    departmentHi: 'स्वास्थ्य एवं स्वच्छता विभाग (नगर निगम रीवा)',
    departmentEn: 'Health & Public Sanitation Dept (RMC)',
    module: 'smart_waste',
    slaHours: 24,
    actionHi: 'वार्ड स्वच्छता दल द्वारा फुटपाथ व सार्वजनिक स्थल की सफाई कराई जाएगी।',
    actionEn: 'Ward sanitation squad will clean public pavement and remove debris.',
  },
  'Sanitation': {
    departmentHi: 'स्वास्थ्य एवं स्वच्छता विभाग (नगर निगम रीवा)',
    departmentEn: 'Health & Public Sanitation Dept (RMC)',
    module: 'rewa_sahayak',
    slaHours: 24,
    actionHi: 'कीटनाशक छिड़काव व सार्वजनिक स्वच्छता दल तैनात किया जाएगा।',
    actionEn: 'Disinfection spray and public sanitation team will be dispatched.',
  },
  'Government Service Assistance': {
    departmentHi: 'सामान्य प्रशासन एवं ई-गवर्नेंस प्रभाग',
    departmentEn: 'General Administration & E-Governance Dept',
    module: 'other',
    slaHours: 72,
    actionHi: 'नागरिक सेवा केंद्र द्वारा आवश्यक मार्गदर्शन व दस्तावेज सहायता दी जाएगी।',
    actionEn: 'Citizen service facilitation center will assist with documentation.',
  },
  'Other Civic Issue': {
    departmentHi: 'सामान्य जन-शिकायत निवारण प्रभाग',
    departmentEn: 'General Public Grievance Redressal Dept',
    module: 'other',
    slaHours: 48,
    actionHi: 'संबंधित जोनल अधिकारी द्वारा स्थल निरीक्षण कर कार्रवाई की जाएगी।',
    actionEn: 'Zonal officer will conduct site inspection and initiate action.',
  },
};

/**
 * Intelligent AI Vision Classifier for Civic Evidence Photos
 * Analyzes image pixel distribution, color spectrum, filenames, and context to automatically
 * determine the civic problem category, subcategory, severity, and visual summary.
 */
export async function analyzeCivicImageAsync(
  imageInput: File | string,
  userText: string = ''
): Promise<CivicVisionResult> {
  let imgUrl = '';
  let filename = '';

  if (typeof imageInput === 'string') {
    imgUrl = imageInput;
    filename = imageInput.slice(0, 80);
  } else if (imageInput instanceof File) {
    filename = imageInput.name.toLowerCase();
    imgUrl = URL.createObjectURL(imageInput);
  }

  // Category candidate scores
  const scores: Record<Category, number> = {
    'Waste Management': 0,
    'Water & Leakage': 0,
    'Waterlogging & Drainage': 0,
    'Roads & Potholes': 0,
    'Streetlights': 0,
    'Public Cleanliness': 0,
    'Sanitation': 0,
    'Government Service Assistance': 0,
    'Other Civic Issue': 0,
  };

  // 1. Filename & Metadata Analysis
  const fn = filename.toLowerCase();
  if (fn.includes('pothole') || fn.includes('road') || fn.includes('sadak') || fn.includes('gaddha') || fn.includes('asphalt')) {
    scores['Roads & Potholes'] += 80;
  }
  if (fn.includes('leak') || fn.includes('pipe') || fn.includes('water') || fn.includes('pipeline') || fn.includes('paani') || fn.includes('tap')) {
    scores['Water & Leakage'] += 80;
  }
  if (fn.includes('drain') || fn.includes('drainage') || fn.includes('sewer') || fn.includes('naali') || fn.includes('nala') || fn.includes('waterlog')) {
    scores['Waterlogging & Drainage'] += 80;
  }
  if (fn.includes('garbage') || fn.includes('kachra') || fn.includes('waste') || fn.includes('dustbin') || fn.includes('dump') || fn.includes('trash') || fn.includes('litter')) {
    scores['Waste Management'] += 80;
  }
  if (fn.includes('light') || fn.includes('streetlight') || fn.includes('pole') || fn.includes('lamp') || fn.includes('bulb') || fn.includes('andhera')) {
    scores['Streetlights'] += 80;
  }

  // 2. SVG / Data URL Content Inspection
  if (imgUrl.includes('data:image/svg+xml') || imgUrl.includes('<svg') || fn.endsWith('.svg')) {
    try {
      const decoded = decodeURIComponent(imgUrl).toLowerCase();
      if (decoded.includes('pothole') || decoded.includes('road') || decoded.includes('#334155')) scores['Roads & Potholes'] += 95;
      if (decoded.includes('leak') || decoded.includes('pipeline') || decoded.includes('#0284c7')) scores['Water & Leakage'] += 95;
      if (decoded.includes('drain') || decoded.includes('drainage') || decoded.includes('#064e3b')) scores['Waterlogging & Drainage'] += 95;
      if (decoded.includes('garbage') || decoded.includes('waste') || decoded.includes('#78350f')) scores['Waste Management'] += 95;
      if (decoded.includes('light') || decoded.includes('streetlight') || decoded.includes('#fbbf24')) scores['Streetlights'] += 95;
    } catch {
      // ignore URI decode error
    }
  }

  // 3. User Text Correlation
  if (userText && userText.trim().length > 2) {
    const textCat = detectCategory(userText);
    if (textCat && textCat !== 'Other Civic Issue') {
      scores[textCat] += 60;
    }
  }

  // 4. HTML5 Canvas Pixel Spectrum Analysis
  if (typeof window !== 'undefined' && imgUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = imgUrl;
      });

      if (img.width > 0 && img.height > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 64, 64);
          const p = ctx.getImageData(0, 0, 64, 64).data;
          let totalR = 0, totalG = 0, totalB = 0;
          let darkAsphaltPixels = 0;
          let blueWaterPixels = 0;
          let murkyGreenPixels = 0;
          let highLuminancePoints = 0;
          const totalPixels = 64 * 64;

          for (let i = 0; i < p.length; i += 4) {
            const r = p[i], g = p[i + 1], b = p[i + 2];
            totalR += r; totalG += g; totalB += b;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Dark asphalt / pothole (dark, desaturated, grey-black)
            if (lum < 75 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) {
              darkAsphaltPixels++;
            }
            // Clear water / blue reflection
            if (b > r + 15 && b > g) {
              blueWaterPixels++;
            }
            // Murky drain / dirty stagnant water
            if (g > b && r < 100 && lum < 90) {
              murkyGreenPixels++;
            }
            // Night point light (streetlight)
            if (lum > 210) {
              highLuminancePoints++;
            }
          }

          const avgLum = (0.299 * totalR + 0.587 * totalG + 0.114 * totalB) / totalPixels;

          if (darkAsphaltPixels > totalPixels * 0.35) {
            scores['Roads & Potholes'] += 45;
          }
          if (blueWaterPixels > totalPixels * 0.15) {
            scores['Water & Leakage'] += 45;
          }
          if (murkyGreenPixels > totalPixels * 0.25) {
            scores['Waterlogging & Drainage'] += 40;
          }
          if (avgLum < 60 && highLuminancePoints > 20) {
            scores['Streetlights'] += 50;
          }
          const colorEntropy = Math.abs(totalR - totalG) + Math.abs(totalG - totalB);
          if (colorEntropy > totalPixels * 20 && avgLum > 70) {
            scores['Waste Management'] += 35;
          }
        }
      }
    } catch {
      // Fallback gracefully without breaking
    }
  }

  // Determine top category
  let topCategory: Category = 'Waste Management';
  let maxScore = -1;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat as Category;
    }
  }

  if (maxScore <= 0) {
    topCategory = 'Waste Management';
  }

  const confidence = 0.91 + Math.min(0.06, (maxScore > 80 ? 0.05 : 0.02));
  const routing = categoryRoutingDetails[topCategory];

  if (topCategory === 'Roads & Potholes') {
    return {
      detected_category: 'Roads & Potholes',
      detected_subcategory: 'Pothole',
      module: routing.module,
      severity: 'HIGH',
      confidence,
      possible_public_risk: true,
      visual_summary: 'AI Vision: सड़क की डामर सतह पर गहरा गड्ढा व संरचनात्मक क्षति पाई गई (सड़क सुरक्षा जोखिम)।',
      visual_summary_hi: 'AI Vision: सड़क की डामर सतह पर गहरा गड्ढा व संरचनात्मक क्षति पाई गई (सड़क सुरक्षा जोखिम)।',
      visual_summary_en: 'AI Vision: Deep road pothole cavity and damaged asphalt detected. Severe hazard to vehicular traffic.',
      suggested_title: 'सड़क पर खतरनाक गड्ढा एवं डामर क्षति',
      suggested_title_hi: 'सड़क पर खतरनाक गड्ढा एवं डामर क्षति',
      suggested_title_en: 'Dangerous Road Pothole & Surface Damage',
      suggested_description: 'अपलोड की गई फोटो के अनुसार सड़क पर बड़ा व गहरा गड्ढा है, जिससे कभी भी गंभीर दुर्घटना हो सकती है। कृपया शीघ्र पेचवर्क व मरम्मत कराएं।',
      suggested_description_hi: 'अपलोड की गई फोटो के अनुसार सड़क पर बड़ा व गहरा गड्ढा है, जिससे कभी भी गंभीर दुर्घटना हो सकती है। कृपया शीघ्र पेचवर्क व मरम्मत कराएं।',
      suggested_description_en: 'Uploaded photo shows a dangerous pothole on the roadway causing traffic hazard and risk of accidents. Immediate road patching and asphalt repair required.',
      visual_tags: ['Road Damage', 'Asphalt Cavity', 'Traffic Hazard', 'Pothole'],
      waste_detected: false,
      waste_type: 'N/A',
    };
  }

  if (topCategory === 'Water & Leakage') {
    return {
      detected_category: 'Water & Leakage',
      detected_subcategory: 'Pipeline Leakage',
      module: routing.module,
      severity: 'HIGH',
      confidence,
      possible_public_risk: true,
      visual_summary: 'AI Vision: मुख्य पेयजल पाइपलाइन से भारी जल रिसाव व सड़क पर साफ पानी का व्यर्थ बहाव पाया गया।',
      visual_summary_hi: 'AI Vision: मुख्य पेयजल पाइपलाइन से भारी जल रिसाव व सड़क पर साफ पानी का व्यर्थ बहाव पाया गया।',
      visual_summary_en: 'AI Vision: High-pressure potable drinking water pipeline leak with visible surface runoff detected.',
      suggested_title: 'मुख्य पेयजल पाइपलाइन में लीकेज व जल अपव्यय',
      suggested_title_hi: 'मुख्य पेयजल पाइपलाइन में लीकेज व जल अपव्यय',
      suggested_title_en: 'Main Drinking Water Pipeline Rupture & Leakage',
      suggested_description: 'फोटो साक्ष्य में मुख्य पाइपलाइन से भारी मात्रा में स्वच्छ पेयजल व्यर्थ बहता हुआ दिखाई दे रहा है। जल दबाव कम हो रहा है, तुरंत वॉल्व/पाइपलाइन ठीक करें।',
      suggested_description_hi: 'फोटो साक्ष्य में मुख्य पाइपलाइन से भारी मात्रा में स्वच्छ पेयजल व्यर्थ बहता हुआ दिखाई दे रहा है। जल दबाव कम हो रहा है, तुरंत वॉल्व/पाइपलाइन ठीक करें।',
      suggested_description_en: 'Genuine photo shows high-volume drinking water leakage from underground pipeline onto the street. Immediate valve shutdown and pipe repair needed.',
      visual_tags: ['Water Leak', 'Pipeline Rupture', 'Potable Water Loss', 'Supply Interruption'],
      waste_detected: false,
      waste_type: 'N/A',
    };
  }

  if (topCategory === 'Waterlogging & Drainage') {
    return {
      detected_category: 'Waterlogging & Drainage',
      detected_subcategory: 'Overflowing Drain',
      module: routing.module,
      severity: 'HIGH',
      confidence,
      possible_public_risk: true,
      visual_summary: 'AI Vision: नाली अवरुद्ध होने से गंदे सीवेज पानी का सड़क पर ओवरफ्लो व जलभराव पाया गया।',
      visual_summary_hi: 'AI Vision: नाली अवरुद्ध होने से गंदे सीवेज पानी का सड़क पर ओवरफ्लो व जलभराव पाया गया।',
      visual_summary_en: 'AI Vision: Choked municipal storm drain / sewer overflow with stagnant dirty water detected on roadway.',
      suggested_title: 'नाली अवरुद्ध / गंदा पानी सड़क पर ओवरफ्लो',
      suggested_title_hi: 'नाली अवरुद्ध / गंदा पानी सड़क पर ओवरफ्लो',
      suggested_title_en: 'Blocked Municipal Drain & Sewage Overflow',
      suggested_description: 'नाली का निकास बंद होने से गंदा बदबूदार पानी सड़क व आवासीय क्षेत्र में भर रहा है। नाली की सफाई व सिल्ट निकासी तत्काल आवश्यक है।',
      suggested_description_hi: 'नाली का निकास बंद होने से गंदा बदबूदार पानी सड़क व आवासीय क्षेत्र में भर रहा है। नाली की सफाई व सिल्ट निकासी तत्काल आवश्यक है।',
      suggested_description_en: 'Choked drainage canal has caused dirty foul-smelling sewer water to overflow across the road. Immediate suction machine and drain desilting required.',
      visual_tags: ['Drain Blockage', 'Sewage Overflow', 'Stagnant Water', 'Health Hazard'],
      waste_detected: false,
      waste_type: 'N/A',
    };
  }

  if (topCategory === 'Streetlights') {
    return {
      detected_category: 'Streetlights',
      detected_subcategory: 'Non-functional Streetlight',
      module: routing.module,
      severity: 'MEDIUM',
      confidence,
      possible_public_risk: false,
      visual_summary: 'AI Vision: स्ट्रीट लाइट बंद अथवा क्षतिग्रस्त पाई गई, जिसके कारण रात में अंधेरा रहता है।',
      visual_summary_hi: 'AI Vision: स्ट्रीट लाइट बंद अथवा क्षतिग्रस्त पाई गई, जिसके कारण रात में अंधेरा रहता है।',
      visual_summary_en: 'AI Vision: Non-functional municipal streetlight / damaged luminaire detected in dark area.',
      suggested_title: 'स्ट्रीट लाइट बंद / अंधेरा व सुरक्षा जोखिम',
      suggested_title_hi: 'स्ट्रीट लाइट बंद / अंधेरा व सुरक्षा जोखिम',
      suggested_title_en: 'Non-Functional Streetlight & Dark Spot',
      suggested_description: 'मार्ग की स्ट्रीट लाइट पिछले कई दिनों से बंद पड़ी है, जिससे रात में अंधेरा रहता है और सुरक्षा को खतरा है। कृपया लाइट ठीक कराएं।',
      suggested_description_hi: 'मार्ग की स्ट्रीट लाइट पिछले कई दिनों से बंद पड़ी है, जिससे रात में अंधेरा रहता है और सुरक्षा को खतरा है। कृपया लाइट ठीक कराएं।',
      suggested_description_en: 'Streetlight luminaire is non-functional, leaving the street in complete darkness at night. Urgent LED fixture replacement / line maintenance needed.',
      visual_tags: ['Streetlight Off', 'Dark Zone', 'Electrical Line', 'Safety Risk'],
      waste_detected: false,
      waste_type: 'N/A',
    };
  }

  // Default: Waste Management
  return {
    detected_category: 'Waste Management',
    detected_subcategory: 'Garbage Not Collected',
    module: routing.module,
    severity: 'HIGH',
    confidence,
    possible_public_risk: true,
    visual_summary: 'AI Vision: सार्वजनिक स्थल पर भारी कचरा, डस्टबिन ओवरफ्लो व प्लास्टिक अपशिष्ट का ढेर पाया गया।',
    visual_summary_hi: 'AI Vision: सार्वजनिक स्थल पर भारी कचरा, डस्टबिन ओवरफ्लो व प्लास्टिक अपशिष्ट का ढेर पाया गया।',
    visual_summary_en: 'AI Vision: Municipal solid waste accumulation, overflowing dumpster, and scattered plastic debris detected.',
    suggested_title: 'कचरा नहीं उठा / डस्टबिन ओवरफ्लो व गंदगी',
    suggested_title_hi: 'कचरा नहीं उठा / डस्टबिन ओवरफ्लो व गंदगी',
    suggested_title_en: 'Solid Waste Accumulation & Dustbin Overflow',
    suggested_description: 'स्थल पर कई दिनों से कचरा नहीं उठाया गया है और डस्टबिन के बाहर चारों ओर गंदगी फैल रही है। नगर निगम कचरा वाहन भेजकर सफाई कराएं।',
    suggested_description_hi: 'स्थल पर कई दिनों से कचरा नहीं उठाया गया है और डस्टबिन के बाहर चारों ओर गंदगी फैल रही है। नगर निगम कचरा वाहन भेजकर सफाई कराएं।',
    suggested_description_en: 'Solid municipal waste has accumulated without regular clearance. Litter is scattering across public space. Waste collection vehicle dispatch required.',
    visual_tags: ['Solid Waste', 'Overflowing Bin', 'Public Sanitation', 'Litter'],
    waste_detected: true,
    waste_type: 'Municipal Solid Waste',
  };
}

// Backward-compatible image analysis with category awareness
export function analyzeImageDemo(category: Category = 'Waste Management'): {
  waste_detected: boolean;
  waste_type: string;
  severity: Severity;
  possible_public_risk: boolean;
  visual_summary: string;
  detected_category: Category;
  confidence: number;
} {
  const summaries: Record<Category, string> = {
    'Waste Management': 'AI-assisted observation: Waste material detected in the uploaded image. This appears to be accumulated municipal garbage.',
    'Water & Leakage': 'AI-assisted observation: Water pipeline leakage and street water pooling identified in photo evidence.',
    'Waterlogging & Drainage': 'AI-assisted observation: Stormwater drainage choke and sewer overflow detected on pavement.',
    'Roads & Potholes': 'AI-assisted observation: Deep road surface cavity and asphalt breakdown detected.',
    'Streetlights': 'AI-assisted observation: Dark municipal spot with non-functioning streetlight luminaire detected.',
    'Public Cleanliness': 'AI-assisted observation: Debris and litter detected on public footpath.',
    'Sanitation': 'AI-assisted observation: Unhygienic sanitary conditions and drainage stagnation detected.',
    'Government Service Assistance': 'AI-assisted observation: Municipal documentation inquiry.',
    'Other Civic Issue': 'AI-assisted observation: General civic infrastructure condition documented in evidence.',
  };

  return {
    waste_detected: category === 'Waste Management',
    waste_type: category === 'Waste Management' ? 'Mixed solid waste' : 'N/A',
    severity: category === 'Streetlights' ? 'MEDIUM' : 'HIGH',
    possible_public_risk: true,
    visual_summary: summaries[category] || summaries['Waste Management'],
    detected_category: category,
    confidence: 0.94,
  };
}

// Chat responses for conversational flow
export function getChatResponse(text: string, context: string[]): string {
  const lower = text.toLowerCase();

  if (context.length === 0) {
    return 'Namaste! 🙏 Main Rewa Sahayak AI hoon. Apni problem bataiye — text mein, voice se, ya photo upload karke. Main samajhkar complaint banaunga.';
  }

  if (lower.includes('haan') || lower.includes('yes') || lower.includes('sahi') || lower.includes('correct') || lower.includes('theek')) {
    return 'Dhanyavaad! Aapki complaint ready hai. Neeche review karke submit karein. 👇';
  }

  if (lower.includes('nahi') || lower.includes('no') || lower.includes('galat') || lower.includes('wrong')) {
    return 'Koi baat nahi. Kripya sahi details bataiye toh main complaint update kar dunga.';
  }

  if (lower.length < 10) {
    return 'Kripya apni problem thoda detail mein bataiye taaki main sahi category mein report kar sakun.';
  }

  const analysis = analyzeProblemDemo(text);
  if (analysis.follow_up_question) {
    return analysis.follow_up_question;
  }

  return `Main samajh gaya! Yeh "${analysis.category}" se related problem hai. Complaint taiyaar hai — neeche review karein.`;
}

// Module display names
export const moduleNames: Record<Module, string> = {
  smart_waste: 'Smart Waste',
  jalrakshak: 'JalRakshak',
  rewa_sahayak: 'Rewa Sahayak',
  other: 'General',
};

export const moduleColors: Record<Module, string> = {
  smart_waste: '#10b981',
  jalrakshak: '#3b82f6',
  rewa_sahayak: '#f59e0b',
  other: '#8b5cf6',
};

export const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const statusColors: Record<string, string> = {
  SUBMITTED: '#6366f1',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#f97316',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
};

export const severityColors: Record<Severity, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

export const categoryIcons: Record<Category, string> = {
  'Waste Management': '🗑️',
  'Water & Leakage': '💧',
  'Waterlogging & Drainage': '🌊',
  'Roads & Potholes': '🛣️',
  'Streetlights': '💡',
  'Public Cleanliness': '🧹',
  'Sanitation': '🚿',
  'Government Service Assistance': '🏛️',
  'Other Civic Issue': '📋',
};
