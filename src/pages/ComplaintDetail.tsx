import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, User, Building, Sparkles, Printer, ShieldCheck, CheckCircle2, Video, Film, Camera } from 'lucide-react';
import { getComplaintById } from '../services/store';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../services/ai';
import MapView from '../components/MapView';
import { useGov } from '../context/GovContext';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const complaint = id ? getComplaintById(id) : undefined;

  if (!complaint) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 style={{ color: '#0b3a6d', fontWeight: 800 }}>
              {bilingual('शिकायत नहीं मिली', 'Complaint Not Found')}
            </h3>
            <p style={{ color: '#64748b' }}>
              {bilingual('यह शिकायत मौजूद नहीं है या हटा दी गई है।', "The complaint you're looking for doesn't exist.")}
            </p>
            <Link to="/complaints" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {bilingual('सभी शिकायतें देखें', 'View All Complaints')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page fade-in">
      <div className="container">
        
        {/* Navigation & Print Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link to="/complaints" className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            <span>{bilingual('← सभी शिकायतों पर वापस', '← Back to All Complaints')}</span>
          </Link>

          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={15} />
            <span>{bilingual('पावती प्रिंट करें', 'Print Acknowledgment')}</span>
          </button>
        </div>

        {/* Official Header Banner */}
        <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '5px solid #0b3a6d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  className="badge"
                  style={{
                    background: `${statusColors[complaint.status]}20`,
                    color: statusColors[complaint.status],
                    border: `1px solid ${statusColors[complaint.status]}44`,
                  }}
                >
                  ● {statusLabel(complaint.status)}
                </span>
                <span
                  className="badge"
                  style={{
                    background: `${severityColors[complaint.severity]}20`,
                    color: severityColors[complaint.severity],
                    border: `1px solid ${severityColors[complaint.severity]}44`,
                  }}
                >
                  {complaint.severity} PRIORITY
                </span>
                <span
                  className="badge"
                  style={{
                    background: `${moduleColors[complaint.module]}20`,
                    color: moduleColors[complaint.module],
                    border: `1px solid ${moduleColors[complaint.module]}44`,
                  }}
                >
                  {moduleLabel(complaint.module)}
                </span>
              </div>

              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.25rem' }}>
                {categoryIcons[complaint.category]} {complaint.title}
              </h1>

              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                <strong style={{ color: '#0b3a6d' }}>{complaint.ticket_number}</strong> •{' '}
                {bilingual('पंजीकृत तिथि:', 'Registration Date:')} {formatDateTime(complaint.created_at)}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="gov-seal-badge">
                <ShieldCheck size={14} color="#0b3a6d" />
                {bilingual('रीवा नगर निगम पंजीकृत', 'Rewa Municipal Corporation Registered')}
              </span>
              <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '0.35rem' }}>
                {bilingual('✓ नागरिक अधिकार पत्र SLA: 48 घंटे में समाधान', '✓ Citizen Charter SLA: 48hr Resolution')}
              </p>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {/* Main Content Column */}
          <div>
            {/* Description */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="detail-section-title">
                {bilingual('नागरिक द्वारा प्रस्तुत विवरण', 'Citizen Problem Description')}
              </h3>
              <p style={{ color: '#1e293b', lineHeight: 1.7, fontSize: '0.95rem' }}>{complaint.description}</p>
            </div>

            {/* AI Analysis Card */}
            <div className="card" style={{ marginBottom: '1.25rem', border: '1px solid #bfdbfe', background: '#f8fafc' }}>
              <h3 className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0b3a6d' }}>
                <Sparkles size={16} color="#0b3a6d" />
                {bilingual('AI विश्लेषण एवं वर्गीकरण (Rewa Sahayak AI)', 'AI Automated Classification (Rewa Sahayak AI)')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('श्रेणी (Category)', 'Category')}</span>
                  <p style={{ fontWeight: 700, color: '#0f172a' }}>{categoryLabel(complaint.category)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('उप-श्रेणी (Subcategory)', 'Subcategory')}</span>
                  <p style={{ fontWeight: 700, color: '#0f172a' }}>{complaint.subcategory}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('विभाग (Department)', 'Department')}</span>
                  <p style={{ fontWeight: 700, color: '#0f172a' }}>{moduleLabel(complaint.module)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('AI सटीकता (Confidence)', 'AI Confidence')}</span>
                  <p style={{ fontWeight: 700, color: '#0f172a' }}>{Math.round(complaint.ai_confidence * 100)}%</p>
                  <div className="confidence-bar" style={{ width: '90px' }}>
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${complaint.ai_confidence * 100}%`,
                        background: complaint.ai_confidence > 0.85 ? '#15803d' : '#d97706',
                      }}
                    />
                  </div>
                </div>
              </div>

              {complaint.ai_summary && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('AI सारांश (Summary)', 'AI Summary')}</span>
                  <p style={{ color: '#334155', fontSize: '0.88rem' }}>{complaint.ai_summary}</p>
                </div>
              )}
            </div>

            {/* Multi-Media Photo & Video Evidence Gallery */}
            {((complaint.media && complaint.media.length > 0) || complaint.image_url) && (
              <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 className="detail-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Film size={18} color="#0b3a6d" />
                    <span>{bilingual('संलग्न साक्ष्य (फोटो एवं वीडियो)', 'Attached Evidence (Photos & Videos)')}</span>
                  </h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    <ShieldCheck size={14} />
                    {complaint.media && complaint.media.length > 1
                      ? bilingual(
                          `✓ ${complaint.media.filter(m => m.type === 'image').length} फोटो, ${complaint.media.filter(m => m.type === 'video').length} वीडियो सत्यापित`,
                          `✓ ${complaint.media.filter(m => m.type === 'image').length} Photos, ${complaint.media.filter(m => m.type === 'video').length} Videos Verified`
                        )
                      : bilingual('अनिवार्य साक्ष्य सत्यापित (Anti-Spam Verified)', 'Compulsory Evidence Verified')}
                  </span>
                </div>

                <div className="media-gallery-grid">
                  {(complaint.media && complaint.media.length > 0
                    ? complaint.media
                    : [{ id: 'single-1', type: 'image' as const, url: complaint.image_url!, name: 'Photo Evidence' }]
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

                <p style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.65rem', fontWeight: 600, marginBottom: 0 }}>
                  ✓ {bilingual('भू-निर्देशांक (GPS) एवं वास्तविक स्थल टाइमस्टैम्प रीवा नगर निगम द्वारा सत्यापित', 'GPS coordinates & real-time timestamp verified by Rewa Nagar Nigam')}
                </p>
              </div>
            )}

            {/* Voice Transcript */}
            {complaint.voice_transcript && (
              <div className="card" style={{ marginBottom: '1.25rem', background: '#f8fafc' }}>
                <h3 className="detail-section-title">{bilingual('🎙️ ऑडियो ट्रांसक्रिप्शन (Voice Transcript)', '🎙️ Audio Voice Transcript')}</h3>
                <p style={{ color: '#334155', fontStyle: 'italic', fontSize: '0.92rem' }}>
                  "{complaint.voice_transcript}"
                </p>
              </div>
            )}

            {/* Map Location */}
            {complaint.latitude && complaint.longitude && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h3 className="detail-section-title">{bilingual('घटना स्थल मैप (Geo Location)', 'Incident Location Map')}</h3>
                <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: '#e65100' }} />
                  {complaint.address} ({complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)})
                </p>
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <MapView
                    complaints={[complaint]}
                    center={[complaint.latitude, complaint.longitude]}
                    zoom={15}
                    height="240px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="detail-sidebar">
            {/* Resolution Note if resolved */}
            {complaint.resolution_note && (
              <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#15803d" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                    {bilingual('निराकरण रिपोर्ट (Resolution Note)', 'Resolution Report (Official Note)')}
                  </h3>
                </div>
                <p style={{ color: '#14532d', fontSize: '0.88rem', lineHeight: 1.6 }}>{complaint.resolution_note}</p>
              </div>
            )}

            {/* Official Assignment Card */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('प्रशासनिक आवंटन', 'Administrative Assignment')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <User size={15} color="#0b3a6d" />
                  <span style={{ color: '#64748b' }}>{bilingual('नागरिक:', 'Citizen:')}</span>
                  <span style={{ fontWeight: 600 }}>{complaint.citizen_name}</span>
                </div>
                {complaint.assigned_department && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                    <Building size={15} color="#0b3a6d" />
                    <span style={{ color: '#64748b' }}>{bilingual('संबद्ध विभाग:', 'Assigned Dept:')}</span>
                    <span style={{ fontWeight: 700, color: '#0b3a6d' }}>{complaint.assigned_department}</span>
                  </div>
                )}
                {complaint.assigned_to && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                    <User size={15} color="#0b3a6d" />
                    <span style={{ color: '#64748b' }}>{bilingual('प्रभारी अधिकारी:', 'Officer:')}</span>
                    <span style={{ fontWeight: 600 }}>{complaint.assigned_to}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Official Timeline */}
            <div className="card">
              <h3 className="detail-section-title">{bilingual('कार्रवाई की स्थिति (Timeline)', 'Action Timeline')}</h3>
              <div className="timeline">
                {complaint.updates.map((u) => (
                  <div className="timeline-item" key={u.id}>
                    <div className="timeline-icon">
                      <Clock size={14} />
                    </div>
                    <div className="timeline-content">
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatDateTime(u.created_at)}</div>
                      <div style={{ fontWeight: 700, color: statusColors[u.status], fontSize: '0.85rem' }}>
                        {statusLabel(u.status)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.15rem' }}>{u.note}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {bilingual('द्वारा:', 'By:')} {u.updated_by}
                      </div>
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
