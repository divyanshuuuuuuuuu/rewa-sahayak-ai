import type { Complaint, Department, User } from '../types';

// Demo users
export const demoUsers: User[] = [
  { id: 'citizen-1', name: 'Rajesh Kumar', email: 'rajesh@demo.com', role: 'citizen', phone: '98XXXXXXXX' },
  { id: 'citizen-2', name: 'Priya Sharma', email: 'priya@demo.com', role: 'citizen' },
  { id: 'citizen-3', name: 'Amit Patel', email: 'amit@demo.com', role: 'citizen' },
  { id: 'citizen-4', name: 'Sunita Devi', email: 'sunita@demo.com', role: 'citizen' },
  { id: 'citizen-5', name: 'Vikram Singh', email: 'vikram@demo.com', role: 'citizen' },
  { id: 'admin-1', name: 'Admin Officer', email: 'admin@rewa.gov.demo', role: 'admin' },
];

export const demoDepartments: Department[] = [
  { id: 'dept-1', name: 'Waste Management Department', module: 'smart_waste', categories: ['Waste Management', 'Public Cleanliness'] },
  { id: 'dept-2', name: 'Water Supply & Drainage', module: 'jalrakshak', categories: ['Water & Leakage', 'Waterlogging & Drainage'] },
  { id: 'dept-3', name: 'Public Works Department', module: 'rewa_sahayak', categories: ['Roads & Potholes', 'Streetlights'] },
  { id: 'dept-4', name: 'Municipal Sanitation', module: 'rewa_sahayak', categories: ['Sanitation', 'Public Cleanliness'] },
  { id: 'dept-5', name: 'General Administration', module: 'other', categories: ['Government Service Assistance', 'Other Civic Issue'] },
];

// Rewa area coordinates (center: ~24.53, 81.30)
export const rewaLocations = [
  { lat: 24.5310, lng: 81.3030, area: 'Civil Lines, Rewa' },
  { lat: 24.5275, lng: 81.2985, area: 'Station Road, Rewa' },
  { lat: 24.5340, lng: 81.3070, area: 'Nai Basti, Rewa' },
  { lat: 24.5250, lng: 81.2950, area: 'Pili Kothi, Rewa' },
  { lat: 24.5380, lng: 81.3100, area: 'Sirmour Chowk, Rewa' },
  { lat: 24.5200, lng: 81.2900, area: 'Rewa Railway Station Area' },
  { lat: 24.5350, lng: 81.3150, area: 'University Road, Rewa' },
  { lat: 24.5420, lng: 81.3050, area: 'Mangawan Road, Rewa' },
  { lat: 24.5290, lng: 81.3110, area: 'Churhat Road, Rewa' },
  { lat: 24.5180, lng: 81.2870, area: 'Bus Stand, Rewa' },
  { lat: 24.5330, lng: 81.2920, area: 'Kuthla, Rewa' },
  { lat: 24.5400, lng: 81.3200, area: 'GEC Rewa Campus' },
  { lat: 24.5260, lng: 81.3040, area: 'Vindhya Nagar' },
  { lat: 24.5150, lng: 81.2830, area: 'Govindgarh, Rewa' },
  { lat: 24.5370, lng: 81.2880, area: 'Laxmi Talkies Road, Rewa' },
];

// Clean initial state: 0 demo complaints
export const demoComplaints: Complaint[] = [];
