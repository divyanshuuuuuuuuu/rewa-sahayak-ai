import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp, ArrowRight, ShieldCheck, HardHat, UserCheck, Building2 } from 'lucide-react';
import { getStats, getAllComplaints, syncFromSupabase } from '../../services/store';
import { getDepartmentWorkers } from '../../services/whatsappService';
import { statusLabels, statusColors, moduleNames, moduleColors, categoryIcons, severityColors } from '../../services/ai';
import { AshokaEmblem } from '../../components/Emblem';
import { useGov } from '../../context/GovContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState(getStats());
  const [complaints, setComplaints] = useState(getAllComplaints());
  const [workerCount, setWorkerCount] = useState(7);
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
    window.addEventListener('rewa_store_updated', onUpdate);
    return () => window.removeEventListener('rewa_store_updated', onUpdate);
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
