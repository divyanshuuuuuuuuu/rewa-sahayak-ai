// WhatsApp Assignment Notification & Photo Download Service for Rewa Sahayak AI
// Enables administrators to dispatch official task assignments directly to field workers via WhatsApp
// using their personal/admin WhatsApp, while logging every notification in Supabase.

import { supabase } from './supabase';
import type { Complaint } from '../types';

export interface DepartmentWorker {
  id: string;
  department_name: string;
  name: string;
  designation: string;
  whatsapp_phone: string;
}

export interface NotificationRecord {
  id: string;
  report_id: string;
  recipient_name: string;
  recipient_phone: string;
  department_name: string;
  message_body: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  created_at: string;
  sent_by_name: string;
}

// Fallback worker directory in case of network offline
const FALLBACK_WORKERS: DepartmentWorker[] = [
  { id: 'w1', department_name: 'Public Works Department (PWD)', name: 'Er. S. K. Verma', designation: 'Assistant Engineer (Roads)', whatsapp_phone: '+919826123456' },
  { id: 'w2', department_name: 'Public Works Department (PWD)', name: 'Lineman Suresh Pandey', designation: 'Electrical Maintenance Incharge', whatsapp_phone: '+919826234567' },
  { id: 'w3', department_name: 'Water Supply & Drainage Dept', name: 'Er. R. K. Patel', designation: 'Sub-Divisional Officer (Water)', whatsapp_phone: '+919826456789' },
  { id: 'w4', department_name: 'Water Supply & Drainage Dept', name: 'Ramesh Kumar (Plumber)', designation: 'Emergency Pipe Repair Tech', whatsapp_phone: '+919826567890' },
  { id: 'w5', department_name: 'Waste Management Dept', name: 'Sanitation Supervisor Lalit', designation: 'Ward Compactor & Depot Incharge', whatsapp_phone: '+919826789012' },
  { id: 'w6', department_name: 'Municipal Sanitation Dept', name: 'Dr. Alok Shrivastava', designation: 'Chief Municipal Health Inspector', whatsapp_phone: '+919826901234' },
  { id: 'w7', department_name: 'General Administration Dept', name: 'Neeraj Sharma', designation: 'Ward 12 Grievance Officer', whatsapp_phone: '+919826112233' },
];

// Fetch registered workers from Supabase
export async function getDepartmentWorkers(departmentName?: string): Promise<DepartmentWorker[]> {
  try {
    let query = supabase.from('department_workers').select('*').eq('is_active', true);
    if (departmentName) {
      query = query.ilike('department_name', `%${departmentName}%`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as DepartmentWorker[];
    }
  } catch (err) {
    console.warn('Could not fetch workers from Supabase, using local directory:', err);
  }

  if (departmentName) {
    return FALLBACK_WORKERS.filter(w =>
      w.department_name.toLowerCase().includes(departmentName.toLowerCase())
    );
  }
  return FALLBACK_WORKERS;
}

// Generate the official WhatsApp Assignment message text
export function formatAssignmentWhatsAppMessage(
  complaint: Complaint,
  worker: { name: string; designation?: string; phone: string },
  adminName: string = 'Municipal Control Center'
): string {
  const timestamp = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const mapsLink =
    complaint.latitude && complaint.longitude
      ? `https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`
      : 'लोकेशन विवरण नीचे देखें';

  const portalLink = `${window.location.origin}/#/complaints/${complaint.id || complaint.ticket_number}`;

  return `🚨 *नगर पालिक निगम, रीवा (म.प्र.)*
🏛️ *कार्य आवंटन आदेश / TASK ASSIGNMENT*
━━━━━━━━━━━━━━━━━━━━━
📋 *शिकायत क्रमांक:* ${complaint.ticket_number}
🏷️ *समस्या श्रेणी:* ${complaint.category}
📂 *आवंटित विभाग:* ${complaint.assigned_department || 'संबंधित विभाग'}
⚡ *प्राथमिकता:* ${complaint.severity || 'MEDIUM'}
📊 *स्थिति:* ${complaint.status}

📌 *समस्या का शीर्षक:*
${complaint.title}

📝 *नागरिक विवरण:*
${complaint.description ? complaint.description.slice(0, 240) : 'विवरण पोर्टल पर देखें'}

📍 *स्थल / लोकेशन:*
${complaint.address || 'रीवा'}
🗺️ *Google Maps नेविगेशन:*
${mapsLink}

👤 *प्रभारी अधिकारी / कर्मी:* ${worker.name}${worker.designation ? ` (${worker.designation})` : ''}
📞 *संपर्क:* ${worker.phone}
🕒 *आवंटन दिनांक व समय:* ${timestamp}
🏛️ *जारीकर्ता:* ${adminName}

${complaint.image_url ? `🖼️ *स्थल फोटो साक्ष्य लिंक:*\n${complaint.image_url.startsWith('data:') ? 'साक्ष्य संलग्न (डाउनलोड फोटो देखें)' : complaint.image_url}\n` : ''}
🔗 *पोर्टल शिकायत विवरण लिंक:*
${portalLink}
━━━━━━━━━━━━━━━━━━━━━
⚠️ *निर्देश:* कृपया नियत समय (SLA) के भीतर घटनास्थल पर पहुंचकर समस्या का निवारण करें एवं समाधान फोटो पोर्टल पर अपलोड करें।
_रीवा सहायक AI — स्वच्छ व सुव्यवस्थित रीवा_`;
}

// Clean phone number for WhatsApp deep-link
export function cleanWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

// Build WhatsApp Web / App deep-link URL
export function createWhatsAppDeepLink(phone: string, message: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Log notification in Supabase assignment_notifications table
export async function logAssignmentNotification(
  reportId: string,
  workerName: string,
  workerPhone: string,
  departmentName: string,
  messageText: string,
  sentByName: string = 'Admin Officer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('assignment_notifications').insert({
      report_id: reportId,
      recipient_name: workerName,
      recipient_phone: workerPhone,
      department_name: departmentName,
      channel: 'whatsapp_personal',
      message_body: messageText,
      status: 'SENT',
      sent_by: user?.id ?? null,
      sent_by_name: sentByName,
    });

    if (error) {
      console.error('Failed to log WhatsApp notification in Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error logging notification:', err);
    return { success: false, error: err.message };
  }
}

// Fetch past notifications for a specific complaint
export async function getNotificationsForComplaint(reportId: string): Promise<NotificationRecord[]> {
  try {
    const { data, error } = await supabase
      .from('assignment_notifications')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as NotificationRecord[];
    }
  } catch (err) {
    console.warn('Could not fetch notifications from Supabase:', err);
  }
  return [];
}

// 1-Click Evidence Photo Download helper
export async function downloadComplaintPhoto(imageUrl: string, ticketNumber: string): Promise<void> {
  try {
    const filename = `${ticketNumber}_evidence.jpg`;

    if (imageUrl.startsWith('data:')) {
      // Data URI
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Remote URL
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error('Failed to download image directly, opening in new tab:', err);
    window.open(imageUrl, '_blank');
  }
}
