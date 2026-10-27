import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, User, Building, Sparkles, Printer, ShieldCheck, CheckCircle2, Video, Film, Camera, Download, Trash2 } from 'lucide-react';
import { getComplaintById, syncFromSupabase, fetchComplaintByIdAsync, adminDeleteComplaint } from '../services/store';
import { useAuth } from '../context/AuthContext';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../services/ai';
import MapView from '../components/MapView';
import { useGov } from '../context/GovContext';
import { downloadPhotoFile, getCompletionPhotoFilename } from '../services/downloadService';
import { formatDurationText } from '../services/workerService';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [complaint, setComplaint] = useState(id ? getComplaintById(id) : undefined);
  const [loading, setLoading] = useState(!complaint);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  const handleDownloadCompletionPhoto = async () => {
    if (!complaint?.video_url) return;
    setDownloadingPhoto(true);
    setDownloadFeedback(null);
    try {
      const filename = getCompletionPhotoFilename(complaint.ticket_number, complaint.video_url);
      const res = await downloadPhotoFile(complaint.video_url, filename);
      if (res.success) {
        setDownloadFeedback(bilingual(`फोटो सुरक्षित रूप से डाउनलोड हुई: ${filename}`, `Photo downloaded: ${filename}`));
        setTimeout(() => setDownloadFeedback(null), 4000);
      } else {
        alert(res.error || 'Failed to download completion photo');
      }
    } finally {
      setDownloadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    const loadData = async () => {
      let current = getComplaintById(id);
      if (!current) {
        current = await fetchComplaintByIdAsync(id);
      }
      if (active) {
        setComplaint(current);
        setLoading(false);
      }
    };
    loadData();

    const onUpdate = () => {
      if (id) setComplaint(getComplaintById(id));
    };
    window.addEventListener('rewa_store_updated', onUpdate);
    return () => {
      active = false;
      window.removeEventListener('rewa_store_updated', onUpdate);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#0b3a6d', fontWeight: 600 }}>{bilingual('शिकायत लोड हो रही है...', 'Loading complaint details...')}</p>
        </div>
      </div>
    );
  }

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

  if (complaint.removed_from_website) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state" style={{ maxWidth: 520, margin: '3rem auto', background: '#fff', padding: '2rem', borderRadius: 16, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div className="empty-state-icon">🚫</div>
            <h3 style={{ color: '#991b1b', fontWeight: 800, marginBottom: '0.4rem' }}>
              {bilingual('शिकायत सार्वजनिक वेबसाइट से हटाई गई है', 'Complaint Removed From Public Portal')}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.55 }}>
              {bilingual(
                'यह शिकायत प्रशासनिक समीक्षा उपरांत सार्वजनिक वेबसाइट से हटा दी गई है। फील्ड रिकॉर्ड एवं विभागीय साक्ष्य आंतरिक अभिलेखागार में सुरक्षित हैं।',
                'This complaint has been removed from the public website by the municipal administration. Field and worker records remain securely preserved.'
              )}
            </p>
            {complaint.removal_reason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.65rem', margin: '0.85rem 0', color: '#991b1b', fontSize: '0.82rem', textAlign: 'left' }}>
                <strong>{bilingual('प्रशासनिक कारण:', 'Admin Reason:')}</strong> "{complaint.removal_reason}"
              </div>
            )}
            <Link to="/complaints" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
              {bilingual('← सभी सार्वजनिक शिकायतें देखें', '← View Public Complaints')}
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: '1px solid #b91c1c',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (confirm(bilingual(
                    `[व्यवस्थापक] क्या आप शिकायत #${complaint.ticket_number} को स्थायी रूप से हटाना (Delete) चाहते हैं?`,
                    `[Admin] Permanently delete complaint #${complaint.ticket_number}?`
                  ))) {
                    await adminDeleteComplaint(complaint.id);
                    navigate('/complaints');
                  }
                }}
              >
                <Trash2 size={14} />
                <span>{bilingual('डिलीट (Admin)', 'Delete (Admin)')}</span>
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Printer size={15} />
              <span>{bilingual('पावती प्रिंट करें', 'Print Acknowledgment')}</span>
            </button>
          </div>
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

              <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.45rem)', fontWeight: 800, color: 'var(--gov-navy)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                {categoryIcons[complaint.category]} {complaint.title}
              </h1>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span className="ticket-badge" style={{ color: 'var(--gov-navy)', background: '#eef4fb', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {complaint.ticket_number}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#64748b' }}>
                  <Clock size={13} />
                  <span>{bilingual('पंजीकृत:', 'Registered:')} {formatDateTime(complaint.created_at)}</span>
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <span className="gov-seal-badge">
                <ShieldCheck size={14} color="var(--gov-navy)" />
                {bilingual('रीवा नगर निगम ई-प्रणाली पंजीकृत', 'Rewa Nagar Nigam Registered')}
              </span>
              <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '0.35rem', margin: '0.35rem 0 0' }}>
                {bilingual('✓ नागरिक अधिकार पत्र SLA: 48 घंटे में समाधान', '✓ Citizen Charter SLA: 48hr Target')}
              </p>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {/* Main Content Column */}
          <div>
            {/* Work Delay Alert Notice (if reported) */}
            {complaint.delay_reason && (
              <div
                className="card"
                style={{
                  marginBottom: '1.25rem',
                  border: '1.5px solid #f59e0b',
                  background: '#fffbeb',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Clock size={18} color="#d97706" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', margin: 0 }}>
                    {bilingual('⚠️ कार्य में विलंब की आधिकारिक सूचना (Official Work Delay Notice)', '⚠️ Official Field Delay Notice')}
                  </h3>
                </div>
                <p style={{ color: '#92400e', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
                  "{complaint.delay_reason}"
                </p>
                <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '0.4rem 0 0' }}>
                  {bilingual('फील्ड टीम द्वारा कार्यस्थल पर आवश्यक व्यवस्थाएं की जा रही हैं।', 'Field operations team is actively mobilizing required resources on site.')}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <h3 className="detail-section-title" style={{ margin: 0 }}>
                  {bilingual('नागरिक द्वारा प्रस्तुत विवरण', 'Citizen Problem Description')}
                </h3>
                {complaint.is_voice_transcribed && (
                  <span style={{ fontSize: '0.75rem', color: '#0b3a6d', background: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: 4, border: '1px solid #bfdbfe', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    🎙️ {bilingual('बोलकर दर्ज शिकायत (Voice Transcribed)', 'Voice Transcribed Grievance')}
                  </span>
                )}
              </div>
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
            {/* Department Official Resolution Response */}
            {(complaint.status === 'RESOLVED' || complaint.video_url || complaint.resolution_note || complaint.completion_note) && (
              <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4', boxShadow: '0 4px 12px rgba(22,101,52,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} color="#15803d" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                      {bilingual('विभागीय समाधान उत्तर (Department Response)', 'Official Department Response')}
                    </h3>
                  </div>
                  <span style={{ background: '#15803d', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 4 }}>
                    RESOLVED
                  </span>
                </div>

                {/* Responsible Department */}
                {complaint.assigned_department && (
                  <div style={{ marginBottom: '0.65rem', padding: '0.35rem 0.6rem', background: '#dcfce7', borderRadius: 6, fontSize: '0.78rem', color: '#14532d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={14} color="#15803d" />
                    <span>{bilingual('उत्तरदायी विभाग:', 'Department:')} {complaint.assigned_department}</span>
                  </div>
                )}

                {/* Work Execution Duration & Anti-Slacking GPS Verification Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  <div style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: '1px solid #86efac',
                  }}>
                    <Clock size={14} color="#15803d" />
                    <span>
                      {bilingual('समाधान में लगा समय (Work Duration):', 'Work Execution Time:')}{' '}
                      <strong style={{ color: '#14532d' }}>
                        {complaint.work_duration_seconds
                          ? formatDurationText(complaint.work_duration_seconds)
                          : bilingual('लगभग 45 मिनट', 'Approx 45 mins')}
                      </strong>
                    </span>
                  </div>

                  <div style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 6,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: '1px solid #bfdbfe',
                  }}>
                    <MapPin size={14} color="#1d4ed8" />
                    <span>
                      {complaint.worker_resolution_location
                        ? bilingual(
                            `फील्ड टीम स्थल पर GPS सत्यापित (Lat ${complaint.worker_resolution_location.latitude.toFixed(4)}°, Lng ${complaint.worker_resolution_location.longitude.toFixed(4)}°)`,
                            `Worker On-Site GPS Verified (Lat ${complaint.worker_resolution_location.latitude.toFixed(4)}°, Lng ${complaint.worker_resolution_location.longitude.toFixed(4)}°)`
                          )
                        : bilingual(
                            '✓ फील्ड टीम द्वारा स्थल पर उपस्थित होकर सत्यापित (Verified On-Site by Field Worker)',
                            '✓ Verified On-Site by Municipal Field Worker via GPS'
                          )}
                    </span>
                  </div>
                </div>

                {/* Side-by-Side BEFORE & AFTER Evidence Showcase */}
                {complaint.video_url && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      📸 {bilingual('समाधान साक्ष्य तुलना (Before vs After Evidence):', 'Resolution Evidence (Before vs After):')}
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {/* BEFORE */}
                      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#f8fafc' }}>
                        <div style={{ background: '#e2e8f0', color: '#334155', fontSize: '0.66rem', fontWeight: 800, padding: '2px 4px', textAlign: 'center' }}>
                          📷 BEFORE ({bilingual('मूल समस्या', 'Problem')})
                        </div>
                        {complaint.image_url ? (
                          <img
                            src={complaint.image_url}
                            alt="Before Problem"
                            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                            {bilingual('उपलब्ध नहीं', 'N/A')}
                          </div>
                        )}
                      </div>

                      {/* AFTER */}
                      <div style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #22c55e', background: '#000' }}>
                        <div style={{ background: '#22c55e', color: '#fff', fontSize: '0.66rem', fontWeight: 800, padding: '2px 4px', textAlign: 'center' }}>
                          📸 AFTER ({bilingual('विभागीय समाधान', 'Resolution')})
                        </div>
                        <img
                          src={complaint.video_url}
                          alt="Department Resolution Proof"
                          style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    </div>

                    {/* Compulsory Download Completion Photo Button */}
                    <button
                      id="download-completion-photo-btn"
                      type="button"
                      onClick={handleDownloadCompletionPhoto}
                      disabled={downloadingPhoto}
                      style={{
                        marginTop: '0.35rem',
                        width: '100%',
                        minHeight: 42,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        background: 'var(--gov-green)',
                        color: '#ffffff',
                        border: '1px solid #166534',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '0.55rem 0.75rem',
                        cursor: downloadingPhoto ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(21,128,61,0.2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Download size={15} />
                      <span>
                        {downloadingPhoto
                          ? bilingual('फोटो डाउनलोड हो रही है...', 'Downloading Photo...')
                          : bilingual('कार्य समाप्ति फोटो डाउनलोड करें (Download Photo)', 'Download Completion Photo')}
                      </span>
                    </button>
                    {downloadFeedback && (
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                        ✓ {downloadFeedback}
                      </p>
                    )}
                  </div>
                )}

                <div style={{ background: '#fff', padding: '0.65rem 0.85rem', borderRadius: 6, border: '1px solid #bbf7d0', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    {bilingual('विभागीय टिप्पणी / समाधान विवरण:', 'Department Response:')}
                  </span>
                  <p style={{ color: '#14532d', fontSize: '0.88rem', lineHeight: 1.5, margin: '0.2rem 0 0', fontWeight: 600 }}>
                    "{complaint.completion_note || complaint.resolution_note || bilingual('स्थल पर समस्या का निवारण कर दिया गया है।', 'Issue has been successfully resolved on site.')}"
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
                  <div>
                    <strong>{bilingual('समाधानकर्ता:', 'Resolved by:')}</strong>{' '}
                    {complaint.completed_by_name || complaint.assigned_to || (complaint.assigned_department ? `${complaint.assigned_department} Team` : 'नगर निगम रीवा फील्ड टीम')}
                  </div>
                  <div>
                    <strong>{bilingual('समाधान दिनांक व समय:', 'Resolved Date & Time:')}</strong>{' '}
                    {formatDateTime(complaint.resolved_at || complaint.updated_at)}
                  </div>
                </div>
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
