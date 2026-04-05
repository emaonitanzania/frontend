// src/pages/LeaderInsightsPage.jsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaderAPI, getLeaderToken, getLeaderProfile } from '../services/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  water: '#3b82f6',
  electricity: '#f59e0b',
  roads: '#6366f1',
  health: '#10b981',
  education: '#8b5cf6',
  security: '#ef4444',
  corruption: '#dc2626',
  housing: '#14b8a6',
  sanitation: '#84cc16',
  transportation: '#f97316',
  other: '#94a3b8',
};

const CATEGORY_LABELS = {
  water: 'Maji / Water',
  electricity: 'Umeme / Electricity',
  roads: 'Barabara / Roads',
  health: 'Afya / Health',
  education: 'Elimu / Education',
  security: 'Usalama / Security',
  corruption: 'Rushwa / Corruption',
  housing: 'Makazi / Housing',
  sanitation: 'Usafi / Sanitation',
  transportation: 'Usafiri / Transport',
  other: 'Nyingine / Other',
};

const URGENCY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const buildUrgencyCount = (complaints) => {
  const urgencyCount = { critical: 0, high: 0, medium: 0, low: 0 };
  complaints.forEach((complaint) => {
    const urgency = complaint?.urgency || 'medium';
    if (Object.prototype.hasOwnProperty.call(urgencyCount, urgency)) {
      urgencyCount[urgency] += 1;
    }
  });
  return urgencyCount;
};

// Estimate age group from complaint context (heuristic from keywords)
const guessAgeGroup = (complaint) => {
  const text = `${complaint.title} ${complaint.description}`.toLowerCase();
  if (/school|student|elimu|shule|darasa|mtoto|watoto|youth|vijana|young/i.test(text)) return '15-30';
  if (/pension|mzee|wazee|elder|retire/i.test(text)) return '60+';
  if (/job|kazi|ajira|employ|business|biashara|familia|family/i.test(text)) return '30-60';
  return '30-60'; // default working age
};

const computeInsights = (complaints) => {
  if (!complaints || !complaints.length) return null;

  // Category breakdown
  const categoryCount = {};
  complaints.forEach((c) => {
    const cat = c.category || 'other';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const total = complaints.length;
  const categories = Object.entries(categoryCount)
    .map(([cat, count]) => ({
      cat,
      count,
      pct: Math.round((count / total) * 100),
      color: CATEGORY_COLORS[cat] || '#94a3b8',
      label: CATEGORY_LABELS[cat] || cat,
    }))
    .sort((a, b) => b.count - a.count);

  // Age group breakdown
  const ageGroups = { '15-30': 0, '30-60': 0, '60+': 0 };
  complaints.forEach((c) => {
    const ag = guessAgeGroup(c);
    ageGroups[ag] = (ageGroups[ag] || 0) + 1;
  });

  // Urgency
  const urgencyCount = { critical: 0, high: 0, medium: 0, low: 0 };
  complaints.forEach((c) => {
    const u = c.urgency || 'medium';
    urgencyCount[u] = (urgencyCount[u] || 0) + 1;
  });

  // Status breakdown
  const statusCount = {};
  complaints.forEach((c) => {
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;
  });
  const pending = (statusCount['pending'] || 0) + (statusCount['submitted'] || 0) + (statusCount['ai_responded'] || 0);
  const inProgress = statusCount['in_progress'] || 0;
  const escalated = statusCount['escalated'] || 0;
  const resolved = statusCount['resolved'] || 0;

  // Satisfaction (resolved / total)
  const satisfactionPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Top category
  const topCategory = categories[0] || null;

  return {
    total,
    categories,
    ageGroups,
    urgencyCount,
    pending,
    inProgress,
    escalated,
    resolved,
    satisfactionPct,
    topCategory,
  };
};

const bucketAgeGroup = (ageGroup) => {
  if (!ageGroup) return null;
  if (ageGroup === 'Under 18' || ageGroup === '18-25') return '15-30';
  if (ageGroup === '60+') return '60+';
  return '30-60';
};

const normalizeInsights = (insightsPayload, complaints) => {
  if (!insightsPayload) return computeInsights(complaints);

  const summary = insightsPayload.summary || {};
  const accountability = insightsPayload.accountability || {};
  const satisfaction = insightsPayload.satisfaction || {};
  const distribution = Array.isArray(insightsPayload.age_group_insights?.distribution)
    ? insightsPayload.age_group_insights.distribution
    : [];
  const fallback = computeInsights(complaints) || {
    total: 0,
    categories: [],
    ageGroups: { '15-30': 0, '30-60': 0, '60+': 0 },
    urgencyCount: { critical: 0, high: 0, medium: 0, low: 0 },
    pending: 0,
    inProgress: 0,
    escalated: 0,
    resolved: 0,
    satisfactionPct: 0,
    topCategory: null,
  };

  const ageGroups = { '15-30': 0, '30-60': 0, '60+': 0 };
  distribution.forEach((item) => {
    const bucket = bucketAgeGroup(item.age_group);
    if (bucket) ageGroups[bucket] += Number(item.count || 0);
  });

  const categories = Array.isArray(insightsPayload.issue_breakdown)
    ? insightsPayload.issue_breakdown
        .map((item) => ({
          cat: item.category || 'other',
          count: Number(item.count || 0),
          pct: Math.round(Number(item.percentage || 0)),
          color: CATEGORY_COLORS[item.category] || '#94a3b8',
          label: CATEGORY_LABELS[item.category] || item.category || 'Other',
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  return {
    total: Number(summary.total_complaints || fallback.total || 0),
    categories: categories.length ? categories : fallback.categories,
    ageGroups: distribution.length ? ageGroups : fallback.ageGroups,
    urgencyCount: buildUrgencyCount(Array.isArray(complaints) ? complaints : []),
    pending: Number(summary.pending ?? fallback.pending ?? 0),
    inProgress: Number(summary.in_progress ?? fallback.inProgress ?? 0),
    escalated: Number(accountability.escalated_count ?? fallback.escalated ?? 0),
    resolved: Number(summary.resolved ?? fallback.resolved ?? 0),
    satisfactionPct: Math.round(Number(satisfaction.satisfaction_rate ?? fallback.satisfactionPct ?? 0)),
    topCategory: categories[0] || fallback.topCategory || null,
  };
};

const buildPieSlices = (data, total) => (
  data.reduce(
    (state, item) => {
      const nextCount = state.runningCount + item.count;
      const startAngle = (state.runningCount / total) * 2 * Math.PI - Math.PI / 2;
      const endAngle = (nextCount / total) * 2 * Math.PI - Math.PI / 2;

      return {
        runningCount: nextCount,
        slices: [...state.slices, { ...item, startAngle, endAngle }],
      };
    },
    { runningCount: 0, slices: [] },
  ).slices
);

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ dark, icon, label, value, sub, color = '#2563eb', isMobile }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const textMain = dark ? '#f1f5f9' : '#1e293b';

  return (
    <div
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: isMobile ? '14px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}18`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          <i className={`fas ${icon}`} />
        </div>
        <span style={{ fontSize: 13, color: textSub, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, color: textMain, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: textSub }}>{sub}</div>}
    </div>
  );
}

// Pie chart using SVG
function PieChart({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const slices = buildPieSlices(data, total);

  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = r * 0.52;

  const describeArc = (start, end) => {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    const ix1 = cx + innerR * Math.cos(end);
    const iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(start);
    const iy2 = cy + innerR * Math.sin(start);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => (
        <path
          key={i}
          d={describeArc(slice.startAngle, slice.endAngle)}
          fill={slice.color}
          stroke="transparent"
          strokeWidth={2}
          style={{ transition: 'opacity 0.2s' }}
        />
      ))}
    </svg>
  );
}

function BarRow({ label, count, color, dark, pct }) {
  const textSub = dark ? '#94a3b8' : '#64748b';
  const barBg = dark ? '#334155' : '#e2e8f0';
  const textMain = dark ? '#f1f5f9' : '#1e293b';

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: textMain, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: textSub, fontWeight: 600 }}>{count} ({pct}%)</span>
      </div>
      <div style={{ width: '100%', height: 8, borderRadius: 999, background: barBg, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 999,
            background: color,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LeaderInsightsPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const token = getLeaderToken();
  const cachedProfile = getLeaderProfile();

  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const sectionPad = isMobile ? '12px 10px' : '24px 30px';

  const insightsQuery = useQuery({
    queryKey: ['leader-insights', token],
    queryFn: () => leaderAPI.insights(),
    enabled: !!token,
  });

  const assignedQuery = useQuery({
    queryKey: ['leader-complaints', token],
    queryFn: () => leaderAPI.assignedComplaints(),
    enabled: !!token,
  });

  const insights = useMemo(
    () => normalizeInsights(insightsQuery.data, assignedQuery.data || []),
    [assignedQuery.data, insightsQuery.data],
  );

  if (!token) {
    return (
      <>
        <PageHeader dark={dark} isMobile={isMobile} title={tr('Insights', 'Maarifa')} subtitle={tr('Leader analytics dashboard', 'Dashibodi ya takwimu za kiongozi')} />
        <div style={{ padding: sectionPad }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 20, color: textSub, fontSize: 14 }}>
            {tr('Please log in as a leader to view insights.', 'Tafadhali ingia kama kiongozi ili kuona maarifa.')}
          </div>
        </div>
      </>
    );
  }

  if (assignedQuery.isLoading || insightsQuery.isLoading) {
    return (
      <>
        <PageHeader dark={dark} isMobile={isMobile} title={tr('Insights', 'Maarifa')} subtitle={tr('Loading your analytics...', 'Inapakia takwimu zako...')} />
        <div style={{ padding: sectionPad, display: 'flex', alignItems: 'center', gap: 10, color: textSub }}>
          <i className="fas fa-spinner fa-spin" /> {tr('Loading data...', 'Inapakia data...')}
        </div>
      </>
    );
  }

  if ((assignedQuery.isError && !assignedQuery.data) || !insights) {
    return (
      <>
        <PageHeader dark={dark} isMobile={isMobile} title={tr('Insights', 'Maarifa')} subtitle="" />
        <div style={{ padding: sectionPad }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 20, color: '#ef4444', fontSize: 14 }}>
            {tr('No complaint data available yet.', 'Bado hakuna data ya malalamiko.')}
          </div>
        </div>
      </>
    );
  }

  const gridCols = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr';
  const twoColGrid = isMobile ? '1fr' : '1fr 1fr';

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Insights', 'Maarifa')}
        subtitle={tr(
          `Analytics for ${cachedProfile?.full_name || 'your area'} — ${cachedProfile?.location || ''}`,
          `Takwimu za ${cachedProfile?.full_name || 'eneo lako'} — ${cachedProfile?.location || ''}`,
        )}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: sectionPad, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12 }}>
          <MetricCard dark={dark} isMobile={isMobile} icon="fa-inbox" label={tr('Total Complaints', 'Jumla ya Malalamiko')} value={insights.total} sub={tr('received in your area', 'yaliyopokelewa eneo lako')} color="#2563eb" />
          <MetricCard dark={dark} isMobile={isMobile} icon="fa-clock" label={tr('Pending', 'Yanayosubiri')} value={insights.pending} sub={tr('awaiting response', 'yanasubiri majibu')} color="#f59e0b" />
          <MetricCard dark={dark} isMobile={isMobile} icon="fa-arrow-up" label={tr('Escalated', 'Zilizopandishwa')} value={insights.escalated} sub={tr('sent to higher level', 'zilizopelekwa ngazi ya juu')} color="#ef4444" />
          <MetricCard dark={dark} isMobile={isMobile} icon="fa-check-circle" label={tr('Resolved', 'Zilizoshughulikiwa')} value={insights.resolved} sub={`${insights.satisfactionPct}% ${tr('satisfaction rate', 'kiwango cha ridhaa')}`} color="#10b981" />
        </div>

        {/* ── Category Breakdown + Pie ── */}
        <div style={{ display: 'grid', gridTemplateColumns: twoColGrid, gap: 16 }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: isMobile ? 14 : 20 }}>
            <SectionTitle dark={dark} icon="fa-chart-pie" label={tr('Main Concerns in Your Area', 'Kero Kuu za Eneo Lako')} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flexShrink: 0 }}>
                <PieChart data={insights.categories} size={isMobile ? 140 : 170} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {insights.categories.slice(0, 6).map((c) => (
                  <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: textMain, flex: 1 }}>{c.label}</span>
                    <span style={{ fontSize: 12, color: textSub, fontWeight: 700 }}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {insights.topCategory && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: `${insights.topCategory.color}18`,
                  border: `1px solid ${insights.topCategory.color}44`,
                  fontSize: 13,
                  color: textMain,
                }}
              >
                <i className="fas fa-exclamation-circle" style={{ color: insights.topCategory.color, marginRight: 8 }} />
                <strong>{tr('Top concern', 'Kero kubwa zaidi')}:</strong> {insights.topCategory.label} — {insights.topCategory.pct}% {tr('of all complaints', 'ya malalamiko yote')}
              </div>
            )}
          </div>

          {/* ── Satisfaction Gauge ── */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: isMobile ? 14 : 20 }}>
            <SectionTitle dark={dark} icon="fa-star" label={tr('Response Satisfaction Rate', 'Kiwango cha Ridhaa ya Majibu')} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 8 }}>
              <SatisfactionGauge pct={insights.satisfactionPct} dark={dark} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: textSub, marginBottom: 6 }}>
                  {tr('Based on complaints resolved vs total received', 'Kulingana na malalamiko yaliyoshughulikiwa dhidi ya yote yaliyopokelewa')}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: insights.satisfactionPct >= 70 ? '#10b981' : insights.satisfactionPct >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {insights.satisfactionPct >= 70
                    ? tr('✓ Good performance — citizens feel heard.', '✓ Utendaji mzuri — wananchi wanahisi kusikika.')
                    : insights.satisfactionPct >= 40
                    ? tr('⚠ Average — room for improvement.', '⚠ Wastani — kuna nafasi ya kuboresha.')
                    : tr('✗ Low satisfaction — more responses needed.', '✗ Ridhaa ndogo — majibu zaidi yanahitajika.')}
                </div>
              </div>
            </div>

            {/* Urgency breakdown */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textMain, marginBottom: 10 }}>
                {tr('Urgency Distribution', 'Mgawanyo wa Uharaka')}
              </div>
              {Object.entries(insights.urgencyCount).map(([urgency, count]) => (
                <BarRow
                  key={urgency}
                  dark={dark}
                  label={urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  count={count}
                  total={insights.total}
                  color={URGENCY_COLORS[urgency]}
                  pct={insights.total > 0 ? Math.round((count / insights.total) * 100) : 0}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Age Groups & Topics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: twoColGrid, gap: 16 }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: isMobile ? 14 : 20 }}>
            <SectionTitle dark={dark} icon="fa-users" label={tr('Age Groups Raising Complaints', 'Makundi ya Umri Yanayoleta Malalamiko')} />
            <div style={{ marginTop: 8 }}>
              {Object.entries(insights.ageGroups).map(([group, count]) => {
                const pct = insights.total > 0 ? Math.round((count / insights.total) * 100) : 0;
                const colors = { '15-30': '#8b5cf6', '30-60': '#2563eb', '60+': '#10b981' };
                const labels = {
                  '15-30': tr('Youth (15–30)', 'Vijana (15–30)'),
                  '30-60': tr('Adults (30–60)', 'Watu Wazima (30–60)'),
                  '60+': tr('Elders (60+)', 'Wazee (60+)'),
                };
                return (
                  <div key={group} style={{ marginBottom: 16 }}>
                    <BarRow dark={dark} label={labels[group]} count={count} total={insights.total} color={colors[group]} pct={pct} />
                    <div style={{ fontSize: 11.5, color: textSub, marginTop: 2, marginLeft: 2 }}>
                      {group === '15-30' && tr('Mostly: education, jobs, youth services', 'Zaidi: elimu, ajira, huduma za vijana')}
                      {group === '30-60' && tr('Mostly: water, roads, electricity, housing', 'Zaidi: maji, barabara, umeme, makazi')}
                      {group === '60+' && tr('Mostly: health, pension, sanitation', 'Zaidi: afya, pensheni, usafi')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 6,
                padding: '10px 12px',
                borderRadius: 8,
                background: dark ? '#0f172a' : '#f1f5f9',
                border: `1px solid ${border}`,
                fontSize: 12.5,
                color: textSub,
                lineHeight: 1.6,
              }}
            >
              <i className="fas fa-lightbulb" style={{ color: '#f59e0b', marginRight: 6 }} />
              {tr(
                'Tip: Addressing youth-focused issues (jobs, education) early can reduce long-term complaint volume.',
                'Kidokezo: Kushughulikia masuala ya vijana (ajira, elimu) mapema kunaweza kupunguza malalamiko kwa muda mrefu.',
              )}
            </div>
          </div>

          {/* Pending & Accountability */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: isMobile ? 14 : 20 }}>
            <SectionTitle dark={dark} icon="fa-balance-scale" label={tr('Accountability Overview', 'Muhtasari wa Uwajibikaji')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <AccountabilityRow
                dark={dark}
                icon="fa-hourglass-half"
                label={tr('Pending (no response yet)', 'Yanayosubiri (bila majibu)')}
                value={insights.pending}
                total={insights.total}
                color="#f59e0b"
                note={insights.pending > 5 ? tr('High — needs immediate attention', 'Nyingi — zinahitaji umakini wa haraka') : tr('Within acceptable range', 'Kiko katika kiwango kinachokubalika')}
              />
              <AccountabilityRow
                dark={dark}
                icon="fa-spinner"
                label={tr('In Progress', 'Zinazoendelea')}
                value={insights.inProgress}
                total={insights.total}
                color="#3b82f6"
                note={tr('Being actively handled', 'Zinashughulikiwa kwa wakati huu')}
              />
              <AccountabilityRow
                dark={dark}
                icon="fa-level-up-alt"
                label={tr('Escalated to higher level', 'Zilizopandishwa ngazi ya juu')}
                value={insights.escalated}
                total={insights.total}
                color="#ef4444"
                note={insights.escalated > 0
                  ? tr('These left without local resolution', 'Hizi ziliondoka bila suluhisho la eneo')
                  : tr('None escalated — excellent!', 'Hakuna iliyopandishwa — vizuri sana!')}
              />
              <AccountabilityRow
                dark={dark}
                icon="fa-check-double"
                label={tr('Resolved & Closed', 'Zilizoshughulikiwa na Kufungwa')}
                value={insights.resolved}
                total={insights.total}
                color="#10b981"
                note={tr('Successfully addressed', 'Zimeshughulikiwa kwa mafanikio')}
              />
            </div>

            {insights.escalated > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: dark ? '#450a0a' : '#fef2f2',
                  border: dark ? '1px solid #991b1b' : '1px solid #fca5a5',
                  fontSize: 12.5,
                  color: dark ? '#fca5a5' : '#991b1b',
                  lineHeight: 1.6,
                }}
              >
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />
                {insights.escalated} {tr('complaint(s) were escalated after receiving no response. Addressing pending complaints promptly avoids escalation.', 'malalamiko yalipandishwa ngazi baada ya kutopata majibu. Kushughulikia malalamiko mapema kunazuia kupanda ngazi.')}
              </div>
            )}
          </div>
        </div>

        {/* ── Category Detail Bars ── */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: isMobile ? 14 : 20 }}>
          <SectionTitle dark={dark} icon="fa-chart-bar" label={tr('All Category Breakdown', 'Mgawanyo wa Kategoria Zote')} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '4px 24px',
              marginTop: 8,
            }}
          >
            {insights.categories.map((c) => (
              <BarRow
                key={c.cat}
                dark={dark}
                label={c.label}
                count={c.count}
                total={insights.total}
                color={c.color}
                pct={c.pct}
              />
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function PageHeader({ dark, isMobile, title, subtitle }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ padding: isMobile ? '14px 14px' : '18px 30px', background: surface, borderBottom: `1px solid ${border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
      <div style={{ fontWeight: 600, fontSize: isMobile ? 20 : 22, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: isMobile ? 13 : 14, color: textSub }}>{subtitle}</div>
    </div>
  );
}

function SectionTitle({ dark, icon, label }) {
  const textMain = dark ? '#f1f5f9' : '#1e293b';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <i className={`fas ${icon}`} style={{ color: '#2563eb', fontSize: 14 }} />
      <span style={{ fontSize: 14.5, fontWeight: 700, color: textMain }}>{label}</span>
    </div>
  );
}

function SatisfactionGauge({ pct, dark }) {
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const trackColor = dark ? '#1f2937' : '#e2e8f0';
  const textMain = dark ? '#f1f5f9' : '#1e293b';

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={radius} fill="none" stroke={trackColor} strokeWidth={12} />
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 800, color: textMain, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>resolved</span>
      </div>
    </div>
  );
}

function AccountabilityRow({ dark, icon, label, value, total, color, note }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const barBg = dark ? '#334155' : '#e2e8f0';

  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: dark ? '#0f172a' : '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <i className={`fas ${icon}`} style={{ color, width: 16, textAlign: 'center', fontSize: 13 }} />
        <span style={{ fontSize: 13, color: textMain, fontWeight: 500, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 999, background: barBg, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 11.5, color: textSub }}>{note}</div>
    </div>
  );
}