import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock, Film, Video, Camera, Upload, CheckCircle2, Eye, EyeOff, MessageSquare, Download, Share2, PhoneCall, HardHat, RotateCcw } from 'lucide-react';
import { getComplaintById, updateComplaintStatus, assignComplaint, reopenComplaint, updateComplaintPriority, syncFromSupabase } from '../../services/store';
import { uploadReportImage, getImageUrl } from '../../services/supabaseStore';
import {
  getDepartmentWorkers,
  formatAssignmentWhatsAppMessage,
  createWhatsAppDeepLink,
  logAssignmentNotification,
  getNotificationsForComplaint,
  downloadComplaintPhoto,
  type DepartmentWorker,
  type NotificationRecord,
} from '../../services/whatsappService';
import { supabase } from '../../services/supabase';
import { statusColors, severityColors, moduleColors, categoryIcons } from '../../services/ai';
import { demoDepartments } from '../../data/demoData';
import MapView from '../../components/MapView';
import type { ComplaintStatus, Severity } from '../../types';
import { useGov } from '../../context/GovContext';

export default function AdminComplaintDetail() {
  const { id } = useParams();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [complaint, setComplaint] = useState(id ? getComplaintById(id) : undefined);
  const [loading, setLoading] = useState(!complaint);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [workerInstructions, setWorkerInstructions] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [newPriority, setNewPriority] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const completionFileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp & Worker Notification States
  const [workers, setWorkers] = useState<DepartmentWorker[]>([]);
  const [selectedWorkerPhone, setSelectedWorkerPhone] = useState('');
  const [selectedWorkerName, setSelectedWorkerName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const loadData = async () => {
      let current = getComplaintById(id);
      if (!current) {
        await syncFromSupabase();
        current = getComplaintById(id);
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

  const handleCompletionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !complaint) return;
    setUploadingImage(true);
    try {
      const { path, error } = await uploadReportImage(file, 'completion-images');
      if (error) {
        alert('Image upload failed: ' + error);
        return;
      }
      if (path) {
        const fullUrl = getImageUrl(path, 'completion-images');
        await supabase
          .from('citizen_reports')
          .update({
            completion_image_path: path,
            current_status: 'RESOLVED',
            resolved_at: new Date().toISOString(),
            resolution_note: 'Resolution verified with on-site completion photograph.',
          })
          .eq('id', complaint.id);

        await supabase.from('report_status_history').insert({
          report_id: complaint.id,
          previous_status: complaint.status,
          new_status: 'RESOLVED',
          public_message: 'Problem resolved. Completion photo attached by Field Inspector.',
          changed_by_name: 'Admin Officer',
        });

        // Update local complaint
        const updated = updateComplaintStatus(
          complaint.id,
          'RESOLVED',
          'Resolved with verified completion photograph.',
          'Admin Officer'
        );
        if (updated) {
          updated.video_url = fullUrl;
          setComplaint({ ...updated });
        }
      }
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#0b3a6d' }}>{bilingual('शिकायत लोड हो रही है...', 'Loading complaint...')}</p>
        </div>
      </div>
    );
  }

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

  useEffect(() => {
    const dept = assignDept || complaint?.assigned_department;
    getDepartmentWorkers(dept).then(w => {
      setWorkers(w);
      if (w.length > 0) {
        const match = w.find(item => item.name === (assignTo || complaint?.assigned_to));
        if (match) {
          setSelectedWorkerPhone(match.whatsapp_phone);
          setSelectedWorkerName(match.name);
        } else {
          setSelectedWorkerPhone(w[0].whatsapp_phone);
          setSelectedWorkerName(w[0].name);
        }
      }
    });
  }, [assignDept, complaint?.assigned_department, assignTo, complaint?.assigned_to]);

  useEffect(() => {
    if (complaint?.id) {
      getNotificationsForComplaint(complaint.id).then(setNotifications);
    }
  }, [complaint?.id]);

  const handleSendWhatsApp = async () => {
    if (!complaint) return;
    const phoneToUse = customPhone.trim() || selectedWorkerPhone;
    if (!phoneToUse) {
      alert(bilingual('कृपया कर्मी या मोबाइल नंबर चुनें।', 'Please select a worker or enter a phone number.'));
      return;
    }
    const workerName = selectedWorkerName || customPhone || 'Field Officer';
    const message = formatAssignmentWhatsAppMessage(
      complaint,
      { name: workerName, phone: phoneToUse },
      'Rewa Municipal Control Center'
    );
    const waLink = createWhatsAppDeepLink(phoneToUse, message);

    setSendingWhatsApp(true);
    try {
      await logAssignmentNotification(
        complaint.id,
        workerName,
        phoneToUse,
        complaint.assigned_department || assignDept || 'Rewa Municipal Corporation',
        message,
        'Admin Officer'
      );
      const updated = await getNotificationsForComplaint(complaint.id);
      setNotifications(updated);
      window.open(waLink, '_blank');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleDownloadPhoto = async () => {
    if (!complaint?.image_url) return;
    await downloadComplaintPhoto(complaint.image_url, complaint.ticket_number);
  };

  const handleAssign = () => {
    if (!assignDept) return;
    const targetWorker = assignTo || selectedWorkerName || (workers[0] ? workers[0].name : '');
    const matchedWorker = workers.find(w => w.name === targetWorker);
    const workerUserId = matchedWorker?.user_id || undefined;

    const updated = assignComplaint(
      complaint.id,
      assignDept,
      targetWorker,
      workerInstructions.trim() || undefined,
      workerUserId
    );
    if (updated) {
      setComplaint({ ...updated });
      setAssignDept('');
      setAssignTo('');
      setWorkerInstructions('');
    }
  };

  const handleReopen = () => {
    if (!reopenReason.trim() || !complaint) return;
    setReopening(true);
    try {
      const updated = reopenComplaint(complaint.id, reopenReason.trim(), 'Admin Officer');
      if (updated) {
        setComplaint({ ...updated });
        setReopenReason('');
      }
    } finally {
      setReopening(false);
    }
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

            {/* Field Worker Execution & Progress */}
            {(complaint.assigned_to || complaint.work_started_at || complaint.worker_instructions) && (
              <div className="card" style={{
                marginBottom: '1.25rem',
                borderLeft: '4px solid ' + (complaint.status === 'RESOLVED' ? '#15803d' : complaint.work_started_at ? '#7e22ce' : '#d97706'),
                background: complaint.status === 'RESOLVED' ? '#f0fdf4' : complaint.work_started_at ? '#faf5ff' : '#fffbeb'
              }}>
                <h3 className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0b3a6d' }}>
                  <HardHat size={16} />
                  <span>{bilingual('विभागीय फील्ड कर्मी कार्य प्रगति', 'Field Worker Execution & Progress')}</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('प्रभारी कर्मी:', 'Assigned Worker:')}</span>
                    <p style={{ fontWeight: 700, margin: '0.2rem 0' }}>{complaint.assigned_to || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{bilingual('कार्य स्थिति:', 'Work Status:')}</span>
                    <p style={{ margin: '0.2rem 0' }}>
                      {complaint.status === 'RESOLVED' ? (
                        <span style={{ color: '#15803d', fontWeight: 800 }}>✓ {bilingual('कार्य पूर्ण एवं सत्यापित', 'Work Completed & Resolved')}</span>
                      ) : complaint.work_started_at ? (
                        <span style={{ color: '#7e22ce', fontWeight: 800 }}>⚙️ {bilingual('स्थल पर कार्य प्रगति पर है', 'Work In Progress')} ({formatDateTime(complaint.work_started_at)})</span>
                      ) : (
                        <span style={{ color: '#d97706', fontWeight: 700 }}>⏳ {bilingual('कर्मी द्वारा कार्य प्रारंभ की प्रतीक्षा', 'Awaiting Worker to Start')}</span>
                      )}
                    </p>
                  </div>
                </div>
                {complaint.worker_instructions && (
                  <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.85)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                      {bilingual('एडमिन द्वारा दिए गए निर्देश:', 'Admin Instructions to Worker:')}
                    </span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#1e293b' }}>{complaint.worker_instructions}</p>
                  </div>
                )}
              </div>
            )}

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
            {/* Completion Photo (Before vs After Evidence) */}
            <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4' }}>
              <h3 className="detail-section-title" style={{ color: '#166534' }}>
                📸 {bilingual('समाधान साक्ष्य (Completion Proof)', 'Completion Proof')}
              </h3>
              {complaint.video_url ? (
                <div>
                  <img
                    src={complaint.video_url}
                    alt="Resolved Proof"
                    style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover', marginBottom: '0.5rem', border: '2px solid #22c55e' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginBottom: '0.4rem' }}>
                    ✓ {bilingual('स्थल समाधान फोटो सत्यापित', 'On-Site Completion Photo Verified')}
                  </div>
                  {complaint.completed_by_name && (
                    <div style={{ fontSize: '0.78rem', color: '#334155', marginBottom: '0.2rem' }}>
                      <strong>{bilingual('समाधानकर्ता कर्मी:', 'Resolved By Worker:')}</strong> {complaint.completed_by_name}
                    </div>
                  )}
                  {complaint.resolved_at && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      <strong>{bilingual('समाधान समय:', 'Resolved At:')}</strong> {formatDateTime(complaint.resolved_at)}
                    </div>
                  )}
                  {(complaint.completion_note || complaint.resolution_note) && (
                    <div style={{ background: '#dcfce7', padding: '0.4rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', color: '#166534', marginTop: '0.4rem' }}>
                      <strong>{bilingual('कर्मी की रिपोर्ट:', 'Worker Note:')}</strong> {complaint.completion_note || complaint.resolution_note}
                    </div>
                  )}

                  {/* Reopen Complaint Section */}
                  {complaint.status === 'RESOLVED' && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #86efac' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                        <RotateCcw size={14} />
                        {bilingual('शिकायत पुनः खोलें (Reopen Complaint):', 'Reopen Complaint (Requires Reason):')}
                      </label>
                      <textarea
                        className="form-input"
                        placeholder={bilingual('पुनः खोलने का कारण दर्ज करें...', 'Enter mandatory reason for reopening...')}
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        style={{ minHeight: '55px', marginBottom: '0.4rem', fontSize: '0.82rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', background: '#dc2626', color: '#fff' }}
                        onClick={handleReopen}
                        disabled={!reopenReason.trim() || reopening}
                      >
                        <RotateCcw size={14} />
                        {reopening ? bilingual('पुनः खोला जा रहा है...', 'Reopening...') : bilingual('शिकायत पुनः खोलें', 'Reopen Complaint')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#166534', marginBottom: '0.5rem' }}>
                    {bilingual('स्थल पर कार्य पूर्ण होने की वास्तविक फोटो अपलोड करें:', 'Upload on-site proof of completed repair work:')}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={completionFileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleCompletionUpload}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', background: '#16a34a', color: '#fff' }}
                    onClick={() => completionFileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload size={14} />
                    {uploadingImage ? bilingual('अपलोड हो रहा है...', 'Uploading to Supabase...') : bilingual('समाधान फोटो अपलोड करें', 'Upload Completion Photo')}
                  </button>
                </div>
              )}
            </div>

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
              <h3 className="detail-section-title">{bilingual('विभाग एवं फील्ड कर्मी आवंटन', 'Assign Department & Worker')}</h3>
              <select
                className="form-input"
                value={assignDept}
                onChange={(e) => {
                  setAssignDept(e.target.value);
                  setAssignTo('');
                }}
                style={{ marginBottom: '0.5rem' }}
              >
                <option value="">{bilingual('विभाग चुनें...', 'Select department...')}</option>
                {demoDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>

              {/* Registered Workers dropdown for chosen department */}
              {workers.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    {bilingual('पंजीकृत विभागीय कर्मी:', 'Registered Department Worker:')}
                  </label>
                  <select
                    className="form-input"
                    value={assignTo}
                    onChange={(e) => {
                      setAssignTo(e.target.value);
                      const matched = workers.find(w => w.name === e.target.value);
                      if (matched) {
                        setSelectedWorkerPhone(matched.whatsapp_phone);
                        setSelectedWorkerName(matched.name);
                      }
                    }}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <option value="">{bilingual('विभागीय कर्मी चुनें...', 'Select Worker...')}</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.name}>
                        {w.name} ({w.designation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                className="form-input"
                placeholder={bilingual('या अन्य नाम दर्ज करें (ऐच्छिक)', 'Or custom person name (optional)')}
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />

              {/* Instructions to worker */}
              <textarea
                className="form-input"
                placeholder={bilingual('फील्ड कर्मी के लिए निर्देश / कार्य आदेश (Instructions for Worker)...', 'Instructions for field worker (optional)...')}
                value={workerInstructions}
                onChange={(e) => setWorkerInstructions(e.target.value)}
                style={{ minHeight: '60px', marginBottom: '0.5rem', fontSize: '0.82rem' }}
              />

              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', background: '#0b3a6d', color: '#fff' }} onClick={handleAssign} disabled={!assignDept}>
                {bilingual('आवंटित करें एवं पोर्टल पर भेजें', 'Assign & Dispatch to Worker')}
              </button>
            </div>

            {/* WhatsApp Worker Notification (Admin Only) */}
            <div className="card" style={{ borderColor: '#22c55e', background: '#f0fdf4', boxShadow: '0 2px 8px rgba(34,197,94,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <h3 className="detail-section-title" style={{ color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={16} color="#16a34a" />
                  {bilingual('व्हाट्सएप टास्क अलर्ट (Worker Dispatch)', 'WhatsApp Worker Alert')}
                </h3>
                <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.68rem', fontWeight: 800 }}>
                  ADMIN ONLY
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#166534', marginBottom: '0.65rem' }}>
                {bilingual(
                  'प्रभारी कर्मी को सीधे अपने पर्सनल व्हाट्सएप से संपूर्ण विवरण, लोकेशन व मैप लिंक भेजें:',
                  'Dispatch task order with Google Map link & photos directly from your personal WhatsApp:'
                )}
              </p>

              {/* Recipient Worker & WhatsApp No */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '0.2rem' }}>
                  {bilingual('प्राप्तकर्ता कर्मी / फोन', 'Recipient Worker & WhatsApp No.')}
                </label>
                <select
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}
                  value={selectedWorkerPhone}
                  onChange={(e) => {
                    setSelectedWorkerPhone(e.target.value);
                    const matched = workers.find(w => w.whatsapp_phone === e.target.value);
                    if (matched) setSelectedWorkerName(matched.name);
                  }}
                >
                  <option value="">{bilingual('कर्मी चुनें...', 'Select Worker...')}</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.whatsapp_phone}>
                      {w.name} ({w.designation}) — {w.whatsapp_phone}
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                  placeholder={bilingual('या अन्य मोबाइल नंबर (उदा. 9826123456)', 'Or custom phone number (e.g. 9826123456)')}
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
              </div>

              {/* Action Buttons: WhatsApp & Download Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{
                    background: '#16a34a',
                    borderColor: '#15803d',
                    color: '#ffffff',
                    width: '100%',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                  onClick={handleSendWhatsApp}
                  disabled={sendingWhatsApp}
                >
                  <MessageSquare size={14} />
                  {sendingWhatsApp ? bilingual('खुल रहा है...', 'Opening WhatsApp...') : bilingual('📲 व्हाट्सएप पर कार्य आदेश भेजें', 'Send via Personal WhatsApp')}
                </button>

                {complaint.image_url && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleDownloadPhoto}
                  >
                    <Download size={14} />
                    {bilingual('📥 साक्ष्य फोटो डाउनलोड करें', 'Download Evidence Photo')}
                  </button>
                )}
              </div>

              {/* Notification History Logs */}
              {notifications.length > 0 && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem' }}>
                    ✓ {bilingual('व्हाट्सएप अलर्ट इतिहास (Supabase Log):', 'WhatsApp Dispatch History (Supabase Log):')}
                  </div>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: 4, border: '1px solid #dcfce7', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                          <span>{n.recipient_name}</span>
                          <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.65rem' }}>
                          {n.recipient_phone} • {n.sent_by_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
