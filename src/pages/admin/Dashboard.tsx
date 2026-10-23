import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  HardHat,
  UserCheck,
  Building2,
  Key,
  UserPlus,
  Power,
  RefreshCw,
  History,
  Lock,
  X,
  Check,
  Shield,
  Layers,
  Phone,
} from 'lucide-react';
import { getStats, getAllComplaints, syncFromSupabase } from '../../services/store';
import { getDepartmentWorkers } from '../../services/whatsappService';
import { statusLabels, statusColors, moduleNames, moduleColors, categoryIcons, severityColors } from '../../services/ai';
import { AshokaEmblem } from '../../components/Emblem';
import { useGov } from '../../context/GovContext';
import {
  getDepartmentAccounts,
  adminCreateDepartmentAccount,
  adminResetDepartmentCredentials,
  adminToggleDepartmentAccountStatus,
  getAuditLogs,
  getDepartmentComplaintStats,
  DEPARTMENT_METADATA,
  type DepartmentAccount,
  type DepartmentAuditLog,
} from '../../services/departmentAccountService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(getStats());
  const [complaints, setComplaints] = useState(getAllComplaints());
  const [workerCount, setWorkerCount] = useState(7);
  const [deptAccounts, setDeptAccounts] = useState<DepartmentAccount[]>(getDepartmentAccounts());
  const [auditLogs, setAuditLogs] = useState<DepartmentAuditLog[]>(getAuditLogs());
  const [activeDeptTab, setActiveDeptTab] = useState<'accounts' | 'audit'>('accounts');

  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    department_name: '',
    department_key: 'water' as DepartmentAccount['department_key'],
    username: '',
    email: '',
    designation: '',
    initial_password: 'Worker@Rewa2026!',
    phone: '',
    notes: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetModalAccount, setResetModalAccount] = useState<DepartmentAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const recent = complaints.slice(0, 8);
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();

  useEffect(() => {
    syncFromSupabase().then(() => {
      setStats(getStats());
      setComplaints(getAllComplaints());
    });
    getDepartmentWorkers().then((w) => setWorkerCount(w.length));
    const onUpdate = () => {
      setStats(getStats());
      setComplaints(getAllComplaints());
      getDepartmentWorkers().then((w) => setWorkerCount(w.length));
    };
    const onDeptAccountsUpdate = () => {
      setDeptAccounts(getDepartmentAccounts());
      setAuditLogs(getAuditLogs());
    };
    window.addEventListener('rewa_store_updated', onUpdate);
    window.addEventListener('rewa_department_accounts_updated', onDeptAccountsUpdate);
    return () => {
      window.removeEventListener('rewa_store_updated', onUpdate);
      window.removeEventListener('rewa_department_accounts_updated', onDeptAccountsUpdate);
    };
  }, []);

  // Department-wise Complaint Counts
  const deptData = complaints.reduce((acc: Record<string, number>, c) => {
    const dept = c.assigned_department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentChartData = Object.entries(deptData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Chart data
  const categoryData = Object.entries(stats.by_category)
    .map(([name, value]) => ({
      name: categoryLabel(name),
      value,
      fullName: categoryLabel(name),
    }))
    .sort((a, b) => b.value - a.value);

  const statusData = Object.entries(stats.by_status).map(([name, value]) => ({
    name: statusLabel(name),
    value,
    color: statusColors[name] || '#0b3a6d',
  }));

  const moduleData = Object.entries(stats.by_module).map(([name, value]) => ({
    name: moduleLabel(name),
    value,
    color: moduleColors[name as keyof typeof moduleColors] || '#0b3a6d',
  }));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const tooltipStyle = {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    color: '#0f172a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const handleToggleStatus = (acc: DepartmentAccount) => {
    const res = adminToggleDepartmentAccountStatus(acc.id, !acc.is_active, 'Admin Officer');
    if (!res.error) {
      setDeptAccounts(getDepartmentAccounts());
      setAuditLogs(getAuditLogs());
      setActionSuccess(
        bilingual(
          `खाता "${acc.department_name}" ${acc.is_active ? 'निष्क्रिय' : 'सक्रिय'} किया गया।`,
          `Account "${acc.department_name}" ${acc.is_active ? 'deactivated' : 'activated'}.`
        )
      );
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleOpenResetModal = (acc: DepartmentAccount) => {
    setResetModalAccount(acc);
    setNewPassword('');
    setResetError(null);
  };

  const handleResetPassword = () => {
    if (!resetModalAccount) return;
    if (newPassword.length < 6) {
      setResetError(bilingual('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए', 'Password must be at least 6 characters'));
      return;
    }
    const res = adminResetDepartmentCredentials(resetModalAccount.id, newPassword, 'Admin Officer');
    if (res.error) {
      setResetError(res.error);
    } else {
      setResetModalAccount(null);
      setNewPassword('');
      setResetError(null);
      setAuditLogs(getAuditLogs());
      setActionSuccess(
        bilingual(
          `${resetModalAccount.department_name} का पासवर्ड सफलतापूर्वक अपडेट किया गया।`,
          `Password updated successfully for ${resetModalAccount.department_name}.`
        )
      );
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.department_name.trim() || !createForm.username.trim() || !createForm.email.trim()) {
      setCreateError(bilingual('कृपया सभी अनिवार्य फ़ील्ड भरें', 'Please fill all required fields'));
      return;
    }
    const res = adminCreateDepartmentAccount(
      {
        department_id: `dept-${Date.now()}`,
        department_name: createForm.department_name.trim(),
        department_key: createForm.department_key,
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        designation: createForm.designation.trim() || `${createForm.department_name} Incharge`,
        initial_password: createForm.initial_password || 'Worker@Rewa2026!',
        categories_handled: [],
        phone: createForm.phone.trim(),
        notes: createForm.notes.trim(),
      },
      'Admin Officer'
    );

    if (res.error) {
      setCreateError(res.error);
    } else {
      setShowCreateModal(false);
      setCreateForm({
        department_name: '',
        department_key: 'water',
        username: '',
        email: '',
        designation: '',
        initial_password: 'Worker@Rewa2026!',
        phone: '',
        notes: '',
      });
      setDeptAccounts(getDepartmentAccounts());
      setAuditLogs(getAuditLogs());
      setActionSuccess(
        bilingual('नया विभागीय खाता सफलतापूर्वक बनाया गया।', 'New department account created successfully.')
      );
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  return (
    <div className="page fade-in">
      <div className="container">
        
        {/* Government Admin Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="gov-seal-badge" style={{ marginBottom: '0.35rem' }}>
              <ShieldCheck size={14} color="#0b3a6d" />
              {lang === 'hi' ? 'रीवा नगर पालिक निगम — प्रशासनिक निगरानी प्रकोष्ठ' : 'Rewa Nagar Nigam — Administrative Monitoring'}
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0b3a6d', margin: 0 }}>
              {lang === 'hi' ? 'प्रशासनिक डैशबोर्ड' : 'Administrative Dashboard'}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {lang === 'hi'
                ? 'रीवा शहर जन-शिकायत निवारण एवं समाधान नियंत्रण कक्ष'
                : 'Rewa City Civic Grievance Monitoring & Resolution Center'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/worker-login" className="btn btn-secondary btn-sm" style={{ borderColor: '#f59e0b', color: '#b45309' }}>
              <HardHat size={14} />
              {lang === 'hi' ? 'वर्कर पोर्टल' : 'Worker Portal'}
            </Link>
            <Link to="/" className="btn btn-secondary btn-sm">
              ← {lang === 'hi' ? 'नागरिक पोर्टल' : 'Citizen Portal'}
            </Link>
          </div>
        </div>

        {/* Live Supabase Stats Grid (6 cards fulfilling all requirements) */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div className="stat-card">
            <FileText size={22} color="#0b3a6d" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#0b3a6d' }}>{stats.total}</div>
            <div className="stat-label">{lang === 'hi' ? 'कुल शिकायतें' : 'Total Complaints'}</div>
          </div>
          <div className="stat-card">
            <Clock size={22} color="#d97706" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#d97706' }}>{stats.submitted + stats.under_review}</div>
            <div className="stat-label">{lang === 'hi' ? 'प्रतीक्षारत' : 'Pending Complaints'}</div>
          </div>
          <div className="stat-card">
            <TrendingUp size={22} color="#2563eb" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#2563eb' }}>{stats.assigned}</div>
            <div className="stat-label">{lang === 'hi' ? 'आवंटित शिकायतें' : 'Assigned Complaints'}</div>
          </div>
          <div className="stat-card">
            <TrendingUp size={22} color="#7c3aed" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#7c3aed' }}>{stats.in_progress}</div>
            <div className="stat-label">{lang === 'hi' ? 'कार्य प्रगति पर' : 'Work In Progress'}</div>
          </div>
          <div className="stat-card">
            <CheckCircle size={22} color="#15803d" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#15803d' }}>{stats.resolved + stats.closed}</div>
            <div className="stat-label">{lang === 'hi' ? 'निराकृत' : 'Resolved Complaints'}</div>
          </div>
          <div className="stat-card">
            <HardHat size={22} color="#ea580c" style={{ marginBottom: '0.4rem' }} />
            <div className="stat-value" style={{ color: '#ea580c' }}>{workerCount}</div>
            <div className="stat-label">{lang === 'hi' ? 'पंजीकृत कर्मी' : 'Registered Workers'}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          {/* By Category */}
          <div className="chart-card">
            <div className="chart-title">
              {lang === 'hi' ? 'श्रेणी अनुसार शिकायतें' : 'Complaints by Category'}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={115} tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#0b3a6d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By Status */}
          <div className="chart-card">
            <div className="chart-title">
              {lang === 'hi' ? 'स्थिति अनुसार विभाजन' : 'Complaints by Status'}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* By Module */}
          <div className="chart-card">
            <div className="chart-title">
              {lang === 'hi' ? 'विभाग अनुसार विभाजन' : 'Complaints by Module'}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={moduleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {moduleData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Department-wise Complaint Counts */}
          <div className="chart-card">
            <div className="chart-title">
              {lang === 'hi' ? 'विभागीय आवंटन विवरण' : 'Department-wise Complaint Counts'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 250, overflowY: 'auto' }}>
              {departmentChartData.map((d) => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', background: '#f8fafc', borderRadius: 6, fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{d.name}</span>
                  <span style={{ background: '#0b3a6d', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div
            style={{
              background: '#dcfce7',
              border: '1px solid #86efac',
              color: '#15803d',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Check size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Department Accounts & Access Control Management Section */}
        <div id="department-accounts-management" className="card" style={{ marginBottom: '1.5rem', borderLeft: '5px solid #0b3a6d' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Building2 size={20} color="#0b3a6d" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b3a6d', margin: 0 }}>
                  {bilingual('विभागीय खाते एवं अभिगम नियंत्रण', 'Department Accounts & Access Control')}
                </h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                {bilingual(
                  'रीवा नगर निगम के अधिकृत विभागीय लॉगिन खाते, सुरक्षा क्रेडेंशियल्स और ऑडिट ट्रेल',
                  'Authorized Rewa Municipal departmental login accounts, security credentials, and audit trail'
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 6, padding: 3 }}>
                <button
                  type="button"
                  onClick={() => setActiveDeptTab('accounts')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    background: activeDeptTab === 'accounts' ? '#0b3a6d' : 'transparent',
                    color: activeDeptTab === 'accounts' ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {bilingual('विभागीय खाते', 'Department Accounts')} ({deptAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeptTab('audit')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    background: activeDeptTab === 'audit' ? '#0b3a6d' : 'transparent',
                    color: activeDeptTab === 'audit' ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {bilingual('सुरक्षा ऑडिट लॉग', 'Audit Trail')} ({auditLogs.length})
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <UserPlus size={15} />
                <span>{bilingual('+ नया विभागीय खाता जोड़ें', '+ Add Department Account')}</span>
              </button>
            </div>
          </div>

          {activeDeptTab === 'accounts' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {deptAccounts.map((acc) => {
                const meta = DEPARTMENT_METADATA[acc.department_key] || DEPARTMENT_METADATA.admin;
                const deptStats = getDepartmentComplaintStats(acc.department_key, acc.department_name, complaints);
                return (
                  <div
                    key={acc.id}
                    style={{
                      border: `1.5px solid ${acc.is_active ? '#e2e8f0' : '#fecaca'}`,
                      borderRadius: 10,
                      padding: '1rem',
                      background: acc.is_active ? '#ffffff' : '#fff5f5',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                              {acc.department_name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              @{acc.username} • {acc.email}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: acc.is_active ? '#dcfce7' : '#fee2e2',
                            color: acc.is_active ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {acc.is_active ? bilingual('सक्रिय', 'Active') : bilingual('निष्क्रिय', 'Deactivated')}
                        </span>
                      </div>

                      {/* Designation & Phone */}
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.65rem' }}>
                        <div><strong>{bilingual('पदनाम:', 'Designation:')}</strong> {acc.designation}</div>
                        {acc.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <Phone size={12} color="#64748b" />
                            <span>{acc.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Workload Stats Bar */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.4rem',
                          background: '#f8fafc',
                          padding: '0.5rem',
                          borderRadius: 8,
                          marginBottom: '0.75rem',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{bilingual('कुल कार्य', 'Total')}</div>
                          <div style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '0.95rem' }}>{deptStats.total}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#d97706' }}>{bilingual('सक्रिय कार्य', 'Active')}</div>
                          <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem' }}>
                            {deptStats.assigned + deptStats.inProgress}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#15803d' }}>{bilingual('समाधान', 'Resolved')}</div>
                          <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>{deptStats.resolved}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(acc)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          borderColor: acc.is_active ? '#dc2626' : '#15803d',
                          color: acc.is_active ? '#dc2626' : '#15803d',
                        }}
                      >
                        <Power size={13} />
                        <span>{acc.is_active ? bilingual('निष्क्रिय करें', 'Deactivate') : bilingual('सक्रिय करें', 'Activate')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenResetModal(acc)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                      >
                        <Key size={13} />
                        <span>{bilingual('पासवर्ड बदलें', 'Reset Password')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{bilingual('दिनांक एवं समय', 'Timestamp')}</th>
                    <th>{bilingual('कार्रवाई', 'Action')}</th>
                    <th>{bilingual('विभाग', 'Department')}</th>
                    <th>{bilingual('अधिकारी', 'Performed By')}</th>
                    <th>{bilingual('विवरण', 'Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                        {bilingual('कोई ऑडिट लॉग उपलब्ध नहीं है।', 'No audit logs recorded yet.')}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.7rem',
                              background:
                                log.action.includes('RESOLVED') || log.action.includes('ACTIVATED')
                                  ? '#dcfce7'
                                  : log.action.includes('REOPENED') || log.action.includes('DEACTIVATED')
                                  ? '#fee2e2'
                                  : '#f1f5f9',
                              color:
                                log.action.includes('RESOLVED') || log.action.includes('ACTIVATED')
                                  ? '#15803d'
                                  : log.action.includes('REOPENED') || log.action.includes('DEACTIVATED')
                                  ? '#b91c1c'
                                  : '#0b3a6d',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0b3a6d' }}>
                          {log.department_name}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#334155' }}>{log.performed_by}</td>
                        <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reset Password Modal */}
        {resetModalAccount && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: 420,
                width: '100%',
                background: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0b3a6d' }}>
                  {bilingual('पासवर्ड रीसेट करें', 'Reset Department Password')}
                </h3>
                <button
                  type="button"
                  onClick={() => setResetModalAccount(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                <strong>{resetModalAccount.department_name}</strong> ({resetModalAccount.email})
              </p>

              {resetError && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: 6, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  {resetError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">{bilingual('नया सुरक्षित पासवर्ड (New Password):', 'New Password:')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters (e.g. Water@Rewa2026!)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetModalAccount(null)}>
                  {bilingual('रद्द करें', 'Cancel')}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleResetPassword}>
                  {bilingual('पासवर्ड सहेजें', 'Save Password')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Department Account Modal */}
        {showCreateModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: 480,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0b3a6d' }}>
                  {bilingual('नया विभागीय खाता जोड़ें', 'Create Department Account')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              {createError && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: 6, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateAccount}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">{bilingual('विभाग का नाम (Department Name) *', 'Department Name *')}</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Water Works Division North"
                    value={createForm.department_name}
                    onChange={(e) => setCreateForm({ ...createForm, department_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">{bilingual('विभागीय प्रकार (Department Key) *', 'Department Key *')}</label>
                  <select
                    className="form-input"
                    value={createForm.department_key}
                    onChange={(e) => setCreateForm({ ...createForm, department_key: e.target.value as any })}
                  >
                    <option value="water">💧 Water Supply & Drainage (जल आपूर्ति)</option>
                    <option value="pwd">🛣️ Public Works Department (लोक निर्माण)</option>
                    <option value="electric">⚡ Streetlights & Electricity (विद्युत)</option>
                    <option value="waste">♻️ Waste Management (ठोस अपशिष्ट)</option>
                    <option value="sanitation">🧹 Sanitation & Hygiene (नगर स्वच्छता)</option>
                    <option value="admin">🏛️ General Administration (प्रशासन)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">{bilingual('यूज़रनेम (Username) *', 'Username *')}</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. water_north"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{bilingual('ईमेल (Email) *', 'Email *')}</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="e.g. water.north@rewa.gov.in"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">{bilingual('पदनाम (Designation)', 'Designation')}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Executive Engineer"
                      value={createForm.designation}
                      onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{bilingual('प्रारंभिक पासवर्ड', 'Initial Password')}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Worker@Rewa2026!"
                      value={createForm.initial_password}
                      onChange={(e) => setCreateForm({ ...createForm, initial_password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">{bilingual('संपर्क फोन नंबर', 'Phone Number')}</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="07662-250008"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">{bilingual('टिप्पणी / विवरण', 'Notes')}</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Responsibilities or ward coverage..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                    {bilingual('रद्द करें', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {bilingual('खाता बनाएं', 'Create Account')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Recent Complaints Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '1.1rem', margin: 0 }}>
              {lang === 'hi' ? 'नवीनतम प्राप्त शिकायतें' : 'Recent Complaints'}
            </h3>
            <Link to="/admin/complaints" className="btn btn-secondary btn-sm">
              <span>{lang === 'hi' ? 'पूरी सूची देखें' : 'View All'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{lang === 'hi' ? 'क्रमांक' : 'Ticket'}</th>
                  <th>{lang === 'hi' ? 'समस्या' : 'Problem'}</th>
                  <th>{lang === 'hi' ? 'श्रेणी' : 'Category'}</th>
                  <th>{lang === 'hi' ? 'विभाग' : 'Module'}</th>
                  <th>{lang === 'hi' ? 'प्राथमिकता' : 'Priority'}</th>
                  <th>{lang === 'hi' ? 'स्थिति' : 'Status'}</th>
                  <th>{lang === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th>{lang === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: '#0b3a6d', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {c.ticket_number}
                    </td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {c.title}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.8rem' }}>
                        {categoryIcons[c.category]} {categoryLabel(c.category)}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${moduleColors[c.module]}20`, color: moduleColors[c.module] }}>
                        {moduleLabel(c.module)}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${severityColors[c.severity]}20`, color: severityColors[c.severity] }}>
                        {c.severity}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${statusColors[c.status]}20`, color: statusColors[c.status] }}>
                        ● {statusLabel(c.status)}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(c.created_at)}</td>
                    <td>
                      <Link to={`/admin/complaints/${c.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
                        {lang === 'hi' ? 'देखें' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
