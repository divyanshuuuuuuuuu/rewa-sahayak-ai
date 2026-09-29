import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, Home, PlusCircle, FileText, Map, PhoneCall, Globe, Building2 } from 'lucide-react';
import { AshokaEmblem, RewaMunicipalLogo, SwachhBharatLogo } from './Emblem';
import { useGov } from '../context/GovContext';

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { lang, toggleLang, fontSize, setFontSize, bilingual } = useGov();

  const isActive = (path: string) => (location.pathname === path ? 'nav-link active' : 'nav-link');
  const isBottomActive = (path: string) =>
    location.pathname === path ? 'mobile-bottom-item active' : 'mobile-bottom-item';

  return (
    <>
      {/* 1. Indian National Flag Tricolor Accent Ribbon */}
      <div className="gov-tricolor-ribbon" role="presentation">
        <div className="gov-tricolor-saffron" />
        <div className="gov-tricolor-white" />
        <div className="gov-tricolor-green" />
      </div>

      {/* 2. Top Administrative Utility Strip */}
      <div className="gov-top-bar">
        <div className="container">
          <div className="gov-top-left">
            <span className="gov-state-name">
              🏛️ {bilingual('मध्य प्रदेश शासन', 'Government of Madhya Pradesh')}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>
              {bilingual('जिला प्रशासन रीवा', 'District Administration Rewa')}
            </span>
            <a href="tel:181" className="gov-helpline-pill" title="CM Helpline 181">
              <PhoneCall size={12} />
              <span>{bilingual('CM हेल्पलाइन: 181', 'CM Helpline: 181')}</span>
            </a>
          </div>

          <div className="gov-top-right">
            {/* Accessibility Font Size Controls */}
            <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginRight: '3px' }}>A:</span>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('normal')}
                title="Standard Font Size"
                style={{ fontWeight: fontSize === 'normal' ? '800' : '500' }}
              >
                A-
              </button>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('large')}
                title="Larger Font Size"
                style={{ fontWeight: fontSize === 'large' ? '800' : '500' }}
              >
                A
              </button>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('larger')}
                title="Maximum Font Size"
                style={{ fontWeight: fontSize === 'larger' ? '800' : '500' }}
              >
                A+
              </button>
            </div>

            {/* Language Switch Button with Clear Feedback */}
            <button
              type="button"
              className="gov-lang-btn"
              onClick={toggleLang}
              aria-label="Toggle Language between Hindi and English"
              title={bilingual('Click to switch full site to English', 'पूरी वेबसाइट को हिंदी में बदलें')}
            >
              <Globe size={13} />
              <span>{bilingual('English (EN)', 'हिन्दी (HI)')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Official Municipal Corporation Main Header */}
      <header className="gov-main-header">
        <div className="container">
          <div className="gov-header-flex">
            <Link to="/" className="gov-brand-combo" style={{ textDecoration: 'none' }}>
              <AshokaEmblem size={52} />
              <RewaMunicipalLogo size={52} />
              <div className="gov-brand-titles">
                <span className="gov-brand-title-hi">
                  {bilingual('नगर पालिक निगम, रीवा', 'Rewa Municipal Corporation')}
                </span>
                <span className="gov-brand-title-en">
                  {bilingual('REWA SAHAYAK AI • SMART CIVIC PORTAL', 'REWA SAHAYAK AI • CIVIC GRIEVANCE REDRESSAL')}
                </span>
                <span className="gov-brand-tagline">
                  {bilingual(
                    'स्वच्छ रीवा, सुंदर रीवा • "समस्या बताइए, AI समाधान तक पहुंचाएगा"',
                    'Clean Rewa, Smart Rewa • "Report issue, AI drives the solution"'
                  )}
                </span>
              </div>
            </Link>

            {/* National Initiatives Badges (Desktop) */}
            <div className="gov-partner-badges">
              <div className="gov-badge-box">
                <SwachhBharatLogo size={42} />
                <span className="gov-badge-label">
                  {bilingual('स्वच्छ भारत (शहरी)', 'Swachh Bharat (Urban)')}
                </span>
              </div>
              <div className="gov-badge-box" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0b3a6d' }}>🇮🇳 Digital India</span>
                <span className="gov-badge-label" style={{ color: '#e65100' }}>
                  {bilingual('ई-गवर्नेंस पहल', 'E-Governance Initiative')}
                </span>
              </div>
              <div className="gov-badge-box" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#15803d' }}>Smart City</span>
                <span className="gov-badge-label" style={{ color: '#0b3a6d' }}>
                  {bilingual('रीवा मिशन 2030', 'Rewa Mission 2030')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 4. Live Official Notice Marquee */}
      <div className="gov-notice-marquee" role="marquee">
        <div className="container" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="gov-notice-label">
            📢 {bilingual('महत्वपूर्ण सूचना', 'Official Notice')}
          </span>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <span className="gov-marquee-content">
              {bilingual(
                'स्वच्छता सर्वेक्षण 2026: रीवा को नंबर 1 स्वच्छ शहर बनाएं | कचरा, पेयजल लीकेज, स्ट्रीट लाइट या सड़क गड्ढे की शिकायत 1-टैप में फोटो या बोलकर दर्ज करें | 24x7 कंट्रोल रूम: 07662-252525 | CM हेल्पलाइन: 181',
                'Swachh Survekshan 2026: Help make Rewa the #1 clean city | Report waste, pipe leaks, dark streetlights or potholes with 1 tap via photo or voice | 24x7 Control Room: 07662-252525 | CM Helpline: 181'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Desktop Navigation Bar */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className="nav-links">
            {!isAdmin ? (
              <>
                <Link to="/" className={isActive('/')}>
                  <Home size={15} />
                  <span>{bilingual('मुख्य पृष्ठ', 'Home')}</span>
                </Link>
                <Link to="/report" className={isActive('/report')} style={{ color: '#ffedd5', fontWeight: 800 }}>
                  <PlusCircle size={15} color="#fb923c" />
                  <span>{bilingual('शिकायत दर्ज करें (AI)', 'Lodge Complaint (AI)')}</span>
                </Link>
                <Link to="/complaints" className={isActive('/complaints')}>
                  <FileText size={15} />
                  <span>{bilingual('शिकायतें एवं स्थिति', 'Track Complaints')}</span>
                </Link>
                <Link to="/map" className={isActive('/map')}>
                  <Map size={15} />
                  <span>{bilingual('रीवा लाइव मैप', 'City Ward Map')}</span>
                </Link>
                <Link to="/about" className={isActive('/about')}>
                  <Building2 size={15} />
                  <span>{bilingual('पोर्टल परिचय', 'About Portal')}</span>
                </Link>
                <Link to="/admin" className="nav-link" style={{ marginLeft: '1rem', background: 'rgba(255,255,255,0.08)' }}>
                  <Shield size={14} style={{ color: '#fcd34d' }} />
                  <span>{bilingual('प्रशासनिक लॉगिन', 'Admin Portal')}</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/admin" className={isActive('/admin')}>
                  <Shield size={15} />
                  <span>{bilingual('प्रशासन डैशबोर्ड', 'Dashboard')}</span>
                </Link>
                <Link to="/admin/complaints" className={isActive('/admin/complaints')}>
                  <FileText size={15} />
                  <span>{bilingual('शिकायत प्रबंधन', 'Complaints Manager')}</span>
                </Link>
                <Link to="/admin/map" className={isActive('/admin/map')}>
                  <Map size={15} />
                  <span>{bilingual('वार्ड मैप', 'Ward Map')}</span>
                </Link>
                <Link to="/admin/analytics" className={isActive('/admin/analytics')}>
                  <span>{bilingual('एनालिटिक्स एवं रिपोर्ट', 'Analytics & Reports')}</span>
                </Link>
                <Link to="/" className="nav-link" style={{ marginLeft: '1rem', background: 'rgba(255,255,255,0.1)' }}>
                  ← {bilingual('नागरिक पोर्टल', 'Citizen View')}
                </Link>
              </>
            )}
            <span className="nav-demo-badge">
              {bilingual('ई-सेवा 2026', 'E-Services 2026')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#93c5fd' }}>
            <span>📞 181 (Toll Free)</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        <Outlet />
      </main>

      {/* 6. Mobile Bottom App Bar (Always reachable by thumb for minimal effort!) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Dock">
        <Link to="/" className={isBottomActive('/')}>
          <Home size={20} />
          <span>{bilingual('होम', 'Home')}</span>
        </Link>
        <Link to="/complaints" className={isBottomActive('/complaints')}>
          <FileText size={20} />
          <span>{bilingual('स्थिति', 'Track')}</span>
        </Link>
        <Link to="/report" className="mobile-bottom-fab" title={bilingual('1-टैप शिकायत करें', '1-Tap File Complaint')}>
          <PlusCircle size={24} />
          <span>{bilingual('शिकायत', 'Report')}</span>
        </Link>
        <Link to="/map" className={isBottomActive('/map')}>
          <Map size={20} />
          <span>{bilingual('मैप', 'Map')}</span>
        </Link>
        <a href="tel:181" className="mobile-bottom-item" style={{ color: '#dc2626' }}>
          <PhoneCall size={20} />
          <span>{bilingual('181 कॉल', 'Call 181')}</span>
        </a>
      </nav>

      {/* 7. Official NIC-Style Government Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AshokaEmblem size={44} />
              <div>
                <div className="footer-brand">
                  {bilingual('नगर पालिक निगम, रीवा (म.प्र.)', 'Rewa Municipal Corporation (M.P.)')}
                </div>
                <div className="footer-subbrand">
                  {bilingual(
                    'नागरिक सेवा एवं जन-शिकायत निवारण ई-प्रणाली (Rewa Sahayak AI)',
                    'Citizen Service & Civic Redressal E-Platform (Rewa Sahayak AI)'
                  )}
                </div>
              </div>
            </div>

            <div className="footer-links">
              <Link to="/" className="footer-link">{bilingual('मुख्य पृष्ठ', 'Home')}</Link>
              <Link to="/report" className="footer-link">{bilingual('शिकायत दर्ज करें', 'File Complaint')}</Link>
              <Link to="/complaints" className="footer-link">{bilingual('स्थिति देखें', 'Track Status')}</Link>
              <Link to="/map" className="footer-link">{bilingual('वार्ड मैप', 'City Ward Map')}</Link>
              <Link to="/about" className="footer-link">{bilingual('सूचना का अधिकार (RTI)', 'Right to Information (RTI)')}</Link>
              <Link to="/admin" className="footer-link">{bilingual('अधिकारी लॉगिन', 'Officer Login')}</Link>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <p className="footer-text">
              {bilingual(
                'यह पोर्टल नगर पालिक निगम रीवा द्वारा नागरिकों की समस्याओं के त्वरित व पारदर्शी निराकरण हेतु संचालित है।',
                'This portal is maintained by Rewa Municipal Corporation for rapid, transparent citizen grievance redressal.'
              )}
            </p>
            <div className="footer-nic-badge">
              <span>🇮🇳 {bilingual('स्मार्ट सिटी रीवा एवं NIC मानक आधारित', 'Powered by Smart City Mission Rewa & NIC Standards')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.74rem', color: '#64748b' }}>
            <span>
              {bilingual('© 2026 नगर पालिक निगम रीवा | सर्वाधिकार सुरक्षित', '© 2026 Rewa Municipal Corporation | All Rights Reserved')}
            </span>
            <span>
              {bilingual(
                'अंतिम अद्यतन: 27 सितम्बर 2026 | पोर्टल संस्करण: v2.4 (Govt Edition)',
                'Last Updated: 27 September 2026 | Portal Version: v2.4 (Govt Edition)'
              )}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
