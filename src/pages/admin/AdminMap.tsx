import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllComplaints } from '../../services/store';
import MapView from '../../components/MapView';
import type { Complaint } from '../../types';
import { useGov } from '../../context/GovContext';

export default function AdminMap() {
  const navigate = useNavigate();
  const { bilingual } = useGov();
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const complaints = getAllComplaints().filter(c => {
    if (filter && c.module !== filter) return false;
    if (statusFilter === 'active' && ['RESOLVED', 'CLOSED'].includes(c.status)) return false;
    if (statusFilter === 'resolved' && !['RESOLVED', 'CLOSED'].includes(c.status)) return false;
    return true;
  });

  return (
    <div className="page fade-in">
      <div className="container">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.25rem' }}>
          📍 {bilingual('रीवा नगर निगम — वार्ड शिकायत मानचित्र (Admin Map)', 'Rewa City Civic Grievance Map (Admin)')}
        </h1>
        <p style={{ color: '#475569', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          {bilingual(
            'रीवा नगर निगम क्षेत्र में दर्ज शिकायतों का वार्डवार भौगोलिक वितरण एवं हॉटस्पॉट निगरानी।',
            'Rewa city-wide geographic distribution of civic complaints and hotspot monitoring.'
          )}
        </p>
        <div className="filters-bar">
          <button className={`btn ${!filter ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter('')}>
            {bilingual('सभी', 'All')} ({getAllComplaints().length})
          </button>
          <button className={`btn ${filter === 'smart_waste' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter('smart_waste')}>
            🗑️ {bilingual('कचरा', 'Waste')}
          </button>
          <button className={`btn ${filter === 'jalrakshak' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter('jalrakshak')}>
            💧 {bilingual('जल', 'Water')}
          </button>
          <button className={`btn ${filter === 'rewa_sahayak' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter('rewa_sahayak')}>
            🏛️ {bilingual('सड़क/लाइट', 'Civic')}
          </button>
          <span style={{ flex: 1 }} />
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{bilingual('सभी स्थिति', 'All Status')}</option>
            <option value="active">{bilingual('केवल सक्रिय', 'Active Only')}</option>
            <option value="resolved">{bilingual('केवल निराकृत', 'Resolved Only')}</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {complaints.length} {bilingual('मार्कर', 'markers')}
          </span>
        </div>
        <MapView
          complaints={complaints}
          height="calc(100vh - 280px)"
          onMarkerClick={(c: Complaint) => navigate(`/admin/complaints/${c.id}`)}
        />
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
            <span>{bilingual('स्मार्ट वेस्ट', 'Smart Waste')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6' }} />
            <span>{bilingual('जल रक्षक', 'JalRakshak')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <span>{bilingual('रीवा सहायक (सड़क/लाइट)', 'Rewa Sahayak (Civic)')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
