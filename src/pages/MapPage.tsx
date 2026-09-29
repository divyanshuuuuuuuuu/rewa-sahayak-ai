import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllComplaints } from '../services/store';
import MapView from '../components/MapView';
import type { Complaint } from '../types';
import { useGov } from '../context/GovContext';

export default function MapPage() {
  const navigate = useNavigate();
  const { bilingual } = useGov();
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const allComplaints = getAllComplaints();
  const filtered = allComplaints.filter((c) => {
    if (moduleFilter && c.module !== moduleFilter) return false;
    if (statusFilter === 'active' && ['RESOLVED', 'CLOSED'].includes(c.status)) return false;
    if (statusFilter === 'resolved' && !['RESOLVED', 'CLOSED'].includes(c.status)) return false;
    return true;
  });

  const handleMarkerClick = (c: Complaint) => {
    navigate(`/complaints/${c.id}`);
  };

  return (
    <div className="page fade-in">
      <div className="container">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.25rem' }}>
          🗺️ {bilingual('रीवा नगर निगम — वार्ड शिकायत मानचित्र', 'Rewa City Civic Grievance Map')}
        </h1>
        <p style={{ color: '#475569', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          {bilingual(
            'रीवा नगर निगम क्षेत्र में दर्ज सभी समस्याओं की वास्तविक स्थिति मानचित्र पर देखें। विवरण हेतु मार्कर पर क्लिक करें।',
            'View all reported issues across Rewa city on the interactive map. Click on any marker to inspect details.'
          )}
        </p>

        <div className="filters-bar">
          <button
            type="button"
            className={`btn ${!moduleFilter ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModuleFilter('')}
          >
            {bilingual('सभी', 'All')}
          </button>
          <button
            type="button"
            className={`btn ${moduleFilter === 'smart_waste' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModuleFilter('smart_waste')}
          >
            🗑️ {bilingual('कचरा', 'Waste')}
          </button>
          <button
            type="button"
            className={`btn ${moduleFilter === 'jalrakshak' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModuleFilter('jalrakshak')}
          >
            💧 {bilingual('जल रक्षक', 'Water')}
          </button>
          <button
            type="button"
            className={`btn ${moduleFilter === 'rewa_sahayak' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModuleFilter('rewa_sahayak')}
          >
            🏛️ {bilingual('सड़क/लाइट', 'Roads/Lights')}
          </button>
          <span style={{ flex: 1 }} />
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{bilingual('सभी स्थिति', 'All Status')}</option>
            <option value="active">{bilingual('केवल सक्रिय', 'Active Only')}</option>
            <option value="resolved">{bilingual('केवल निराकृत', 'Resolved Only')}</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {filtered.length} {bilingual('शिकायतें', 'markers')}
          </span>
        </div>

        <MapView
          complaints={filtered}
          height="calc(100vh - 280px)"
          onMarkerClick={handleMarkerClick}
        />

        {/* Legend */}
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
            <span>{bilingual('रीवा सहायक (सड़क/लाइट)', 'Rewa Sahayak (Roads/Lights)')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
