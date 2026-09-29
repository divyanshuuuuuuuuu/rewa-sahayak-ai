import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Trash2, Droplets, Zap } from 'lucide-react';
import { AshokaEmblem, RewaMunicipalLogo } from '../components/Emblem';
import { useGov } from '../context/GovContext';

export default function About() {
  const { bilingual } = useGov();

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Official Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <AshokaEmblem size={56} />
            <RewaMunicipalLogo size={56} />
          </div>
          <span className="gov-seal-badge" style={{ marginBottom: '0.5rem' }}>
            {bilingual(
              'नगर पालिक निगम, रीवा • मध्य प्रदेश शासन',
              'Rewa Municipal Corporation • Govt. of Madhya Pradesh'
            )}
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.4rem' }}>
            {bilingual('रीवा सहायक AI — पोर्टल परिचय', 'About Rewa Sahayak AI Portal')}
          </h1>
          <p style={{ color: '#475569', fontSize: '1rem' }}>
            {bilingual(
              'स्मार्ट सिटी रीवा 2030 • नागरिक सेवा एवं त्वरित जन-शिकायत निवारण ई-प्रणाली',
              'Smart City Rewa 2030 • AI-Powered Civic Grievance Redressal System'
            )}
          </p>
        </div>

        {/* Hackathon & Initiative Banner */}
        <div className="hackathon-banner">
          <Zap size={28} color="#b45309" style={{ flexShrink: 0 }} />
          <div>
            <div className="hackathon-banner-title">
              🏆 iComputex Hackathon 2026 — Smart Rewa 2030
            </div>
            <div className="hackathon-banner-text">
              {bilingual(
                'थीम: गवर्नेंस एवं स्मार्ट सिटी विकास | स्थल: गवर्नमेंट इंजीनियरिंग कॉलेज (GEC) रीवा (30 अक्टूबर 2026)। जिला प्रशासन रीवा एवं नगर पालिक निगम हेतु तैयार की गई उन्नत तकनीकी पहल।',
                'Track: Governance & Smart City Development | Venue: Government Engineering College (GEC) Rewa (30 October 2026). Conceptualized for District Administration Rewa & Rewa Municipal Corporation.'
              )}
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '5px solid #0b3a6d' }}>
          <h2 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            {bilingual('🎯 उद्देश्य एवं पृष्ठभूमि (Our Mission)', '🎯 Mission & Objective')}
          </h2>
          <p style={{ color: '#334155', lineHeight: 1.8, fontSize: '0.95rem' }}>
            {bilingual(
              'पारंपरिक रूप से नागरिकों को नगर निगम की सेवाओं का लाभ लेने या शिकायत करने के लिए यह समझना पड़ता था कि समस्या किस विभाग (जल विभाग, स्वास्थ्य विभाग, लोक निर्माण विभाग) के अधिकार क्षेत्र में आती है। रीवा सहायक AI इस जटिलता को पूर्णतः समाप्त करता है। नागरिक अपनी भाषा (हिंदी, बघेली या अंग्रेजी) में बोलकर, फोटो खींचकर या सामान्य शब्दों में लिखकर अपनी समस्या बता सकते हैं। AI प्रणाली इसे स्वयं संबंधित विभाग और जोनल अधिकारी तक प्रेषित करती है।',
              'Traditionally, citizens had to figure out which specific municipal department (Public Works, Health & Sanitation, Water Works, or Electrical) handled their problem. Rewa Sahayak AI eliminates that friction completely. Citizens simply speak in natural Hindi or English, snap a photo, or type brief keywords. The AI classifies the issue, extracts geo-coordinates, and dispatches it directly to the designated ward and zonal engineer.'
            )}
          </p>
        </div>

        {/* Citizen Charter SLA */}
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '5px solid #15803d' }}>
          <h2 style={{ fontWeight: 800, color: '#15803d', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            {bilingual(
              '📜 नागरिक अधिकार पत्र एवं समय-सीमा (Citizen\'s Charter SLA)',
              "📜 Citizen's Charter & Service Level Agreements (SLA)"
            )}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, color: '#0b3a6d' }}>
                {bilingual('🗑️ कचरा उठाव समस्या:', '🗑️ Waste Collection:')}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700, margin: '0.2rem 0 0' }}>
                {bilingual('24 घंटे के भीतर निवारण', 'Resolution within 24 Hours')}
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, color: '#0b3a6d' }}>
                {bilingual('💧 पाइपलाइन लीकेज:', '💧 Pipeline Leakage:')}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 700, margin: '0.2rem 0 0' }}>
                {bilingual('12 से 24 घंटे के भीतर', 'Resolution in 12 to 24 Hours')}
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, color: '#0b3a6d' }}>
                {bilingual('💡 स्ट्रीट लाइट खराबी:', '💡 Streetlight Fault:')}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#e65100', fontWeight: 700, margin: '0.2rem 0 0' }}>
                {bilingual('48 घंटे के भीतर सुधार', 'Resolution within 48 Hours')}
              </p>
            </div>
          </div>
        </div>

        {/* Department Modules */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.25rem', marginBottom: '1rem' }}>
            {bilingual('🧩 प्रमुख कार्य प्रभाग (Modules)', '🧩 Core Operational Divisions')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Trash2 size={22} color="#15803d" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <div>
                <strong style={{ color: '#0b3a6d' }}>
                  {bilingual('स्मार्ट वेस्ट (Smart Waste):', 'Smart Waste Management:')}
                </strong>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.15rem 0 0' }}>
                  {bilingual(
                    'स्वच्छ भारत अभियान अंतर्गत कचरा डिपो, डोर-टू-डोर गाड़ी, अवैध डंपिंग और गंदगी की फोटो आधारित पहचान।',
                    'Swachh Bharat Mission urban module handling door-to-door collection, dumping spots, and photo-based AI waste detection.'
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Droplets size={22} color="#0284c7" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <div>
                <strong style={{ color: '#0b3a6d' }}>
                  {bilingual('जल रक्षक (JalRakshak):', 'JalRakshak (Water Works):')}
                </strong>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.15rem 0 0' }}>
                  {bilingual(
                    'पेयजल सुरक्षा, पाइपलाइन लीकेज, नालियों की सफाई, वर्षा जल संचयन एवं सीवर ओवरफ्लो नियंत्रण।',
                    'Potable water supply, pipeline bursts, drainage blockages, rainwater logging, and sewer overflow redressal.'
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Cpu size={22} color="#e65100" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <div>
                <strong style={{ color: '#0b3a6d' }}>
                  {bilingual('रीवा सहायक सामान्य (PWD & Lighting):', 'Rewa Sahayak (PWD & Lighting):')}
                </strong>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.15rem 0 0' }}>
                  {bilingual(
                    'सड़क के खतरनाक गड्ढे, प्रकाश व्यवस्था, पार्क एवं सार्वजनिक संपत्तियों की सुरक्षा।',
                    'Road pothole repair express, public streetlights, electrical safety, footpaths, and public property upkeep.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Helplines and Office Address */}
        <div className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc' }}>
          <h2 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
            {bilingual('📍 संपर्क एवं प्रशासनिक कार्यालय', '📍 Contact & Administrative Office')}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7 }}>
            <strong>{bilingual('कार्यालय:', 'Office:')}</strong>{' '}
            {bilingual(
              'नगर पालिक निगम मुख्यालय, सिरमौर चौराहा के पास, रीवा, मध्य प्रदेश - 486001',
              'Rewa Municipal Corporation Headquarters, Near Sirmour Chowk, Rewa, Madhya Pradesh - 486001'
            )}
            <br />
            <strong>{bilingual('कंट्रोल रूम फोन:', 'Control Room:')}</strong> 07662-252525 |{' '}
            <strong>{bilingual('CM हेल्पलाइन:', 'CM Helpline:')}</strong> 181 (Toll Free)
            <br />
            <strong>{bilingual('ईमेल:', 'Email:')}</strong> nnrewa@mpurban.gov.in
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/report" className="btn btn-primary btn-lg" style={{ background: '#0b3a6d' }}>
            <span>{bilingual('शिकायत दर्ज करें', 'Lodge a Complaint')}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
