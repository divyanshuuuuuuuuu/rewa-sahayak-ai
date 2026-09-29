import { useNavigate } from 'react-router-dom';
import { Shield, User } from 'lucide-react';
import { loginAsDemo } from '../services/store';
import { AshokaEmblem, RewaMunicipalLogo } from '../components/Emblem';
import { useGov } from '../context/GovContext';

export default function Login() {
  const navigate = useNavigate();
  const { lang, bilingual } = useGov();

  const handleLogin = (role: 'citizen' | 'admin') => {
    loginAsDemo(role);
    if (role === 'admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="login-page fade-in">
      <div className="card login-card" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <AshokaEmblem size={48} />
            <RewaMunicipalLogo size={48} />
          </div>
          <span className="gov-seal-badge" style={{ marginBottom: '0.5rem' }}>
            {bilingual('नगर पालिक निगम, रीवा', 'Rewa Municipal Corporation')}
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.25rem' }}>
            {bilingual('ई-पोर्टल लॉगिन', 'Civic Portal Login')}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Rewa Sahayak AI — Citizen & Officer Access
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', background: '#0b3a6d' }}
            onClick={() => handleLogin('citizen')}
          >
            <User size={18} />
            <span>{bilingual('नागरिक के रूप में जारी रखें', 'Continue as Citizen')}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => handleLogin('admin')}
          >
            <Shield size={18} color="#0b3a6d" />
            <span>{bilingual('निगम अधिकारी / Admin के रूप में प्रवेश', 'Enter as Officer / Admin')}</span>
          </button>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          {bilingual('डेमो मोड (Demo Mode) — पासवर्ड की आवश्यकता नहीं है।', 'Demo Mode — No password required.')}
        </p>
      </div>
    </div>
  );
}
