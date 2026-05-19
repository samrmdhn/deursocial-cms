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
    const { count } = await supabase
      .from('ir_event_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('event_slug', eventSlug);
    setTotal(count ?? 0);

    const { data: feedData } = await supabase
      .from('ir_event_checkins')
      .select('id, user_id, checked_in_at, day_index, ir_users(display_name, photo, username)')
      .eq('event_slug', eventSlug)
      .order('checked_in_at', { ascending: false })
      .limit(50);
    setFeed((feedData as CheckinRow[]) ?? []);

    const { data: allCheckins } = await supabase
      .from('ir_event_checkins')
      .select('day_index')
      .eq('event_slug', eventSlug);
    const pd: Record<number, number> = {};
    (allCheckins ?? []).forEach((r) => { pd[r.day_index] = (pd[r.day_index] ?? 0) + 1; });
    setPerDay(pd);
  };

  useEffect(() => {
    if (!eventSlug) return;
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`checkins-${eventSlug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ir_event_checkins', filter: `event_slug=eq.${eventSlug}` }, () => {
        fetchData();
      })
      .subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [eventSlug]);

  const perDayEntries = Object.entries(perDay).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Users size={20} className="text-violet-400" />
        Check-in Dashboard
        <span className="text-sm text-slate-400 font-normal ml-1">— {eventSlug}</span>
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Total Check-ins</p>
          <p className="text-3xl font-bold text-violet-400">{total}</p>
        </div>
        {perDayEntries.length > 1 && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><BarChart2 size={12} /> Per Day</p>
            <div className="space-y-1">
              {perDayEntries.map(([day, count]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-slate-400">Day {Number(day) + 1}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live feed */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm font-semibold text-slate-200">Live feed</p>
        </div>
        {feed.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No check-ins yet.</p>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {feed.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden shrink-0">
                  {row.ir_users?.photo ? (
                    <img
                      src={row.ir_users.photo.startsWith('http') ? row.ir_users.photo : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${row.ir_users.photo}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      {row.ir_users?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{row.ir_users?.display_name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400">@{row.ir_users?.username ?? '-'}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                  <Clock size={11} />
                  {new Date(row.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {perDayEntries.length > 1 && (
                    <span className="ml-1 text-violet-400">Day {row.day_index + 1}</span>
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
