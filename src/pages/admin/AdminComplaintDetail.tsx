import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock, Film, Video, Camera } from 'lucide-react';
import { getComplaintById, updateComplaintStatus, assignComplaint, updateComplaintPriority } from '../../services/store';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../../services/ai';
import { demoDepartments } from '../../data/demoData';
import MapView from '../../components/MapView';
import type { ComplaintStatus, Severity } from '../../types';
import { useGov } from '../../context/GovContext';

export default function AdminComplaintDetail() {
  const { id } = useParams();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [complaint, setComplaint] = useState(id ? getComplaintById(id) : undefined);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [internalNote, setInternalNote] = useState('');

  if (!complaint) {
    return (
      <div className="page"><div className="container">
        <div className="empty-state">
          <h3>{bilingual('शिकायत नहीं मिली', 'Complaint not found')}</h3>
          <Link to="/admin/complaints" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {bilingual('← सभी शिकायतों पर वापस', 'Back to Complaints')}
          </Link>
        </div>
      </div></div>
    );
  }

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    const updated = updateComplaintStatus(
      complaint.id,
      newStatus as ComplaintStatus,
      statusNote || `Status changed to ${statusLabel(newStatus)}`,
      'Admin Officer'
    );
    if (updated) { setComplaint({ ...updated }); setNewStatus(''); setStatusNote(''); }
  };

  const handleAssign = () => {
    if (!assignDept) return;
    const updated = assignComplaint(complaint.id, assignDept, assignTo);
    if (updated) { setComplaint({ ...updated }); setAssignDept(''); setAssignTo(''); }
  };

  const handlePriorityChange = () => {
    if (!newPriority) return;
    const updated = updateComplaintPriority(complaint.id, newPriority as Severity);
    if (updated) { setComplaint({ ...updated }); setNewPriority(''); }
  };

  const handleAddNote = () => {
    if (!internalNote.trim()) return;
    const updated = updateComplaintStatus(complaint.id, complaint.status, internalNote, 'Admin Officer');
    if (updated) { setComplaint({ ...updated }); setInternalNote(''); }
  };

  return (
    <div className="page fade-in">
      <div className="container">
        <Link to="/admin/complaints" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {bilingual('← सभी शिकायतों पर वापस', 'Back to Complaints')}
        </Link>

        <div className="detail-grid">
          {/* Main */}
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: `${statusColors[complaint.status]}22`, color: statusColors[complaint.status] }}>
                  ● {statusLabel(complaint.status)}
                </span>
                <span className="badge" style={{ background: `${severityColors[complaint.severity]}22`, color: severityColors[complaint.severity] }}>
                  {complaint.severity} {bilingual('प्राथमिकता', 'Priority')}
                </span>
                <span className="badge" style={{ background: `${moduleColors[complaint.module]}22`, color: moduleColors[complaint.module] }}>
                  {moduleLabel(complaint.module)}
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0b3a6d' }}>
                {categoryIcons[complaint.category]} {complaint.title}
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                <strong style={{ color: '#0b3a6d' }}>{complaint.ticket_number}</strong> • {formatDateTime(complaint.created_at)}
              </p>
            </div>

            {/* Description */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="detail-section-title">{bilingual('नागरिक द्वारा विवरण', 'Description')}</h3>
              <p style={{ color: '#1e293b', lineHeight: 1.7 }}>{complaint.description}</p>
            </div>

            {/* AI */}
            <div className="card" style={{ marginBottom: '1.25rem', borderColor: '#bfdbfe' }}>
              <h3 className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0b3a6d' }}>
                <Sparkles size={14} /> {bilingual('AI वर्गीकरण एवं विश्लेषण', 'AI Classification')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('श्रेणी (Category)', 'Category')}</span><p style={{ fontWeight: 600 }}>{categoryLabel(complaint.category)}</p></div>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('विभाग (Module)', 'Module')}</span><p style={{ fontWeight: 600 }}>{moduleLabel(complaint.module)}</p></div>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('AI सटीकता (Confidence)', 'Confidence')}</span><p style={{ fontWeight: 600 }}>{Math.round(complaint.ai_confidence * 100)}%</p></div>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('नागरिक (Citizen)', 'Citizen')}</span><p style={{ fontWeight: 600 }}>{complaint.citizen_name}</p></div>
              </div>
            </div>

            {complaint.voice_transcript && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h3 className="detail-section-title">{bilingual('🎙️ ऑडियो विवरण', '🎙️ Voice Transcript')}</h3>
                <p style={{ color: '#334155', fontStyle: 'italic' }}>"{complaint.voice_transcript}"</p>
              </div>
            )}

            {/* Multi-Media Photo & Video Evidence Gallery */}
            {((complaint.media && complaint.media.length > 0) || complaint.image_url) && (
              <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #86efac' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <h3 className="detail-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Film size={18} color="#0b3a6d" />
                    <span>{bilingual('📷/🎥 अनिवार्य स्थल साक्ष्य (फोटो एवं वीडियो)', '📷/🎥 Mandatory Spot Evidence (Photos & Videos)')}</span>
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '0.2rem 0.65rem', borderRadius: '4px' }}>
                    ✓ {complaint.media && complaint.media.length > 1
                      ? bilingual(
                          `${complaint.media.filter(m => m.type === 'image').length} फोटो, ${complaint.media.filter(m => m.type === 'video').length} वीडियो सत्यापित`,
                          `${complaint.media.filter(m => m.type === 'image').length} Photos, ${complaint.media.filter(m => m.type === 'video').length} Videos Verified`
                        )
                      : bilingual('फर्जी शिकायत रोकथाम सत्यापन उत्तीर्ण', 'Anti-Spam Verification Passed')}
                  </span>
                </div>

                <div className="media-gallery-grid">
                  {(complaint.media && complaint.media.length > 0
                    ? complaint.media
                    : [{ id: 'admin-m-1', type: 'image' as const, url: complaint.image_url!, name: 'Spot Proof' }]
                  ).map((item) => (
                    <div key={item.id} className="media-item-card">
                      <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                        {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                      </span>
                      <div className="media-thumb-container">
                        {item.type === 'video' ? (
                          item.url.startsWith('data:image/svg') ? (
                            <img src={item.url} alt={item.name} className="media-thumb-img" />
                          ) : (
                            <video src={item.url} controls playsInline className="media-video-player" />
                          )
                        ) : (
                          <img src={item.url} alt={item.name} className="media-thumb-img" />
                        )}
                      </div>
                      <div className="media-item-info">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 600 }}>
                          {item.name}
                        </span>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Verified</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '0.65rem', fontWeight: 600, marginBottom: 0 }}>
                  ✓ {bilingual('नागरिक द्वारा घटनास्थल से प्रत्यक्ष फोटो/वीडियो साक्ष्य संलग्न किया गया है।', 'Citizen attached direct on-site photo/video evidence.')}
                </p>
              </div>
            )}

            {complaint.latitude && complaint.longitude && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h3 className="detail-section-title">{bilingual('📍 लोकेशन मानचित्र', '📍 Location Map')}</h3>
                <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{complaint.address}</p>
                <MapView complaints={[complaint]} center={[complaint.latitude, complaint.longitude]} zoom={15} height="200px" />
              </div>
            )}
          </div>

          {/* Sidebar — Admin Actions */}
          <div className="detail-sidebar">
            {/* Change Status */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('स्थिति अद्यतन करें', 'Change Status')}</h3>
              <select className="form-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ marginBottom: '0.5rem' }}>
                <option value="">{bilingual('नई स्थिति चुनें...', 'Select new status...')}</option>
                {['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
                  .filter((k) => k !== complaint.status)
                  .map((k) => (
                    <option key={k} value={k}>{statusLabel(k)}</option>
                  ))}
              </select>
              <textarea
                className="form-input"
                placeholder={bilingual('टिप्पणी जोड़ें (ऐच्छिक)...', 'Add a note (optional)...')}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                style={{ minHeight: '60px', marginBottom: '0.5rem' }}
              />
              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleStatusUpdate} disabled={!newStatus}>
                {bilingual('स्थिति अपडेट करें', 'Update Status')}
              </button>
            </div>

            {/* Assign */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('विभाग आवंटन', 'Assign Department')}</h3>
              <select className="form-input" value={assignDept} onChange={(e) => setAssignDept(e.target.value)} style={{ marginBottom: '0.5rem' }}>
                <option value="">{bilingual('विभाग चुनें...', 'Select department...')}</option>
                {demoDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <input
                className="form-input"
                placeholder={bilingual('प्रभारी अधिकारी (ऐच्छिक)', 'Assign to person (optional)')}
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', background: '#0b3a6d', color: '#fff' }} onClick={handleAssign} disabled={!assignDept}>
                {bilingual('आवंटित करें', 'Assign')}
              </button>
            </div>

            {/* Change Priority */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('प्राथमिकता बदलें', 'Change Priority')}</h3>
              <select className="form-input" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ marginBottom: '0.5rem' }}>
                <option value="">{bilingual('प्राथमिकता चुनें...', 'Select priority...')}</option>
                <option value="LOW">{bilingual('सामान्य (Low)', 'Low')}</option>
                <option value="MEDIUM">{bilingual('मध्यम (Medium)', 'Medium')}</option>
                <option value="HIGH">{bilingual('उच्च (High)', 'High')}</option>
              </select>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handlePriorityChange} disabled={!newPriority}>
                {bilingual('प्राथमिकता अपडेट करें', 'Update Priority')}
              </button>
            </div>

            {/* Internal Note */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('प्रशासनिक नोट जोड़ें', 'Add Internal Note')}</h3>
              <textarea
                className="form-input"
                placeholder={bilingual('टिप्पणी लिखें...', 'Write a note...')}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                style={{ minHeight: '60px', marginBottom: '0.5rem' }}
              />
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddNote} disabled={!internalNote.trim()}>
                {bilingual('नोट सहेजें', 'Add Note')}
              </button>
            </div>

            {/* Resolution */}
            {complaint.resolution_note && (
              <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4' }}>
                <h3 className="detail-section-title" style={{ color: '#166534' }}>
                  ✅ {bilingual('समाधान रिपोर्ट (Resolution)', 'Resolution')}
                </h3>
                <p style={{ color: '#14532d', fontSize: '0.9rem' }}>{complaint.resolution_note}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('कार्रवाई की स्थिति (Activity Timeline)', 'Activity Timeline')}</h3>
              <div className="timeline">
                {complaint.updates.map(u => (
                  <div className="timeline-item" key={u.id}>
                    <div className="timeline-content">
                      <div className="timeline-time"><Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {formatDateTime(u.created_at)}</div>
                      <div className="timeline-status" style={{ color: statusColors[u.status], fontWeight: 700, fontSize: '0.85rem' }}>● {statusLabel(u.status)}</div>
                      <div className="timeline-text" style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>{u.note}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>{bilingual('द्वारा:', 'by')} {u.updated_by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
