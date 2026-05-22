import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Styles ──────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px',
};
const panelTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 16,
};
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px',
  textTransform: 'uppercase', marginBottom: 10, marginTop: 28,
};
const th: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 500,
  color: '#444', letterSpacing: '0.7px', textTransform: 'uppercase',
  borderBottom: '1px solid #111',
};
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 11, color: '#888', borderBottom: '1px solid #0a0a0a' };

const CHART_COLORS = {
  male: '#4a9eff',
  female: '#ff6b9d',
  unknown: '#333',
  ios: '#a8d4ff',
  android: '#a8ffb0',
  bar: '#e8e8e8',
  line: '#4a9eff',
  green: '#4caf50',
};

const SOURCE_COLORS: Record<string, string> = {
  homepage: '#4a9eff',
  share: '#e8e8e8',
  trending: '#f0a500',
  search: '#4caf50',
  direct: '#555',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ h = 60, w = '100%' }: { h?: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w, background: '#0f0f0f', borderRadius: 4,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, badge }: { label: string; value: string | number; sub?: string; badge?: string }) {
  return (
    <div style={panel}>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: '#ececec', letterSpacing: '-1px', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>{sub}</div>}
      {badge && <div style={{ display: 'inline-block', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#0d1f0d', color: '#4caf50', marginTop: 6 }}>{badge}</div>}
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function HourHeatmap({ data }: { data: { hour: number; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i);
    return { hour: i, count: found?.count ?? 0 };
  });

  const getColor = (count: number) => {
    const pct = count / maxCount;
    if (pct === 0) return '#111';
    if (pct < 0.25) return '#1a2e1a';
    if (pct < 0.5) return '#2d4d2d';
    if (pct < 0.75) return 'rgba(76,175,80,0.5)';
    return 'rgba(76,175,80,0.9)';
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
        {hours.map(h => (
          <div
            key={h.hour}
            title={`${h.hour}:00 — ${h.count} check-ins`}
            style={{ aspectRatio: '1', borderRadius: 2, background: getColor(h.count), cursor: 'default' }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, marginTop: 3 }}>
        {hours.map(h => (
          <div key={h.hour} style={{ fontSize: 7, color: '#333', textAlign: 'center' }}>
            {h.hour % 6 === 0 ? h.hour : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#ccc' }}>
      <div style={{ color: '#555', fontSize: 10, marginBottom: 2 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i}>{p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function EOAnalytics() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [growthFilter, setGrowthFilter] = useState<'7d' | '30d' | 'all'>('30d');

  // Fetch EO events for selector chips
  const { data: events } = useQuery({
    queryKey: ['eo', 'events-list', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!eoId,
  });

  // Fetch analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['eo', 'analytics', eoId, selectedSlug],
    queryFn: async () => {
      const url = selectedSlug ? `/api/eo/analytics/${selectedSlug}` : '/api/eo/analytics';
      const res = await api.get(url);
      return res.data?.data ?? null;
    },
    enabled: !!eoId,
  });

  // Filter follower growth by time range
  const filteredGrowth = (() => {
    const growth: { date: string; cumulative_count: number }[] = analytics?.follower_growth ?? [];
    if (growthFilter === 'all') return growth;
    const days = growthFilter === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return growth.filter(r => new Date(r.date) >= cutoff);
  })();

  // Gender pie data
  const genderData = [
    { name: 'Male', value: analytics?.demographics?.gender?.male ?? 0, color: CHART_COLORS.male },
    { name: 'Female', value: analytics?.demographics?.gender?.female ?? 0, color: CHART_COLORS.female },
    { name: 'Unknown', value: analytics?.demographics?.gender?.unknown ?? 0, color: CHART_COLORS.unknown },
  ].filter(d => d.value > 0);

  // Age bar data
  const ageData = [
    { name: '<18', value: analytics?.demographics?.age_brackets?.under_18 ?? 0 },
    { name: '18–24', value: analytics?.demographics?.age_brackets?.['18_24'] ?? 0 },
    { name: '25–34', value: analytics?.demographics?.age_brackets?.['25_34'] ?? 0 },
    { name: '35+', value: analytics?.demographics?.age_brackets?.['35_plus'] ?? 0 },
  ];

  // Traffic sources bar data
  const sourceData = ['homepage', 'share', 'trending', 'search', 'direct'].map(s => ({
    name: s,
    value: analytics?.traffic_sources?.[s] ?? 0,
  }));

  // Platform totals
  const iosCount = analytics?.platform_split?.ios ?? 0;
  const androidCount = analytics?.platform_split?.android ?? 0;
  const platformTotal = iosCount + androidCount || 1;

  // Cities
  const topCities: { city_name: string; province_name: string; count: number }[] = analytics?.demographics?.top_cities ?? [];
  const maxCityCount = topCities[0]?.count || 1;

  // Content
  const imgBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

  return (
    <div style={{ padding: '24px 28px 64px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Event Analytics</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Sponsor-ready metrics · internal data</p>
      </div>

      {/* Event selector chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          onClick={() => setSelectedSlug(null)}
          style={{
            padding: '5px 12px', borderRadius: 4, border: `1px solid ${!selectedSlug ? '#e8e8e8' : '#1e1e1e'}`,
            background: !selectedSlug ? '#111' : '#0a0a0a', color: !selectedSlug ? '#e8e8e8' : '#666',
            fontSize: 11, cursor: 'pointer',
          }}
        >
          All Events
        </button>
        {events?.map(e => (
          <button
            key={e.slug}
            onClick={() => setSelectedSlug(e.slug)}
            style={{
              padding: '5px 12px', borderRadius: 4, border: `1px solid ${selectedSlug === e.slug ? '#e8e8e8' : '#1e1e1e'}`,
              background: selectedSlug === e.slug ? '#111' : '#0a0a0a', color: selectedSlug === e.slug ? '#e8e8e8' : '#666',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {e.title}
          </button>
        ))}
      </div>

      {/* ── Audience Overview ── */}
      <div style={sectionLabel as any}>Audience Overview</div>
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} h={90} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <StatCard label="Total Followers" value={analytics?.followers ?? 0} badge={analytics?.followers > 0 ? 'followers' : undefined} />
          <StatCard label="Unique Check-ins" value={analytics?.checkins ?? 0} sub={`across ${selectedSlug ? '1 event' : `${events?.length ?? 0} events`}`} />
          <StatCard label="Follow → Checkin" value={`${analytics?.conversion_rate ?? 0}%`} sub="industry avg ~20%" />
          <StatCard label="Event Detail Views" value={analytics?.total_impressions ?? 0} sub="unique impressions" />
        </div>
      )}

      {/* ── Traffic Sources + Platform ── */}
      <div style={sectionLabel as any}>Traffic Sources & Platform</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Traffic Sources */}
        <div style={panel}>
          <div style={panelTitle}>Where users find your events</div>
          {isLoading ? <Skeleton h={120} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sourceData.map(s => {
                const total = sourceData.reduce((a, b) => a + b.value, 0) || 1;
                const pct = Math.round((s.value / total) * 100);
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 70, fontSize: 10, color: '#666', textAlign: 'right', textTransform: 'capitalize' }}>{s.name}</div>
                    <div style={{ flex: 1, background: '#111', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: SOURCE_COLORS[s.name] ?? '#555', width: `${pct}%` }} />
                    </div>
                    <div style={{ width: 32, fontSize: 10, color: '#555', textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform + timeline */}
        <div style={panel}>
          <div style={panelTitle}>Platform split</div>
          {isLoading ? <Skeleton h={60} /> : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'iOS', count: iosCount, color: CHART_COLORS.ios },
                  { label: 'Android', count: androidCount, color: CHART_COLORS.android },
                ].map(p => (
                  <div key={p.label} style={{ flex: 1, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 6, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', color: p.color }}>
                      {Math.round((p.count / platformTotal) * 100)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{p.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>Event detail visits / day</div>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={analytics?.impressions_per_day ?? []}>
                  <Line type="monotone" dataKey="count" stroke={CHART_COLORS.line} strokeWidth={1.5} dot={false} />
                  <Tooltip content={<DarkTooltip />} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>

      {/* ── Demographics ── */}
      <div style={sectionLabel as any}>Audience Demographics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>

        {/* Gender donut */}
        <div style={panel}>
          <div style={panelTitle}>Gender split (followers)</div>
          {isLoading ? <Skeleton h={100} /> : genderData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <PieChart width={90} height={90}>
                <Pie data={genderData} cx={40} cy={40} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                  {genderData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {genderData.map(d => {
                  const total = genderData.reduce((a, b) => a + b.value, 0);
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#888' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      {d.name} · {Math.round((d.value / total) * 100)}%
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No data yet</div>
          )}
        </div>

        {/* Age brackets */}
        <div style={panel}>
          <div style={panelTitle}>Age distribution (followers)</div>
          {isLoading ? <Skeleton h={100} /> : (
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={ageData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" fill={CHART_COLORS.bar} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top cities */}
        <div style={panel}>
          <div style={panelTitle}>Top cities (followers)</div>
          {isLoading ? <Skeleton h={100} /> : topCities.length > 0 ? (
            <div>
              {topCities.slice(0, 6).map(c => (
                <div key={c.city_name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #0f0f0f' }}>
                  <div style={{ fontSize: 11, color: '#888', flex: 1 }}>{c.city_name}</div>
                  <div style={{ width: 70, height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: CHART_COLORS.line, width: `${Math.round((c.count / maxCityCount) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#e8e8e8', fontWeight: 500, width: 36, textAlign: 'right' }}>{c.count.toLocaleString()}</div>
                </div>
              ))}
              {topCities.length === 0 && (
                <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No location data yet</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No location data yet</div>
          )}
        </div>
      </div>

      {/* ── Map placeholder ── */}
      <div style={sectionLabel as any}>Geographic Map</div>
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: '#333', gap: 6 }}>
        <svg width="280" height="80" viewBox="0 0 280 80" style={{ opacity: 0.12 }}>
          <ellipse cx="60" cy="38" rx="52" ry="22" fill="#4a9eff" />
          <ellipse cx="148" cy="42" rx="36" ry="18" fill="#4a9eff" />
          <ellipse cx="212" cy="38" rx="26" ry="16" fill="#4a9eff" />
          <ellipse cx="258" cy="36" rx="16" ry="12" fill="#4a9eff" />
          <circle cx="58" cy="38" r="9" fill="#4a9eff" opacity="0.8" />
          <circle cx="72" cy="33" r="5" fill="#4a9eff" opacity="0.5" />
          <circle cx="148" cy="42" r="12" fill="#4a9eff" opacity="0.7" />
          <circle cx="212" cy="38" r="5" fill="#4a9eff" opacity="0.4" />
        </svg>
        <div style={{ fontSize: 11, color: '#333' }}>Interactive map · bubble size = follower count per province</div>
        <div style={{ fontSize: 9, color: '#222' }}>Available after city coordinates are seeded in ir_citys</div>
      </div>

      {/* ── Check-in Timeline ── */}
      <div style={sectionLabel as any}>Check-in Timeline</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        <div style={panel}>
          <div style={panelTitle}>Check-ins per day</div>
          {isLoading ? <Skeleton h={80} /> : (
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={analytics?.checkins_per_day ?? []}>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#444' }} axisLine={false} tickLine={false} tickFormatter={d => d?.slice(5)} />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS.green} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={panel}>
          <div style={panelTitle}>Peak hours (0–23h)</div>
          {isLoading ? <Skeleton h={50} /> : (
            <HourHeatmap data={analytics?.checkins_per_hour ?? []} />
          )}
        </div>
      </div>

      {/* ── Follower Growth ── */}
      <div style={sectionLabel as any}>Follower Growth</div>
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={panelTitle}>Cumulative followers over time</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['7d', '30d', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setGrowthFilter(f)}
                style={{
                  fontSize: 9, padding: '3px 8px', border: `1px solid ${growthFilter === f ? '#333' : '#1a1a1a'}`,
                  borderRadius: 3, background: 'transparent', color: growthFilter === f ? '#e8e8e8' : '#555', cursor: 'pointer',
                }}
              >
                {f === '7d' ? '7D' : f === '30d' ? '30D' : 'All'}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? <Skeleton h={80} /> : (
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={filteredGrowth}>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#444' }} axisLine={false} tickLine={false} tickFormatter={d => d?.slice(5)} />
              <YAxis hide />
              <Tooltip content={<DarkTooltip />} />
              <Line type="monotone" dataKey="cumulative_count" stroke={CHART_COLORS.bar} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Content Engagement ── */}
      <div style={sectionLabel as any}>Content Engagement</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Top moments grid */}
        <div style={panel}>
          <div style={panelTitle}>Top moments (likes + comments)</div>
          {isLoading ? <Skeleton h={160} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {(analytics?.top_moments ?? []).slice(0, 9).map((m: any) => {
                const img = m.images?.[0]?.image;
                const url = img ? `${imgBase}${img}` : null;
                return (
                  <div key={m.slug} style={{ aspectRatio: '1', borderRadius: 4, overflow: 'hidden', position: 'relative', background: '#111' }}>
                    {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent,rgba(0,0,0,0.8))' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 9, color: '#ccc' }}>♥ {Number(m.total_likes).toLocaleString()}</span>
                        <span style={{ fontSize: 9, color: '#ccc' }}>💬 {Number(m.total_comments).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!analytics?.top_moments || analytics.top_moments.length === 0) && (
                <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No moments yet</div>
              )}
            </div>
          )}
        </div>

        {/* Top posts table */}
        <div style={panel}>
          <div style={panelTitle}>Top posts (likes + comments)</div>
          {isLoading ? <Skeleton h={160} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Caption</th>
                  <th style={{ ...th, textAlign: 'right' }}>Likes</th>
                  <th style={{ ...th, textAlign: 'right' }}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.top_posts ?? []).slice(0, 8).map((p: any, i: number) => (
                  <tr key={p.slug}>
                    <td style={{ ...td, color: '#444' }}>{i + 1}</td>
                    <td style={{ ...td, color: '#ccc', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.caption ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{Number(p.total_likes).toLocaleString()}</td>
                    <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{Number(p.total_comments).toLocaleString()}</td>
                  </tr>
                ))}
                {(!analytics?.top_posts || analytics.top_posts.length === 0) && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#333' }}>No posts yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Groups ── */}
      <div style={sectionLabel as any}>Groups</div>
      <div style={panel}>
        <div style={panelTitle}>Groups per event</div>
        {isLoading ? <Skeleton h={80} /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Group</th>
                <th style={th}>City</th>
                <th style={{ ...th, textAlign: 'right' }}>Members</th>
                <th style={{ ...th, textAlign: 'right' }}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.groups ?? []).map((g: any, i: number) => (
                <tr key={g.slug}>
                  <td style={{ ...td, color: '#ccc' }}>{g.title}</td>
                  <td style={td}>{g.city_name ?? '—'}</td>
                  <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{g.member_count}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{g.max_members ?? '∞'}</td>
                </tr>
              ))}
              {(!analytics?.groups || analytics.groups.length === 0) && (
                <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#333' }}>No groups yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
