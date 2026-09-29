import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Clock, MapPin, Plus, ShieldCheck, Camera, Video } from 'lucide-react';
import { getAllComplaints } from '../services/store';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../services/ai';
import { useGov } from '../context/GovContext';

const statusKeys = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function Complaints() {
  const [searchParams] = useSearchParams();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const moduleParam = searchParams.get('module') || '';
  const searchParam = searchParams.get('search') || '';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [search, setSearch] = useState(searchParam);
  const [currentModule, setCurrentModule] = useState(moduleParam);

  const complaints = useMemo(() => {
    let list = getAllComplaints();
    if (currentModule) list = list.filter((c) => c.module === currentModule);
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (categoryFilter) list = list.filter((c) => c.category === categoryFilter);
    if (severityFilter) list = list.filter((c) => c.severity === severityFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.ticket_number.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentModule, statusFilter, categoryFilter, severityFilter, search]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="page fade-in">
      <div className="container">
        
        {/* Header with 1-Tap lodge button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="gov-seal-badge" style={{ marginBottom: '0.35rem' }}>
              <ShieldCheck size={14} color="#0b3a6d" />
              {bilingual('रीवा नगर निगम — सार्वजनिक शिकायत पंजी', 'Rewa Municipal Corporation — Public Grievance Register')}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0b3a6d', margin: 0 }}>
              {currentModule
                ? moduleLabel(currentModule)
                : bilingual('सभी जन-शिकायतें एवं निराकरण स्थिति', 'All Civic Grievances & Resolution Status')}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              {complaints.length} {bilingual('शिकायतें उपलब्ध', 'complaints found')}
            </p>
          </div>

          <Link to="/report" className="btn btn-primary" style={{ background: '#e65100', borderColor: '#c2410c' }}>
            <Plus size={16} />
            <span>{bilingual('नई शिकायत दर्ज करें', '+ Lodge New Issue')}</span>
          </Link>
        </div>

        {/* Module Tabs */}
        <div className="tabs">
          <button type="button" className={`tab ${!currentModule ? 'active' : ''}`} onClick={() => setCurrentModule('')}>
            {bilingual('सभी विभाग', 'All Divisions')}
          </button>
          <button
            type="button"
            className={`tab ${currentModule === 'smart_waste' ? 'active' : ''}`}
            onClick={() => setCurrentModule('smart_waste')}
          >
            🗑️ {bilingual('स्मार्ट वेस्ट', 'Smart Waste')}
          </button>
          <button
            type="button"
            className={`tab ${currentModule === 'jalrakshak' ? 'active' : ''}`}
            onClick={() => setCurrentModule('jalrakshak')}
          >
            💧 {bilingual('जल रक्षक', 'JalRakshak')}
          </button>
          <button
            type="button"
            className={`tab ${currentModule === 'rewa_sahayak' ? 'active' : ''}`}
            onClick={() => setCurrentModule('rewa_sahayak')}
          >
            🏛️ {bilingual('रीवा सहायक (सड़क/लाइट)', 'Rewa Sahayak (Roads/Lights)')}
          </button>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder={bilingual('शिकायत क्रमांक, शीर्षक या वार्ड खोजें...', 'Search ticket number, title, or ward...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{bilingual('सभी स्थिति', 'All Status')}</option>
            {statusKeys.map((k) => (
              <option key={k} value={k}>
                {statusLabel(k)}
              </option>
            ))}
          </select>

          <select className="filter-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">{bilingual('सभी प्राथमिकता', 'All Priorities')}</option>
            <option value="HIGH">{bilingual('उच्च (High)', 'High Priority')}</option>
            <option value="MEDIUM">{bilingual('मध्यम (Medium)', 'Medium Priority')}</option>
            <option value="LOW">{bilingual('सामान्य (Low)', 'Low Priority')}</option>
          </select>

          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">{bilingual('सभी श्रेणियां', 'All Categories')}</option>
            {Object.keys(categoryIcons).map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Complaint List */}
        {complaints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 style={{ color: '#0b3a6d', fontWeight: 800 }}>
              {bilingual('कोई शिकायत नहीं मिली', 'No Complaints Found')}
            </h3>
            <p style={{ color: '#64748b' }}>
              {bilingual('कृपया फिल्टर या खोज शब्द बदलकर पुनः प्रयास करें।', 'Try adjusting your filters or search keywords.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {complaints.map((c) => (
              <Link to={`/complaints/${c.id}`} key={c.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="complaint-card">
                  <div className="complaint-card-header">
                    <div style={{ flex: 1 }}>
                      <div className="complaint-card-title">
                        {categoryIcons[c.category]} {c.title}
                      </div>
                      <div className="complaint-card-meta" style={{ marginTop: '0.35rem' }}>
                        <span style={{ fontWeight: 800, color: '#0b3a6d', background: '#eef4fb', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {c.ticket_number}
                        </span>
                        <span>•</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{categoryLabel(c.category)}</span>
                        {c.address && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#475569' }}>
                              <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                              {c.address}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span
                        className="badge"
                        style={{
                          background: `${statusColors[c.status]}20`,
                          color: statusColors[c.status],
                          border: `1px solid ${statusColors[c.status]}44`,
                        }}
                      >
                        ● {statusLabel(c.status)}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: `${severityColors[c.severity]}20`,
                          color: severityColors[c.severity],
                          border: `1px solid ${severityColors[c.severity]}44`,
                        }}
                      >
                        {c.severity}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className="badge"
                        style={{
                          background: `${moduleColors[c.module]}15`,
                          color: moduleColors[c.module],
                          border: `1px solid ${moduleColors[c.module]}33`,
                        }}
                      >
                        {moduleLabel(c.module)}
                      </span>
                      {c.media && c.media.some((m) => m.type === 'video') ? (
                        <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#dbeafe', padding: '0.12rem 0.45rem', borderRadius: '4px' }}>
                          <Video size={11} /> {bilingual('वीडियो साक्ष्य', 'Video Proof')} ({c.media.length})
                        </span>
                      ) : (c.media && c.media.length > 1) ? (
                        <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#dcfce7', padding: '0.12rem 0.45rem', borderRadius: '4px' }}>
                          <Camera size={11} /> {c.media.length} {bilingual('फोटो साक्ष्य', 'Photos Attached')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#dcfce7', padding: '0.12rem 0.45rem', borderRadius: '4px' }}>
                          <Camera size={11} /> {bilingual('फोटो साक्ष्य प्रमाणित', 'Photo Verified')}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {formatDate(c.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
