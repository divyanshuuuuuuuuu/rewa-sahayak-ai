import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic, Camera, Droplets, Trash2, MapPin, ArrowRight, ChevronRight, Eye,
  MessageSquare, ShieldCheck, PhoneCall, Search, Sparkles
} from 'lucide-react';
import { getStats } from '../services/store';
import { useGov } from '../context/GovContext';

export default function Home() {
  const stats = getStats();
  const navigate = useNavigate();
  const { bilingual } = useGov();
  const [searchTicket, setSearchTicket] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicket.trim()) {
      navigate(`/complaints?search=${encodeURIComponent(searchTicket.trim())}`);
    }
  };

  return (
    <div className="fade-in">
      {/* ══════════════════════════════════════════════════════════════
          1. CIVIC PORTAL HERO
         ══════════════════════════════════════════════════════════════ */}
      <section className="hero">
        <div className="container hero-content">
          
          {/* Government Badge */}
          <div className="hero-badge">
            <ShieldCheck size={16} color="#0369a1" />
            <span>
              {bilingual(
                'मध्य प्रदेश शासन • नगर पालिक निगम रीवा आधिकारिक पोर्टल',
                'Govt. of Madhya Pradesh • Rewa Municipal Corporation Portal'
              )}
            </span>
          </div>

          <h1>
            {bilingual('रीवा सहायक', 'REWA SAHAYAK')}{' '}
            <span>{bilingual('AI जन-सेवा', 'AI CIVIC TECH')}</span>
          </h1>

          <p className="tagline">
            {bilingual(
              '"समस्या बताइए, AI तुरंत समाधान तक पहुंचाएगा"',
              '"Report your civic issue. AI routes it to the right department."'
            )}
          </p>

          <p className="subtitle">
            {bilingual(
              'कचरा, पेयजल लीकेज, स्ट्रीट लाइट, गड्ढा या जलभराव — बिना किसी कठिन फॉर्म के, केवल बोलकर, फोटो खींचकर या लिखकर बताएं। रीवा नगर निगम द्वारा त्वरित निवारण।',
              'Effortlessly report garbage, leaking pipes, dark streetlights, and road potholes using voice, photo, or text. AI categorizes and dispatches to Rewa Municipal Corporation.'
            )}
          </p>

          {/* Quick Ticket Tracking Bar */}
          <div style={{ maxWidth: '540px', margin: '0 auto 2rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.4rem', borderRadius: '10px', border: '2px solid #0b3a6d', boxShadow: '0 4px 12px rgba(11,58,109,0.1)' }}>
              <input
                type="text"
                placeholder={bilingual(
                  'शिकायत क्रमांक दर्ज करें (उदा. REWA-2026-000001)',
                  'Enter ticket number (e.g. REWA-2026-000001)'
                )}
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                style={{ flex: 1, border: 'none', padding: '0.6rem 0.9rem', fontSize: '0.9rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.6rem 1.25rem' }}>
                <Search size={15} />
                <span>{bilingual('स्थिति देखें', 'Track Status')}</span>
              </button>
            </form>
          </div>

          {/* Call to Actions */}
          <div className="hero-actions">
            <Link to="/report" className="btn btn-primary btn-lg" style={{ background: '#e65100', borderColor: '#c2410c' }}>
              <Sparkles size={18} />
              <span>{bilingual('1-टैप में शिकायत दर्ज करें', 'Lodge Complaint (1-Tap)')}</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/complaints" className="btn btn-secondary btn-lg">
              <Eye size={18} />
              <span>{bilingual('सभी जन-शिकायतें देखें', 'View Public Grievances')}</span>
            </Link>
          </div>

          {/* Official 5-Step Resolution Workflow */}
          <div className="hero-visual">
            <div className="hero-step">
              <span className="hero-step-icon">👤</span>
              <span className="hero-step-label">{bilingual('1. नागरिक रिपोर्ट', '1. Citizen Input')}</span>
            </div>
            <span className="hero-arrow"><ChevronRight /></span>
            <div className="hero-step">
              <span className="hero-step-icon">🤖</span>
              <span className="hero-step-label">{bilingual('2. AI ऑटो वर्गीकरण', '2. AI Auto Routing')}</span>
            </div>
            <span className="hero-arrow"><ChevronRight /></span>
            <div className="hero-step">
              <span className="hero-step-icon">📋</span>
              <span className="hero-step-label">{bilingual('3. आधिकारिक पावती', '3. E-Receipt Issued')}</span>
            </div>
            <span className="hero-arrow"><ChevronRight /></span>
            <div className="hero-step">
              <span className="hero-step-icon">🏛️</span>
              <span className="hero-step-label">{bilingual('4. नगर निगम कार्रवाई', '4. Field Dispatch')}</span>
            </div>
            <span className="hero-arrow"><ChevronRight /></span>
            <div className="hero-step" style={{ border: '2px solid #15803d' }}>
              <span className="hero-step-icon">✅</span>
              <span className="hero-step-label" style={{ color: '#15803d' }}>
                {bilingual('5. 48 घंटे में समाधान', '5. 48hr Resolution')}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2. OFFICIAL CIVIC COUNTERS (TRANSPARENCY BAR)
         ══════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '1.5rem 0' }}>
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#0b3a6d' }}>{stats.total}</div>
              <div className="stat-label">{bilingual('कुल प्राप्त शिकायतें', 'Total Grievances')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#15803d' }}>{stats.resolved + stats.closed}</div>
              <div className="stat-label">{bilingual('सफलतापूर्वक निराकृत', 'Resolved')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#d97706' }}>
                {stats.in_progress + stats.assigned + stats.submitted + stats.under_review}
              </div>
              <div className="stat-label">{bilingual('प्रक्रियाधीन / सक्रिय', 'In Action')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#0284c7' }}>
                {Math.round(((stats.resolved + stats.closed) / (stats.total || 1)) * 100)}%
              </div>
              <div className="stat-label">{bilingual('नागरिक संतुष्टि दर', 'Satisfaction Rate')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          3. EFFORTLESS REPORTING SHORTCUTS
         ══════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#f8fafc', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>
              ⚡ {bilingual('नागरिकों की सुविधा हेतु', 'Citizen Convenience')}
            </span>
            <h2 className="section-title">
              {bilingual('कम से कम प्रयास में समस्या बताएं', 'Report With Least Effort')}
            </h2>
            <p className="section-subtitle">
              {bilingual(
                'मोबाइल पर एक क्लिक में बोलकर बताएं या कैमरे से फोटो खींचकर भेजें — AI सब संभाल लेगा।',
                'Zero paperwork. Speak in your language, take a photo, or choose from common civic issues.'
              )}
            </p>
          </div>

          <div className="features-grid">
            {/* Voice Reporting Card */}
            <div className="feature-card" style={{ borderTop: '4px solid #0b3a6d' }}>
              <div className="feature-icon" style={{ background: '#eef4fb' }}>
                <Mic size={26} color="#0b3a6d" />
              </div>
              <h3>{bilingual('बोलकर बताएं (Voice Reporting)', 'Voice-Based Reporting')}</h3>
              <p>
                {bilingual(
                  'टाइप करने की आवश्यकता नहीं। माइक पर दबाकर अपनी भाषा (हिंदी/बघेली) में बोलें। AI अपने आप शिकायत तैयार कर देगा।',
                  'No typing needed. Just tap the mic and speak in Hindi or English. AI transcribes and structures your complaint automatically.'
                )}
              </p>
              <Link to="/report" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', width: '100%' }}>
                <span>{bilingual('माइक से बताएं →', 'Use Voice Input →')}</span>
              </Link>
            </div>

            {/* Photo Reporting Card */}
            <div className="feature-card" style={{ borderTop: '4px solid #15803d' }}>
              <div className="feature-icon" style={{ background: '#dcfce7' }}>
                <Camera size={26} color="#15803d" />
              </div>
              <h3>{bilingual('फोटो खींचें (Camera Upload)', 'Photo Evidence Reporting')}</h3>
              <p>
                {bilingual(
                  'कचरा, टूटी पाइपलाइन या सड़क के गड्ढे की लाइव फोटो खींचें। AI कंप्यूटर विज़न कचरे की मात्रा व प्रकार का विश्लेषण करेगा।',
                  'Capture evidence with your phone camera. AI computer vision analyzes the image, detects the issue, and assesses severity.'
                )}
              </p>
              <Link to="/report" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', width: '100%' }}>
                <span>{bilingual('कैमरा खोलें →', 'Open Camera →')}</span>
              </Link>
            </div>

            {/* Auto GPS Location */}
            <div className="feature-card" style={{ borderTop: '4px solid #e65100' }}>
              <div className="feature-icon" style={{ background: '#ffedd5' }}>
                <MapPin size={26} color="#e65100" />
              </div>
              <h3>{bilingual('ऑटो GPS वार्ड पहचान', 'Auto GPS Location')}</h3>
              <p>
                {bilingual(
                  'पता लिखने की जरूरत नहीं। एक टैप में आपकी वर्तमान लोकेशन से रीवा का वार्ड नंबर और जोनल अधिकारी अपने आप जुड़ जाते हैं।',
                  'No typing addresses. One tap uses GPS coordinates to connect to the correct Rewa ward and designated zonal officer.'
                )}
              </p>
              <Link to="/map" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', width: '100%' }}>
                <span>{bilingual('रीवा लाइव मैप देखें →', 'View City Map →')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. OFFICIAL DEPARTMENTAL MODULES
         ══════════════════════════════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>
              🏛️ {bilingual('नगर निगम रीवा अनुभाग', 'Nagar Nigam Divisions')}
            </span>
            <h2 className="section-title">
              {bilingual('प्रमुख जन-सेवा प्रभाग', 'Key Municipal Divisions')}
            </h2>
            <p className="section-subtitle">
              {bilingual(
                'प्रत्येक विभाग के लिए विशेष AI मॉडल जो शिकायतों को सीधे संबंधित कार्यपालन यंत्री तक पहुंचाते हैं।',
                'Specialized AI pipelines routing grievances directly to designated executive engineers.'
              )}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Smart Waste */}
            <div className="card" style={{ borderLeft: '5px solid #15803d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '8px' }}>
                  <Trash2 size={24} color="#15803d" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.2rem', margin: 0 }}>
                    {bilingual('स्मार्ट वेस्ट (कचरा प्रबंधन)', 'Smart Waste Management')}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                    {bilingual('स्वच्छ भारत मिशन (शहरी)', 'Swachh Bharat Mission (Urban)')}
                  </span>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {bilingual(
                  'डोर-टू-डोर कचरा गाड़ी, सार्वजनिक स्थलों पर अवैध कचरा डंपिंग, भरे हुए डस्टबिन, मृत पशु निस्तारण एवं कीटनाशक छिड़काव।',
                  'Door-to-door garbage collection, illegal dumping, overflowing bins, and public sanitation.'
                )}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: '#15803d' }}>
                  {stats.by_module['smart_waste'] || 0} {bilingual('शिकायतें दर्ज', 'reports registered')}
                </span>
                <Link to="/complaints?module=smart_waste" style={{ fontWeight: 700, color: '#0b3a6d' }}>
                  {bilingual('विवरण देखें →', 'View Module →')}
                </Link>
              </div>
            </div>

            {/* JalRakshak */}
            <div className="card" style={{ borderLeft: '5px solid #0284c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: '#e0f2fe', borderRadius: '8px' }}>
                  <Droplets size={24} color="#0284c7" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.2rem', margin: 0 }}>
                    {bilingual('जल रक्षक (पेयजल व सीवरेज)', 'JalRakshak (Water & Drainage)')}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>
                    {bilingual('जल जीवन मिशन व अमृत योजना', 'Jal Jeevan Mission & AMRUT')}
                  </span>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {bilingual(
                  'पेयजल पाइपलाइन लीकेज, गंदे पानी की आपूर्ति, सीवर एवं नालियों का अवरोध, भारी वर्षा में जलभराव एवं हैंडपंप सुधार।',
                  'Pipeline bursts, contaminated water, blocked sewers, rainwater logging, and drainage issues.'
                )}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>
                  {stats.by_module['jalrakshak'] || 0} {bilingual('शिकायतें दर्ज', 'reports registered')}
                </span>
                <Link to="/complaints?module=jalrakshak" style={{ fontWeight: 700, color: '#0b3a6d' }}>
                  {bilingual('विवरण देखें →', 'View Module →')}
                </Link>
              </div>
            </div>

            {/* Rewa Sahayak PWD */}
            <div className="card" style={{ borderLeft: '5px solid #e65100' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: '#ffedd5', borderRadius: '8px' }}>
                  <MessageSquare size={24} color="#e65100" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.2rem', margin: 0 }}>
                    {bilingual('रीवा सहायक (मार्ग व प्रकाश)', 'Rewa Sahayak (Roads & Lights)')}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: 700 }}>
                    {bilingual('स्मार्ट सिटी इंफ्रास्ट्रक्चर', 'Smart City Infrastructure')}
                  </span>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {bilingual(
                  'सड़क के खतरनाक गड्ढे, टूटी फुटपाथ, बंद स्ट्रीट लाइट, लटके हुए बिजली के तार, खुले मैनहोल एवं पार्क रखरखाव।',
                  'Road potholes, broken footpaths, faulty streetlights, dangling cables, and open manholes.'
                )}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: '#e65100' }}>
                  {stats.by_module['rewa_sahayak'] || 0} {bilingual('शिकायतें दर्ज', 'reports registered')}
                </span>
                <Link to="/complaints?module=rewa_sahayak" style={{ fontWeight: 700, color: '#0b3a6d' }}>
                  {bilingual('विवरण देखें →', 'View Module →')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          5. EMERGENCY SPEED DIAL BANNER
         ══════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#0b3a6d', color: '#ffffff', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ background: '#e65100', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                {bilingual('24x7 नागरिक सहायता', '24x7 Citizen Helpline')}
              </span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                {bilingual('सीधे आपातकालीन हेल्पलाइन पर संपर्क करें', 'Emergency Civic Helplines')}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                {bilingual(
                  'गंभीर जलभराव या खुले सीवर की स्थिति में तुरंत कॉल करें।',
                  'In case of severe waterlogging, open manholes or public hazard, dial directly.'
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href="tel:181" className="btn btn-lg" style={{ background: '#ffffff', color: '#0b3a6d' }}>
                <PhoneCall size={18} color="#dc2626" />
                <span>{bilingual('181 (CM हेल्पलाइन)', '181 (CM Helpline)')}</span>
              </a>
              <a href="tel:07662252525" className="btn btn-lg" style={{ background: '#e65100', color: '#ffffff' }}>
                <PhoneCall size={18} />
                <span>{bilingual('07662-252525 (रीवा निगम)', '07662-252525 (Rewa Municipal)')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
