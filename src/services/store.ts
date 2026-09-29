// LocalStorage-based store for demo mode
import type { Complaint, ComplaintStatus, ComplaintUpdate, StatsData, User } from '../types';
import { demoComplaints, demoUsers } from '../data/demoData';
import { v4 as uuidv4 } from 'uuid';
import { getEvidenceForCategory } from './evidenceSvg';

const COMPLAINTS_KEY = 'rewa_complaints';
const USER_KEY = 'rewa_current_user';

function loadComplaints(): Complaint[] {
  try {
    const data = localStorage.getItem(COMPLAINTS_KEY);
    if (data) {
      const parsed: Complaint[] = JSON.parse(data);
      let changed = false;
      for (const c of parsed) {
        if (!c.image_url) {
          c.image_url = getEvidenceForCategory(c.category, c.module);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch { /* ignore */ }
  // Seed with demo data ensuring each complaint has compulsory verified photo proof
  const initial = demoComplaints.map(c => ({
    ...c,
    image_url: c.image_url || getEvidenceForCategory(c.category, c.module)
  }));
  localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(initial));
  return initial;
}

function saveComplaints(complaints: Complaint[]) {
  localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
}

export function getAllComplaints(): Complaint[] {
  return loadComplaints().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getComplaintById(id: string): Complaint | undefined {
  return loadComplaints().find(c => c.id === id);
}

export function getComplaintsByModule(module: string): Complaint[] {
  return getAllComplaints().filter(c => c.module === module);
}

export function getComplaintsByStatus(status: ComplaintStatus): Complaint[] {
  return getAllComplaints().filter(c => c.status === status);
}

export function getComplaintsByCitizen(citizenId: string): Complaint[] {
  return getAllComplaints().filter(c => c.citizen_id === citizenId);
}

export function generateTicketNumber(): string {
  const complaints = loadComplaints();
  const num = complaints.length + 1;
  return `REWA-2026-${String(num).padStart(6, '0')}`;
}

export function createComplaint(complaint: Omit<Complaint, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'updates'>): Complaint {
  const complaints = loadComplaints();
  const newComplaint: Complaint = {
    ...complaint,
    id: uuidv4(),
    ticket_number: generateTicketNumber(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updates: [
      {
        id: uuidv4(),
        complaint_id: '',
        status: 'SUBMITTED',
        note: 'Complaint submitted by citizen',
        updated_by: 'System',
        created_at: new Date().toISOString(),
      },
    ],
  };
  newComplaint.updates[0].complaint_id = newComplaint.id;
  complaints.push(newComplaint);
  saveComplaints(complaints);
  return newComplaint;
}

export function updateComplaintStatus(id: string, status: ComplaintStatus, note: string, updatedBy: string): Complaint | undefined {
  const complaints = loadComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return undefined;

  const update: ComplaintUpdate = {
    id: uuidv4(),
    complaint_id: id,
    status,
    note,
    updated_by: updatedBy,
    created_at: new Date().toISOString(),
  };

  complaints[idx].status = status;
  complaints[idx].updated_at = new Date().toISOString();
  complaints[idx].updates.push(update);

  if (status === 'RESOLVED') {
    complaints[idx].resolution_note = note;
  }

  saveComplaints(complaints);
  return complaints[idx];
}

export function assignComplaint(id: string, department: string, assignedTo: string): Complaint | undefined {
  const complaints = loadComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return undefined;

  complaints[idx].assigned_department = department;
  complaints[idx].assigned_to = assignedTo;
  complaints[idx].updated_at = new Date().toISOString();

  if (complaints[idx].status === 'SUBMITTED' || complaints[idx].status === 'UNDER_REVIEW') {
    complaints[idx].status = 'ASSIGNED';
    complaints[idx].updates.push({
      id: uuidv4(),
      complaint_id: id,
      status: 'ASSIGNED',
      note: `Assigned to ${department}${assignedTo ? ' — ' + assignedTo : ''}`,
      updated_by: 'Admin Officer',
      created_at: new Date().toISOString(),
    });
  }

  saveComplaints(complaints);
  return complaints[idx];
}

export function updateComplaintPriority(id: string, severity: 'LOW' | 'MEDIUM' | 'HIGH'): Complaint | undefined {
  const complaints = loadComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  complaints[idx].severity = severity;
  complaints[idx].updated_at = new Date().toISOString();
  saveComplaints(complaints);
  return complaints[idx];
}

export function getStats(): StatsData {
  const complaints = getAllComplaints();
  const stats: StatsData = {
    total: complaints.length,
    submitted: 0, under_review: 0, assigned: 0, in_progress: 0, resolved: 0, closed: 0,
    high_priority: 0,
    by_category: {},
    by_module: {},
    by_status: {},
  };

  for (const c of complaints) {
    // Status counts
    switch (c.status) {
      case 'SUBMITTED': stats.submitted++; break;
      case 'UNDER_REVIEW': stats.under_review++; break;
      case 'ASSIGNED': stats.assigned++; break;
      case 'IN_PROGRESS': stats.in_progress++; break;
      case 'RESOLVED': stats.resolved++; break;
      case 'CLOSED': stats.closed++; break;
    }
    if (c.severity === 'HIGH') stats.high_priority++;
    stats.by_category[c.category] = (stats.by_category[c.category] || 0) + 1;
    stats.by_module[c.module] = (stats.by_module[c.module] || 0) + 1;
    stats.by_status[c.status] = (stats.by_status[c.status] || 0) + 1;
  }

  return stats;
}

// Auth
export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(USER_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return null;
}

export function loginAsDemo(role: 'citizen' | 'admin'): User {
  const user = role === 'admin' ? demoUsers.find(u => u.role === 'admin')! : demoUsers[0];
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function resetDemoData() {
  localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(demoComplaints));
}
