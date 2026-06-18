import { useEffect, useState, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { Users, Clock, BarChart2 } from 'lucide-react';

interface CheckinRow {
  id: number;
  user_id: number;
  checked_in_at: string;
  day_index: number;
  ir_users: { display_name: string; photo: string | null; username: string } | null;
}

export default function EOCheckinDashboard() {
  const { eventSlug } = useParams({ strict: false }) as { eventSlug: string };
  const [total, setTotal] = useState(0);
  const [perDay, setPerDay] = useState<Record<number, number>>({});
  const [feed, setFeed] = useState<CheckinRow[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchData = async () => {
    const { count } = await supabase.from('ir_event_checkins').select('id', { count: 'exact', head: true }).eq('event_slug', eventSlug);
    setTotal(count ?? 0);

    const { data: feedData } = await supabase
      .from('ir_event_checkins')
      .select('id, user_id, checked_in_at, day_index, ir_users(display_name, photo, username)')
      .eq('event_slug', eventSlug)
      .order('checked_in_at', { ascending: false })
      .limit(50);
    setFeed((feedData as unknown as CheckinRow[]) ?? []);

    const { data: allCheckins } = await supabase.from('ir_event_checkins').select('day_index').eq('event_slug', eventSlug);
    const pd: Record<number, number> = {};
    (allCheckins ?? []).forEach((r) => { pd[r.day_index] = (pd[r.day_index] ?? 0) + 1; });
    setPerDay(pd);
  };

  useEffect(() => {
    if (!eventSlug) return;
    fetchData();
    const channel = supabase
      .channel(`checkins-${eventSlug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ir_event_checkins', filter: `event_slug=eq.${eventSlug}` }, () => { fetchData(); })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [eventSlug]);

  const perDayEntries = Object.entries(perDay).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={15} style={{ color: '#555' }} />
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px' }}>Check-in Dashboard</h1>
        <span style={{ fontSize: 11, color: '#484848' }}>— {eventSlug}</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: perDayEntries.length > 1 ? '1fr 1fr' : '1fr', gap: 10, maxWidth: 520 }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>Total Check-ins</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1.5px', color: '#ececec' }}>{total}</div>
        </div>
        {perDayEntries.length > 1 && (
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <BarChart2 size={11} /> Per Day
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {perDayEntries.map(([day, count]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#555' }}>Day {Number(day) + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#d0d0d0' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live feed */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden', maxWidth: 520 }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} className="ds-pulse" />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' }}>Live Feed</span>
        </div>
        {feed.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 11, color: '#333' }}>No check-ins yet.</div>
        ) : (
          <div>
            {feed.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < feed.length - 1 ? '1px solid #0f0f0f' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', border: '1px solid #1e1e1e', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.ir_users?.photo ? (
                    <img
                      src={row.ir_users.photo.startsWith('http') ? row.ir_users.photo : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${row.ir_users.photo}`}
                      alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: '#555' }}>{row.ir_users?.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ir_users?.display_name ?? 'Unknown'}</div>
                  <div style={{ fontSize: 10, color: '#484848' }}>@{row.ir_users?.username ?? '-'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#484848', flexShrink: 0 }}>
                  <Clock size={10} />
                  {new Date(row.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {perDayEntries.length > 1 && (
                    <span style={{ color: '#22c55e', marginLeft: 2 }}>Day {row.day_index + 1}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
