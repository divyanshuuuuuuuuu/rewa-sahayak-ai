import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Shield, Home, PlusCircle, FileText, Map, PhoneCall, Globe, Building2,
  HardHat, Menu, X, ChevronRight, BarChart3, Info, Lock, LogOut,
  User as UserIcon, ChevronDown, LogIn
} from 'lucide-react';
import { CivicInsignia, SwachhBharatLogo, CivicPrototypeBadge } from './Emblem';
import { useGov } from '../context/GovContext';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const { lang, toggleLang, fontSize, setFontSize, bilingual } = useGov();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  // Handle outside click to close account dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [accountMenuOpen]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const isActive = (path: string) => (location.pathname === path ? 'nav-link active' : 'nav-link');
  const isBottomActive = (path: string) =>
    location.pathname === path ? 'mobile-bottom-item active' : 'mobile-bottom-item';
  const isAdminSubActive = (path: string) =>
    location.pathname === path
      ? 'admin-sub-item active'
      : 'admin-sub-item';

  return (
    <>
      {/* 0. Accessible Skip Link */}
      <a href="#main-content" className="skip-link">
        {bilingual('मुख्य सामग्री पर सीधे जाएं (Skip to main content)', 'Skip to main content')}
      </a>

      {/* 1. Indian National Flag Tricolor Accent Ribbon */}
      <div className="gov-tricolor-ribbon" role="presentation" aria-hidden="true">
        <div className="gov-tricolor-saffron" />
        <div className="gov-tricolor-white" />
        <div className="gov-tricolor-green" />
      </div>

      {/* 2. Top Administrative Utility Strip */}
      <div className="gov-top-bar" role="region" aria-label="Administrative Bar">
        <div className="container">
          <div className="gov-top-left">
            <span className="gov-state-name">
              🏛️ {bilingual('रीवा सहायक AI • जन-सेवा नवाचार पहल', 'Rewa Sahayak AI • Civic Innovation Initiative')}
            </span>
            <span style={{ color: '#cbd5e1' }} aria-hidden="true">|</span>
            <CivicPrototypeBadge />
            <a
              href="tel:181"
              className="gov-helpline-pill"
              title="CM Helpline 181"
              aria-label="CM Helpline 181 toll free call"
            >
              <PhoneCall size={12} />
              <span>{bilingual('CM हेल्पलाइन: 181', 'CM Helpline: 181')}</span>
            </a>
          </div>

          <div className="gov-top-right">
            {/* Accessibility Font Size Controls */}
            <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }} role="group" aria-label="Text size controls">
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginRight: '3px' }}>A:</span>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('normal')}
                title="Standard Font Size"
                aria-pressed={fontSize === 'normal'}
                style={{ fontWeight: fontSize === 'normal' ? '800' : '500' }}
              >
                A-
              </button>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('large')}
                title="Larger Font Size"
                aria-pressed={fontSize === 'large'}
                style={{ fontWeight: fontSize === 'large' ? '800' : '500' }}
              >
                A
              </button>
              <button
                type="button"
                className="gov-access-btn"
                onClick={() => setFontSize('larger')}
                title="Maximum Font Size"
                aria-pressed={fontSize === 'larger'}
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
              aria-label={`Current language is ${lang === 'hi' ? 'Hindi' : 'English'}. Click to toggle language.`}
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
              <CivicInsignia size={50} />
              <div className="gov-brand-titles">
                <span className="gov-brand-title-hi">
                  {bilingual('नगर पालिक निगम, रीवा', 'Rewa Municipal Corporation')}
                </span>
                <span className="gov-brand-title-en">
                  {bilingual('REWA SAHAYAK AI • CIVIC GRIEVANCE REDRESSAL', 'REWA SAHAYAK AI • CIVIC GRIEVANCE REDRESSAL')}
                </span>
                <span className="gov-brand-tagline">
                  {bilingual(
                    'स्वच्छ रीवा, सुंदर रीवा • "समस्या बताइए, AI समाधान तक पहुंचाएगा"',
                    'Clean Rewa, Smart Rewa • "Report civic issue, AI routes to resolution"'
                  )}
                </span>
              </div>
            </Link>

            {/* Desktop Brand Badges */}
            <div className="gov-partner-badges">
              <div className="gov-badge-box">
                <SwachhBharatLogo size={38} />
                <span className="gov-badge-label">
                  {bilingual('नागरिक स्वच्छता पहल', 'Civic Cleanliness Mission')}
                </span>
              </div>
              <div className="gov-badge-box" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#17365D' }}>Smart City</span>
                <span className="gov-badge-label" style={{ color: '#D95D08' }}>
                  {bilingual('रीवा नवाचार 2030', 'Rewa Innovation 2030')}
                </span>
              </div>
            </div>

            {/* Mobile Header Menu Button */}
            <div className="mobile-header-actions" style={{ display: 'none' }}>
              <button
                type="button"
                className="mobile-hamburger-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 4. Live Civic Announcement Marquee */}
      <div className="gov-notice-marquee" role="region" aria-label="Official announcements">
        <div className="container" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="gov-notice-label">
            📢 {bilingual('सार्वजनिक सूचना', 'Notice')}
          </span>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <span className="gov-marquee-content">
              {bilingual(
                'स्वच्छता सर्वेक्षण 2026: रीवा को स्वच्छ बनाएं | कचरा, पेयजल लीकेज, स्ट्रीट लाइट या सड़क गड्ढे की शिकायत 1-टैप में फोटो या बोलकर दर्ज करें | कंट्रोल रूम: 07662-252525 | CM हेल्पलाइन: 181',
                'Swachh Survekshan 2026: Help keep Rewa clean | Report waste, pipe leaks, dark streetlights or potholes with 1 tap via photo or voice | Control Room: 07662-252525 | CM Helpline: 181'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Desktop Navigation Bar */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="nav-links">
            {!isAdminPath ? (
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
                  <span>{bilingual('रीवा वार्ड मैप', 'City Ward Map')}</span>
                </Link>
                <Link to="/about" className={isActive('/about')}>
                  <Building2 size={15} />
                  <span>{bilingual('पोर्टल परिचय', 'About Portal')}</span>
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
                  <BarChart3 size={15} />
                  <span>{bilingual('एनालिटिक्स एवं रिपोर्ट', 'Analytics & Reports')}</span>
                </Link>
                <Link to="/" className="nav-link" style={{ marginLeft: '0.5rem', background: 'rgba(255,255,255,0.1)' }}>
                  ← {bilingual('नागरिक पोर्टल', 'Citizen View')}
                </Link>
              </>
            )}
          </div>

          {/* Dedicated Account Section (Citizen, Worker, Officer) */}
          <div ref={accountMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: user ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'background 0.15s ease',
              }}
              aria-expanded={accountMenuOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <UserIcon size={14} color="#93c5fd" />
              <span>
                {user ? (
                  profile?.full_name || user.email?.split('@')[0]
                ) : (
                  bilingual('मेरा खाता', 'My Account')
                )}
              </span>
              {user && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: isAdmin ? '#f59e0b' : profile?.role === 'worker' ? '#ea580c' : '#0284c7',
                  color: isAdmin ? '#0f172a' : '#ffffff',
                  textTransform: 'uppercase',
                }}>
                  {isAdmin ? 'ADMIN' : profile?.role === 'worker' ? 'WORKER' : 'CITIZEN'}
                </span>
              )}
              <ChevronDown size={13} style={{ transform: accountMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>

            {accountMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #cbd5e1',
                  minWidth: '240px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {user ? (
                  <div>
                    <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                        {profile?.full_name || 'Citizen User'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                        {user.email}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isAdmin ? '#fef3c7' : profile?.role === 'worker' ? '#ffedd5' : '#e0f2fe',
                          color: isAdmin ? '#92400e' : profile?.role === 'worker' ? '#9a3412' : '#0369a1',
                          display: 'inline-block',
                          textTransform: 'uppercase',
                        }}>
                          Role: {isAdmin ? 'Administrator' : profile?.role === 'worker' ? 'Field Worker' : 'Citizen'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '0.4rem' }}>
                      {isAdmin && (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setAccountMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.82rem',
                              color: '#1e293b',
                              textDecoration: 'none',
                              borderRadius: '6px',
                            }}
                          >
                            <Shield size={15} color="#0b3a6d" />
                            <span>{bilingual('प्रशासन नियंत्रण कक्ष', 'Admin Dashboard')}</span>
                          </Link>
                          <Link
                            to="/admin/complaints"
                            onClick={() => setAccountMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.82rem',
                              color: '#1e293b',
                              textDecoration: 'none',
                              borderRadius: '6px',
                            }}
                          >
                            <FileText size={15} color="#0b3a6d" />
                            <span>{bilingual('शिकायत प्रबंधन', 'Complaints Manager')}</span>
                          </Link>
                        </>
                      )}

                      {profile?.role === 'worker' && (
                        <Link
                          to="/worker"
                          onClick={() => setAccountMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 0.75rem',
                            fontSize: '0.82rem',
                            color: '#1e293b',
                            textDecoration: 'none',
                            borderRadius: '6px',
                          }}
                        >
                          <HardHat size={15} color="#d97706" />
                          <span>{bilingual('वर्कर कार्य पोर्टल', 'Field Worker Portal')}</span>
                        </Link>
                      )}

                      <Link
                        to="/complaints"
                        onClick={() => setAccountMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.82rem',
                          color: '#1e293b',
                          textDecoration: 'none',
                          borderRadius: '6px',
                        }}
                      >
                        <FileText size={15} color="#64748b" />
                        <span>{bilingual('मेरी जन-शिकायतें', 'My Grievances')}</span>
                      </Link>

                      <div style={{ height: 1, background: '#f1f5f9', margin: '0.35rem 0' }} />

                      <button
                        type="button"
                        onClick={async () => {
                          setAccountMenuOpen(false);
                          await signOut();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.82rem',
                          color: '#b91c1c',
                          background: 'none',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={15} color="#b91c1c" />
                        <span>{bilingual('लॉगआउट करें', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.4rem' }}>
                    <div style={{ padding: '0.5rem 0.75rem 0.35rem', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      {bilingual('खाता चुनें (पोर्टल पहुंच)', 'Select Portal Login')}
                    </div>

                    <Link
                      to="/login"
                      onClick={() => setAccountMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <UserIcon size={16} color="#0b3a6d" />
                      <div>
                        <div style={{ fontWeight: 700 }}>{bilingual('नागरिक लॉगिन / पंजीयन', 'Citizen Login / Register')}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{bilingual('शिकायतें ट्रैक करें व स्थिति जांचें', 'Track status & lodge grievances')}</div>
                      </div>
                    </Link>

                    <Link
                      to="/worker-login"
                      onClick={() => setAccountMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <HardHat size={16} color="#d97706" />
                      <div>
                        <div style={{ fontWeight: 700 }}>{bilingual('विभागीय कर्मी पोर्टल', 'Field Worker Portal')}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{bilingual('फील्ड तकनीशियन व सुपरवाइजर', 'Field staff & supervisors')}</div>
                      </div>
                    </Link>

                    <Link
                      to="/login"
                      onClick={() => setAccountMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        textDecoration: 'none',
                        borderRadius: '6px',
                      }}
                    >
                      <Shield size={16} color="#0b3a6d" />
                      <div>
                        <div style={{ fontWeight: 700 }}>{bilingual('प्रशासनिक अधिकारी लॉगिन', 'Officer / Admin Login')}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{bilingual('नगर निगम नियंत्रण कक्ष व अधिकारी', 'Nagar Nigam control room')}</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 5b. Mobile Admin Sticky Sub-Navigation Bar */}
      {isAdminPath && (
        <div className="mobile-admin-strip" role="navigation" aria-label="Admin Sections">
          <Link to="/admin" className={isAdminSubActive('/admin')}>
            <Shield size={13} />
            <span>{bilingual('डैशबोर्ड', 'Dashboard')}</span>
          </Link>
          <Link to="/admin/complaints" className={isAdminSubActive('/admin/complaints')}>
            <FileText size={13} />
            <span>{bilingual('शिकायतें', 'Complaints')}</span>
          </Link>
          <Link to="/admin/map" className={isAdminSubActive('/admin/map')}>
            <Map size={13} />
            <span>{bilingual('वार्ड मैप', 'Map')}</span>
          </Link>
          <Link to="/admin/analytics" className={isAdminSubActive('/admin/analytics')}>
            <BarChart3 size={13} />
            <span>{bilingual('रिपोर्ट', 'Reports')}</span>
          </Link>
          <Link to="/" className="admin-sub-item" style={{ color: '#147D83' }}>
            <span>← {bilingual('नागरिक दृश्य', 'Citizen View')}</span>
          </Link>
        </div>
      )}

      {/* 6. Accessible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Drawer Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0D223B, #17365D)',
              padding: '1.25rem 1rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CivicInsignia size={36} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                    {bilingual('रीवा सहायक AI', 'Rewa Sahayak AI')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd' }}>
                    {bilingual('नागरिक जन-सेवा पोर्टल', 'Civic Redressal Portal')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link to="/" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <Home size={18} color="#17365D" />
                <span>{bilingual('मुख्य पृष्ठ', 'Home')}</span>
              </Link>
              <Link to="/report" className="mobile-drawer-link" style={{ fontWeight: 800, color: '#D95D08' }} onClick={() => setMobileMenuOpen(false)}>
                <PlusCircle size={18} color="#D95D08" />
                <span>{bilingual('शिकायत दर्ज करें (AI)', 'Lodge Complaint (AI)')}</span>
              </Link>
              <Link to="/complaints" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <FileText size={18} color="#17365D" />
                <span>{bilingual('शिकायतें एवं स्थिति ट्रैक करें', 'Track Complaints')}</span>
              </Link>
              <Link to="/map" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <Map size={18} color="#17365D" />
                <span>{bilingual('रीवा लाइव वार्ड मैप', 'City Ward Map')}</span>
              </Link>
              <Link to="/about" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <Info size={18} color="#17365D" />
                <span>{bilingual('पोर्टल परिचय एवं नागरिक अधिकार', 'About & Citizen Charter')}</span>
              </Link>

              <div style={{ height: 1, background: '#e2e8f0', margin: '0.5rem 0' }} />

              {/* Account & Role Portals in Mobile Drawer */}
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '0.25rem 0.5rem' }}>
                {bilingual('खाता एवं पोर्टल पहुंच', 'Account & Portal Access')}
              </div>

              {user ? (
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', margin: '0.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0b3a6d' }}>
                      👤 {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isAdmin ? '#fef3c7' : profile?.role === 'worker' ? '#ffedd5' : '#e0f2fe',
                      color: isAdmin ? '#92400e' : profile?.role === 'worker' ? '#9a3412' : '#0369a1',
                      textTransform: 'uppercase',
                    }}>
                      {isAdmin ? 'ADMIN' : profile?.role === 'worker' ? 'WORKER' : 'CITIZEN'}
                    </span>
                  </div>

                  {isAdmin && (
                    <Link to="/admin" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                      <Shield size={16} color="#0b3a6d" />
                      <span>{bilingual('प्रशासन नियंत्रण कक्ष', 'Administrative Dashboard')}</span>
                    </Link>
                  )}
                  {profile?.role === 'worker' && (
                    <Link to="/worker" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                      <HardHat size={16} color="#d97706" />
                      <span>{bilingual('वर्कर कार्य पोर्टल', 'Field Worker Portal')}</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="mobile-drawer-link"
                    style={{ color: '#b91c1c', marginTop: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', width: '100%', justifyContent: 'center' }}
                  >
                    <LogOut size={16} color="#b91c1c" />
                    <span>{bilingual('लॉगआउट करें', 'Sign Out')}</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <Link to="/login" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                    <UserIcon size={16} color="#0b3a6d" />
                    <span>{bilingual('नागरिक लॉगिन / पंजीयन', 'Citizen Login / Register')}</span>
                  </Link>
                  <Link to="/worker-login" className="mobile-drawer-link" style={{ background: '#fffbeb', border: '1px solid #fde68a' }} onClick={() => setMobileMenuOpen(false)}>
                    <HardHat size={16} color="#d97706" />
                    <span style={{ fontWeight: 700, color: '#92400e' }}>{bilingual('विभागीय कर्मी पोर्टल', 'Field Worker Portal')}</span>
                  </Link>
                  <Link to="/login" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                    <Shield size={16} color="#0b3a6d" />
                    <span>{bilingual('प्रशासनिक अधिकारी लॉगिन', 'Officer / Admin Login')}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b' }}>
              <div>{bilingual('रीवा सहायक AI • नागरिक जन-सेवा प्रोटोटाइप', 'Rewa Sahayak AI • Civic Redressal Prototype')}</div>
              <div style={{ marginTop: 2, color: '#94a3b8' }}>iComputex 2026 Hackathon</div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>

      {/* 7. Mobile Bottom App Bar (Always reachable by thumb for minimal effort!) */}
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
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="mobile-bottom-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="More navigation options"
        >
          <Menu size={20} />
          <span>{bilingual('मेनू', 'Menu')}</span>
        </button>
      </nav>

      {/* 8. Formal Civic Service Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-top-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CivicInsignia size={44} />
              <div>
                <div className="footer-brand">
                  {bilingual('रीवा सहायक AI — नागरिक सेवा पोर्टल', 'Rewa Sahayak AI — Civic Grievance Portal')}
                </div>
                <div className="footer-subbrand">
                  {bilingual(
                    'स्मार्ट सिटी रीवा नवाचार • जन-शिकायत निवारण ई-प्रणाली (प्रोटोटाइप)',
                    'Smart City Rewa Innovation • Civic Grievance Redressal Platform (Prototype)'
                  )}
                </div>
              </div>
            </div>

            <div className="footer-links">
              <Link to="/" className="footer-link">{bilingual('मुख्य पृष्ठ', 'Home')}</Link>
              <Link to="/report" className="footer-link">{bilingual('शिकायत दर्ज करें', 'File Complaint')}</Link>
              <Link to="/complaints" className="footer-link">{bilingual('स्थिति देखें', 'Track Status')}</Link>
              <Link to="/map" className="footer-link">{bilingual('वार्ड मैप', 'City Ward Map')}</Link>
              <Link to="/about" className="footer-link">{bilingual('पोर्टल परिचय एवं अधिकार', 'About & Citizen Charter')}</Link>
              <Link to="/worker-login" className="footer-link">{bilingual('वर्कर पोर्टल', 'Worker Portal')}</Link>
              <Link to="/admin" className="footer-link">{bilingual('अधिकारी लॉगिन', 'Officer Login')}</Link>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <p className="footer-text">
              {bilingual(
                'यह पोर्टल रीवा के नागरिकों की नागरिक समस्याओं के त्वरित, पारदर्शी व सुगम निवारण हेतु तैयार किया गया एक स्मार्ट गवर्नेंस प्रोटोटाइप है।',
                'This portal is a smart governance demonstration prototype developed for rapid, transparent civic grievance redressal in Rewa.'
              )}
            </p>
            <div className="footer-nic-badge">
              <span>💡 {bilingual('iComputex 2026 हैकथॉन नवाचार पहल', 'iComputex 2026 Hackathon Innovation Initiative')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.74rem', color: '#64748b' }}>
            <span>
              {bilingual('© 2026 रीवा सहायक AI | जन-सेवा प्रदर्शन प्रोटोटाइप', '© 2026 Rewa Sahayak AI | Public Civic Tech Prototype')}
            </span>
            <span>
              {bilingual(
                'पोर्टल संस्करण: v2.5 (Civic Redressal Edition) | रीवा, मध्य प्रदेश',
                'Portal Version: v2.5 (Civic Redressal Edition) | Rewa, Madhya Pradesh'
              )}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
