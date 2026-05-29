import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const ds = {
  page: { padding: '24px 28px 48px' } as React.CSSProperties,
  topbar: { marginBottom: 20 } as React.CSSProperties,
  title: { fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 } as React.CSSProperties,
  subtitle: { fontSize: 11, color: '#555', marginTop: 4 } as React.CSSProperties,
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 } as React.CSSProperties,
  statCard: { background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties,
  statLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#444' } as React.CSSProperties,
  statValue: { fontSize: 28, fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1, color: '#ececec' } as React.CSSProperties,
  statValueAlert: { fontSize: 28, fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1, color: '#e05050' } as React.CSSProperties,
  tableWrap: { background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' } as React.CSSProperties,
  sectionHead: { padding: '12px 18px', borderBottom: '1px solid #111' } as React.CSSProperties,
  sectionHeadLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' } as React.CSSProperties,
  th: { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' } as React.CSSProperties,
};

function StatCard({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div style={ds.statCard}>
      <div style={{ ...ds.statLabel, color: alert ? '#5a2020' : '#444' }}>{label}</div>
      <div style={alert ? ds.statValueAlert : ds.statValue}>{value}</div>
    </div>
  );
}

function Avatar({ name }: { name?: string }) {
  return (
    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#111', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#555', flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: totalUsers } = useQuery({
    queryKey: ['admin', 'total-users'],
    queryFn: async () => {
      const { count } = await supabase.from('ir_users').select('*', { count: 'exact', head: true }).is('deleted_at', null);
      return count || 0;
    },
  });
  const { data: newUsersToday } = useQuery({
    queryKey: ['admin', 'new-users-today'],
    queryFn: async () => {
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const { count } = await supabase.from('ir_users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).is('deleted_at', null);
      return count || 0;
    },
  });
  const { data: newUsersWeek } = useQuery({
    queryKey: ['admin', 'new-users-week'],
    queryFn: async () => {
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const { count } = await supabase.from('ir_users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo).is('deleted_at', null);
      return count || 0;
    },
  });
  const { data: totalEvents } = useQuery({
    queryKey: ['admin', 'total-events'],
    queryFn: async () => {
      const { count } = await supabase.from('ir_content_details').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });
  const { data: trendingEvents } = useQuery({
    queryKey: ['admin', 'trending-events'],
    queryFn: async () => {
      const { count } = await supabase.from('ir_content_details').select('*', { count: 'exact', head: true }).eq('is_trending', 1);
      return count || 0;
    },
  });
  const { data: pendingReports } = useQuery({
    queryKey: ['admin', 'pending-reports'],
    queryFn: async () => {
      const { count } = await supabase.from('ir_reported_users').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });
  const { data: recentUsers } = useQuery({
    queryKey: ['admin', 'recent-users'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_users').select('id, display_name, username, photo, email, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(8);
      return data || [];
    },
  });

  const formatDate = (epoch: number) =>
    new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const stats = [
    { label: 'Total Users', value: totalUsers ?? '…' },
    { label: 'New Today', value: newUsersToday ?? '…' },
    { label: 'New This Week', value: newUsersWeek ?? '…' },
    { label: 'Total Events', value: totalEvents ?? '…' },
    { label: 'Trending Events', value: trendingEvents ?? '…' },
    { label: 'Reports', value: pendingReports ?? '…', alert: true },
  ];

  return (
    <div style={ds.page}>
      <div style={ds.topbar}>
        <h1 style={ds.title}>Dashboard</h1>
        <p style={ds.subtitle}>Platform overview</p>
      </div>

      <div style={ds.statsGrid}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={ds.tableWrap}>
        <div style={ds.sectionHead}>
          <span style={ds.sectionHeadLabel}>Recent Registrations</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                {['User', 'Email', 'Joined'].map((h) => (
                  <th key={h} style={ds.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers?.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < (recentUsers.length - 1) ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={user.display_name} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#d8d8d8' }}>{user.display_name}</div>
                        <div style={{ fontSize: 10, color: '#484848' }}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555' }}>{user.email}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#484848' }}>
                    {user.created_at ? formatDate(user.created_at) : '—'}
                  </td>
                </tr>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <tr><td colSpan={3} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#333' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
