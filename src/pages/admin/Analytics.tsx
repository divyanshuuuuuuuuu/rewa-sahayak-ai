import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Sparkles } from 'lucide-react';
import { getStats, getAllComplaints } from '../../services/store';
import { statusLabels, statusColors, moduleNames, moduleColors, categoryIcons } from '../../services/ai';
import { useGov } from '../../context/GovContext';

export default function Analytics() {
  const stats = getStats();
  const complaints = getAllComplaints();
  const { bilingual, categoryLabel, moduleLabel, statusLabel } = useGov();

  // Resolution rate
  const resolved = stats.resolved + stats.closed;
  const resolutionRate = stats.total > 0 ? Math.round((resolved / stats.total) * 100) : 0;

  // Average resolution time (demo estimate)
  const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED');
  const avgDays = resolvedComplaints.length > 0
    ? Math.round(resolvedComplaints.reduce((sum, c) => {
        const created = new Date(c.created_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        return sum + (updated - created) / (1000 * 60 * 60 * 24);
      }, 0) / resolvedComplaints.length)
    : 0;

  // Most common category
  const topCategory = Object.entries(stats.by_category).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

  // Charts
  const categoryData = Object.entries(stats.by_category).map(([name, value]) => ({
    name: categoryLabel(name),
    value
  })).sort((a, b) => b.value - a.value);

  const statusData = Object.entries(stats.by_status).map(([name, value]) => ({
    name: statusLabel(name), value, color: statusColors[name] || '#6366f1'
  }));

  const moduleData = Object.entries(stats.by_module).map(([name, value]) => ({
    name: moduleLabel(name), value, color: moduleColors[name as keyof typeof moduleColors] || '#6366f1'
  }));

  const severityData = [
    { name: bilingual('उच्च (High)', 'High'), value: complaints.filter(c => c.severity === 'HIGH').length, color: '#ef4444' },
    { name: bilingual('मध्यम (Medium)', 'Medium'), value: complaints.filter(c => c.severity === 'MEDIUM').length, color: '#f59e0b' },
    { name: bilingual('सामान्य (Low)', 'Low'), value: complaints.filter(c => c.severity === 'LOW').length, color: '#10b981' },
  ];

  // Trend data (last 30 days)
  const trendData: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const count = complaints.filter(c => {
      const cd = new Date(c.created_at);
      return cd.toDateString() === d.toDateString();
    }).length;
    trendData.push({ day: dayStr, count });
  }

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
        <div className="module-header">
          <h1 style={{ color: '#0b3a6d', fontWeight: 900 }}>
            📊 {bilingual('नगर निगम रीवा — सांख्यिकी एवं विश्लेषण', 'Rewa Municipal Corporation — Analytics & Statistics')}
          </h1>
          <p>
            {bilingual(
              'रीवा शहर जन-शिकायत निवारण, समय-सीमा (SLA) एवं विभागवार प्रगति की विस्तृत रिपोर्ट',
              'Comprehensive overview of civic complaints, SLA compliance and resolution metrics'
            )}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#0b3a6d' }}>{stats.total}</div>
            <div className="stat-label">{bilingual('कुल शिकायतें', 'Total Reports')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#15803d' }}>{resolutionRate}%</div>
            <div className="stat-label">{bilingual('निवारण दर', 'Resolution Rate')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#d97706' }}>{avgDays}d</div>
            <div className="stat-label">{bilingual('औसत समाधान समय', 'Avg Resolution Time')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#dc2626' }}>{stats.high_priority}</div>
            <div className="stat-label">{bilingual('उच्च प्राथमिकता', 'High Priority')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: '1rem', color: '#0b3a6d' }}>{categoryLabel(topCategory)}</div>
            <div className="stat-label">{bilingual('सर्वाधिक श्रेणी', 'Most Common')}</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div className="chart-title">
              <TrendingUp size={14} style={{ verticalAlign: 'middle' }} />{' '}
              {bilingual('शिकायतों का समयवार रुझान (पिछले 30 दिन)', 'Complaints Over Time (Last 30 Days)')}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#0b3a6d" fill="rgba(11,58,109,0.12)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">{bilingual('श्रेणी अनुसार', 'By Category')}</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#0b3a6d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">{bilingual('स्थिति अनुसार', 'By Status')}</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">{bilingual('विभाग अनुसार', 'By Module')}</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={moduleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {moduleData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">{bilingual('प्राथमिकता अनुसार', 'By Priority')}</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary-light)" /> {bilingual('AI अंतर्दृष्टि एवं विश्लेषण', 'AI Insights & Analysis')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="card" style={{ padding: '1rem', background: 'var(--surface-3)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                📊 <strong>{categoryLabel('Waste Management')}</strong> {bilingual(
                  `सर्वाधिक दर्ज की गई श्रेणी है (${stats.by_category['Waste Management'] || 0} शिकायतें), जो नगर निगम के लिए प्राथमिकता क्षेत्र है।`,
                  `is the most frequently reported category with ${stats.by_category['Waste Management'] || 0} complaints, suggesting this is a priority area for Rewa.`
                )}
              </p>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'var(--surface-3)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                💧 <strong>{bilingual('जल संबंधित शिकायतें', 'Water-related complaints')}</strong> {bilingual(
                  `(लीकेज + जलभराव) कुल ${(stats.by_category['Water & Leakage'] || 0) + (stats.by_category['Waterlogging & Drainage'] || 0)} दर्ज हैं। जलरक्षक अनुभाग द्वारा त्वरित निराकरण किया जा रहा है।`,
                  `(leakage + drainage) total ${(stats.by_category['Water & Leakage'] || 0) + (stats.by_category['Waterlogging & Drainage'] || 0)} reports. JalRakshak module is handling ${stats.by_module['jalrakshak'] || 0} complaints.`
                )}
              </p>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'var(--surface-3)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                ⚠️ <strong>{stats.high_priority} {bilingual('उच्च प्राथमिकता शिकायतें', 'high-priority complaints')}</strong> {bilingual(
                  `तत्काल कार्रवाई योग्य हैं। कुल समाधान दर वर्तमान में ${resolutionRate}% है।`,
                  `require immediate attention. Resolution rate is currently at ${resolutionRate}%.`
                )}
              </p>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              * {bilingual('यह विश्लेषण उपलब्ध डेमो डेटा पर आधारित है।', 'Insights are based on available demo complaint data.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
