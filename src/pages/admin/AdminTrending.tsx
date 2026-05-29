import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Activity, Users, MessageSquare, Star } from 'lucide-react';

export default function AdminTrending() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'trending-metrics'],
    queryFn: async () => {
      const [users, groups, posts, events] = await Promise.all([
        supabase.from('ir_users').select('id', { count: 'exact', head: true }),
        supabase.from('ir_groups').select('id', { count: 'exact', head: true }),
        supabase.from('ir_official_posts').select('id', { count: 'exact', head: true }),
        supabase.from('ir_content_details').select('id', { count: 'exact', head: true }),
      ]);
      const { data: topGroups } = await supabase.from('ir_groups').select('title, max_members').order('max_members', { ascending: false }).limit(5);
      const { data: topEvents } = await supabase.from('ir_content_details').select('title, impression').order('impression', { ascending: false }).limit(5);
      return {
        counts: { users: users.count || 0, groups: groups.count || 0, posts: posts.count || 0, events: events.count || 0 },
        topGroups: topGroups || [], topEvents: topEvents || [],
      };
    },
  });

  const th: React.CSSProperties = { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: data?.counts.users, icon: <Users size={16} /> },
    { label: 'Active Groups', value: data?.counts.groups, icon: <MessageSquare size={16} /> },
    { label: 'Official Posts', value: data?.counts.posts, icon: <Star size={16} /> },
    { label: 'Events', value: data?.counts.events, icon: <Activity size={16} /> },
  ];

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Trending Metrics</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Platform-wide activity and statistics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 30, height: 30, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px', color: '#ececec' }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#555', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Top Groups */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #111' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' }}>Top Groups (Capacity)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #111' }}><th style={th}>Group</th><th style={{ ...th, textAlign: 'right' }}>Capacity</th></tr></thead>
            <tbody>
              {data?.topGroups.map((g, i) => (
                <tr key={i} style={{ borderBottom: i < data.topGroups.length - 1 ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px', fontSize: 12, color: '#c0c0c0', fontWeight: 500 }}>{g.title}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555', textAlign: 'right' }}>{g.max_members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Events */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #111' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' }}>Trending Events (Impressions)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #111' }}><th style={th}>Event</th><th style={{ ...th, textAlign: 'right' }}>Views</th></tr></thead>
            <tbody>
              {data?.topEvents.map((e, i) => (
                <tr key={i} style={{ borderBottom: i < data.topEvents.length - 1 ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px', fontSize: 12, color: '#c0c0c0', fontWeight: 500 }}>{e.title}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#22c55e', textAlign: 'right' }}>{e.impression}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
