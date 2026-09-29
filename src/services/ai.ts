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

// Demo AI analysis
export function analyzeProblemDemo(text: string): AIAnalysis {
  const category = detectCategory(text);
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

// Demo image analysis
export function analyzeImageDemo(): {
  waste_detected: boolean;
  waste_type: string;
  severity: Severity;
  possible_public_risk: boolean;
  visual_summary: string;
} {
  return {
    waste_detected: true,
    waste_type: 'Mixed waste',
    severity: 'HIGH',
    possible_public_risk: true,
    visual_summary: 'AI-assisted observation: Waste material detected in the uploaded image. This appears to be accumulated garbage in a public area.',
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
