// Complaint & civic reporting types for Rewa Sahayak AI

export type ComplaintStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type Module = 'smart_waste' | 'jalrakshak' | 'rewa_sahayak' | 'other';

export type Category =
  | 'Waste Management'
  | 'Water & Leakage'
  | 'Waterlogging & Drainage'
  | 'Roads & Potholes'
  | 'Streetlights'
  | 'Public Cleanliness'
  | 'Sanitation'
  | 'Government Service Assistance'
  | 'Other Civic Issue';

export interface CivicMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  size?: number;
  duration?: number;
}

export interface Complaint {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: Category;
  subcategory: string;
  module: Module;
  severity: Severity;
  status: ComplaintStatus;
  citizen_id: string;
  citizen_name: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  image_url: string | null;
  video_url?: string | null;
  media?: CivicMedia[];
  voice_transcript: string | null;
  ai_summary: string;
  ai_confidence: number;
  assigned_department: string;
  assigned_to: string;
  resolution_note: string;
  updates: ComplaintUpdate[];
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string;
  updated_by: string;
  created_at: string;
}

export interface AIAnalysis {
  category: Category;
  subcategory: string;
  title: string;
  description: string;
  severity: Severity;
  module: Module;
  recommended_action: string;
  missing_information: string[];
  confidence: number;
  follow_up_question?: string;
}

export interface ImageAnalysis {
  waste_detected: boolean;
  waste_type: string;
  severity: Severity;
  possible_public_risk: boolean;
  visual_summary: string;
}

export interface Department {
  id: string;
  name: string;
  module: Module;
  categories: Category[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  phone?: string;
}

export interface StatsData {
  total: number;
  submitted: number;
  under_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
  high_priority: number;
  by_category: Record<string, number>;
  by_module: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  analysis?: AIAnalysis;
}

export type Language = 'en' | 'hi';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}
