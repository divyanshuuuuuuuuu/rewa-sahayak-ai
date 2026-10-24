import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Eye, EyeOff } from 'lucide-react';
import { getAllComplaints, syncFromSupabase, adminRemoveComplaintFromWebsite, adminRestoreComplaintToWebsite } from '../../services/store';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../../services/ai';
import { useGov } from '../../context/GovContext';

export default function AdminComplaints() {
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [allComplaints, setAllComplaints] = useState(getAllComplaints());
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    syncFromSupabase().then(() => setAllComplaints(getAllComplaints()));
    const onUpdate = () => setAllComplaints(getAllComplaints());
    window.addEventListener('rewa_store_updated', onUpdate);
    return () => window.removeEventListener('rewa_store_updated', onUpdate);
  }, []);

  const complaints = useMemo(() => {
    let list = allComplaints;
    if (moduleFilter) list = list.filter(c => c.module === moduleFilter);
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (categoryFilter) list = list.filter(c => c.category === categoryFilter);
    if (severityFilter) list = list.filter(c => c.severity === severityFilter);
    if (visibilityFilter === 'live') list = list.filter(c => !c.removed_from_website);
    if (visibilityFilter === 'removed') list = list.filter(c => !!c.removed_from_website);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.ticket_number.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    // Complaints marked as SUBMITTED are placed at the bottom of all complaints
    return [...list].sort((a, b) => {
      const aIsSubmitted = a.status === 'SUBMITTED';
      const bIsSubmitted = b.status === 'SUBMITTED';
      if (aIsSubmitted && !bIsSubmitted) return 1; // SUBMITTED moves towards bottom
      if (!aIsSubmitted && bIsSubmitted) return -1; // non-SUBMITTED stays at top
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allComplaints, moduleFilter, statusFilter, categoryFilter, severityFilter, visibilityFilter, search]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="page fade-in">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0b3a6d' }}>
              {bilingual('समस्त पंजीकृत शिकायतें (प्रशासनिक)', 'All Registered Grievances (Admin)')}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>
              {complaints.length} {bilingual('शिकायतें उपलब्ध', 'results found')}
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder={bilingual('खोजें: क्रमांक, शीर्षक, वार्ड...', 'Search tickets, titles, locations...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">{bilingual('सभी विभाग', 'All Modules')}</option>
            <option value="smart_waste">🗑️ {bilingual('स्मार्ट वेस्ट', 'Smart Waste')}</option>
            <option value="jalrakshak">💧 {bilingual('जल रक्षक', 'JalRakshak')}</option>
            <option value="rewa_sahayak">🏛️ {bilingual('रीवा सहायक', 'Rewa Sahayak')}</option>
          </select>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{bilingual('सभी स्थिति', 'All Status')}</option>
            {['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((k) => (
              <option key={k} value={k}>{statusLabel(k)}</option>
            ))}
          </select>
          <select className="filter-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">{bilingual('सभी प्राथमिकता', 'All Priority')}</option>
            <option value="HIGH">{bilingual('उच्च (High)', 'High')}</option>
            <option value="MEDIUM">{bilingual('मध्यम (Medium)', 'Medium')}</option>
            <option value="LOW">{bilingual('सामान्य (Low)', 'Low')}</option>
          </select>
          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">{bilingual('सभी श्रेणियां', 'All Categories')}</option>
            {Object.keys(categoryIcons).map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
          <select className="filter-select" value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
            <option value="">{bilingual('वेबसाइट दृश्यता: सभी', 'Visibility: All')}</option>
            <option value="live">🌐 {bilingual('सार्वजनिक लाइव', 'Live on Site')}</option>
            <option value="removed">🚫 {bilingual('वेबसाइट से हटाई गई', 'Removed from Site')}</option>
          </select>
        </div>

        {/* Desktop Data Table */}
        <div className="table-container table-desktop-only">
          <table>
            <thead>
              <tr>
                <th>{bilingual('क्रमांक', 'Ticket')}</th>
                <th>{bilingual('समस्या', 'Problem')}</th>
                <th>{bilingual('श्रेणी', 'Category')}</th>
                <th>{bilingual('विभाग', 'Module')}</th>
                <th>{bilingual('प्राथमिकता', 'Priority')}</th>
                <th>{bilingual('स्थान / पता', 'Location')}</th>
                <th>{bilingual('प्रभारी कर्मी', 'Assigned Worker')}</th>
                <th>{bilingual('स्थिति', 'Status')}</th>
                <th>{bilingual('पंजीकृत दिनांक', 'Created')}</th>
                <th>{bilingual('कार्रवाई', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    {bilingual('कोई शिकायत उपलब्ध नहीं है।', 'No complaints match filters.')}
                  </td>
                </tr>
              ) : (
                complaints.map(c => (
                  <tr key={c.id}>
                    <td className="ticket-badge" style={{ color: 'var(--gov-navy)', whiteSpace: 'nowrap' }}>{c.ticket_number}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      <div>{c.title}</div>
                      {c.removed_from_website && (
                        <div style={{ marginTop: '2px' }}>
                          <span style={{ fontSize: '0.66rem', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                            🚫 वेबसाइट से हटाई गई (Worker Preserved)
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{categoryIcons[c.category]} {categoryLabel(c.category)}</td>
                    <td><span className="badge" style={{ background: `${moduleColors[c.module]}22`, color: moduleColors[c.module] }}>{moduleLabel(c.module)}</span></td>
                    <td><span className="badge" style={{ background: `${severityColors[c.severity]}22`, color: severityColors[c.severity] }}>{c.severity}</span></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 600, color: c.assigned_to ? 'var(--gov-navy)' : '#94a3b8' }}>
                      {c.assigned_to ? `👷 ${c.assigned_to}` : '—'}
                    </td>
                    <td><span className="badge" style={{ background: `${statusColors[c.status]}22`, color: statusColors[c.status] }}>● {statusLabel(c.status)}</span></td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <Link to={`/admin/complaints/${c.id}`} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.65rem' }}>{bilingual('प्रबंधन', 'Manage')}</Link>
                        {c.removed_from_website ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}
                            title="वेबसाइट पर पुनः बहाल करें"
                            onClick={async () => {
                              await adminRestoreComplaintToWebsite(c.id);
                              await syncFromSupabase();
                              setAllComplaints(getAllComplaints());
                            }}
                          >
                            ↺ बहाल
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 700 }}
                            title="सार्वजनिक वेबसाइट से हटाएं (वर्कर डैशबोर्ड में सुरक्षित रहेगी)"
                            onClick={async () => {
                              if (confirm('क्या आप इस शिकायत को सार्वजनिक वेबसाइट से हटाना चाहते हैं? (फील्ड कर्मी के डैशबोर्ड में कार्य गणना व रिकॉर्ड 100% सुरक्षित रहेगा)')) {
                                await adminRemoveComplaintFromWebsite(c.id);
                                await syncFromSupabase();
                                setAllComplaints(getAllComplaints());
                              }
                            }}
                          >
                            🗑️ हटाएं
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="table-mobile-cards">
          {complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p style={{ color: '#64748b', margin: 0 }}>
                {bilingual('कोई शिकायत उपलब्ध नहीं है।', 'No complaints match filters.')}
              </p>
            </div>
          ) : (
            complaints.map(c => (
              <div key={c.id} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${statusColors[c.status] || 'var(--gov-navy)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="ticket-badge" style={{ color: 'var(--gov-navy)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {c.ticket_number}
                    </span>
                    {c.removed_from_website && (
                      <span style={{ fontSize: '0.66rem', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                        🚫 हटाई गई
                      </span>
                    )}
                  </div>
                  <span className="badge" style={{ background: `${statusColors[c.status]}20`, color: statusColors[c.status] }}>
                    ● {statusLabel(c.status)}
                  </span>
                </div>

                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                  {c.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.55rem', fontSize: '0.8rem', color: '#526273' }}>
                  <span style={{ fontWeight: 600 }}>{categoryIcons[c.category]} {categoryLabel(c.category)}</span>
                  {c.address && (
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', color: '#475569', lineHeight: 1.35 }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--gov-saffron)' }} />
                      <span>{c.address}</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {c.assigned_to ? <span>👷 {c.assigned_to}</span> : <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Link
                      to={`/admin/complaints/${c.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '0.3rem 0.75rem' }}
                    >
                      {bilingual('प्रबंधन →', 'Manage →')}
                    </Link>
                    {c.removed_from_website ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}
                        onClick={async () => {
                          await adminRestoreComplaintToWebsite(c.id);
                          await syncFromSupabase();
                          setAllComplaints(getAllComplaints());
                        }}
                      >
                        ↺ बहाल
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 700 }}
                        onClick={async () => {
                          if (confirm('क्या आप इस शिकायत को सार्वजनिक वेबसाइट से हटाना चाहते हैं? (फील्ड कर्मी के डैशबोर्ड में कार्य गणना व रिकॉर्ड सुरक्षित रहेगा)')) {
                            await adminRemoveComplaintFromWebsite(c.id);
                            await syncFromSupabase();
                            setAllComplaints(getAllComplaints());
                          }
                        }}
                      >
                        🗑️ हटाएं
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
