import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getAllComplaints } from '../../services/store';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../../services/ai';
import { useGov } from '../../context/GovContext';

export default function AdminComplaints() {
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');

  const complaints = useMemo(() => {
    let list = getAllComplaints();
    if (moduleFilter) list = list.filter(c => c.module === moduleFilter);
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (categoryFilter) list = list.filter(c => c.category === categoryFilter);
    if (severityFilter) list = list.filter(c => c.severity === severityFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.ticket_number.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return list;
  }, [moduleFilter, statusFilter, categoryFilter, severityFilter, search]);

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
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{bilingual('क्रमांक', 'Ticket')}</th>
                <th>{bilingual('समस्या', 'Problem')}</th>
                <th>{bilingual('श्रेणी', 'Category')}</th>
                <th>{bilingual('विभाग', 'Module')}</th>
                <th>{bilingual('प्राथमिकता', 'Priority')}</th>
                <th>{bilingual('स्थान / पता', 'Location')}</th>
                <th>{bilingual('स्थिति', 'Status')}</th>
                <th>{bilingual('पंजीकृत दिनांक', 'Created')}</th>
                <th>{bilingual('कार्रवाई', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    {bilingual('कोई शिकायत उपलब्ध नहीं है।', 'No complaints match filters.')}
                  </td>
                </tr>
              ) : (
                complaints.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{c.ticket_number}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{c.title}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{categoryIcons[c.category]} {categoryLabel(c.category)}</td>
                    <td><span className="badge" style={{ background: `${moduleColors[c.module]}22`, color: moduleColors[c.module] }}>{moduleLabel(c.module)}</span></td>
                    <td><span className="badge" style={{ background: `${severityColors[c.severity]}22`, color: severityColors[c.severity] }}>{c.severity}</span></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                    <td><span className="badge" style={{ background: `${statusColors[c.status]}22`, color: statusColors[c.status] }}>● {statusLabel(c.status)}</span></td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</td>
                    <td><Link to={`/admin/complaints/${c.id}`} className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.6rem' }}>{bilingual('प्रबंधन', 'Manage')}</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
