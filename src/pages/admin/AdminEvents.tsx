import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { Search, TrendingUp, ChevronLeft, ChevronRight, ExternalLink, Image, Plus, CircleCheck, CircleX } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Ended',    color: '#555' },
  1: { label: 'Ongoing',  color: '#22c55e' },
  2: { label: 'Upcoming', color: '#60a5fa' },
};
const APPROVAL_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: '#f59e0b' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

const inp: React.CSSProperties = { padding: '8px 12px 8px 30px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', width: 220 };
const th: React.CSSProperties = { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };

export default function AdminEvents() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'ended' | 'pending' | 'rejected' | 'trending'>('all');
  const limit = 15;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', search, page, filter],
    queryFn: async () => {
      let q = supabase.from('ir_content_details').select(`id, title, slug, image, status, approval_status, is_visible, is_trending, schedule_start, date_start, date_end, vanues_id, event_organizers_id`, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      if (search) q = q.ilike('title', `%${search}%`);
      if (filter === 'trending') q = q.eq('is_trending', 1);
      if (filter === 'upcoming') q = q.eq('status', 2).eq('approval_status', 'approved');
      if (filter === 'ongoing')  q = q.eq('status', 1).eq('approval_status', 'approved');
      if (filter === 'ended')    q = q.eq('status', 0);
      if (filter === 'pending')  q = q.eq('approval_status', 'pending');
      if (filter === 'rejected') q = q.eq('approval_status', 'rejected');
      const { data: rows, count } = await q;
      const eoIds = [...new Set((rows || []).map((e) => e.event_organizers_id).filter(Boolean))];
      const venueIds = [...new Set((rows || []).map((e) => e.vanues_id).filter(Boolean))];
      let eoMap: Record<number, string> = {};
      let venueMap: Record<number, string> = {};
      if (eoIds.length) { const { data: eos } = await supabase.from('ir_event_organizers').select('id, name').in('id', eoIds); eoMap = Object.fromEntries((eos || []).map((e) => [e.id, e.name])); }
      if (venueIds.length) { const { data: venues } = await supabase.from('ir_vanues').select('id, title').in('id', venueIds); venueMap = Object.fromEntries((venues || []).map((v) => [v.id, v.title])); }
      return { events: (rows || []).map((e) => ({ ...e, eo_name: eoMap[e.event_organizers_id] || '—', venue_name: venueMap[e.vanues_id] || '—' })), total: count || 0 };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: number }) => {
      const { error } = await supabase.from('ir_content_details').update({ [field]: value, updated_at: Math.floor(Date.now() / 1000) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }); toast.success('Updated'); },
    onError: () => toast.error('Failed'),
  });

  const { sorted: sortedEvents, toggleSort, SortIcon } = useTableSort(data?.events, 'created_at' as any, 'desc');
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      {/* Topbar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Events</h1>
            <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{data?.total ?? 0} total</p>
          </div>
          <Link to="/admin/events/create" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            <Plus size={12} /> Create Event
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2 }}>
          {([
            { key: 'all',      label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'ongoing',  label: 'Ongoing' },
            { key: 'ended',    label: 'Ended' },
            { key: 'pending',  label: 'Pending' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'trending', label: 'Trending' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => { setFilter(key); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 3, border: 'none', cursor: 'pointer', background: filter === key ? '#161616' : 'transparent', color: filter === key ? '#d0d0d0' : '#444', fontSize: 11, fontWeight: 500, transition: 'all .1s' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#383838', pointerEvents: 'none', display: 'flex' }}><Search size={12} /></span>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search events…" style={inp} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                <th style={th}>
                  <button onClick={() => toggleSort('title' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>
                    Event <SortIcon col={'title' as any} />
                  </button>
                </th>
                <th style={th}>EO</th>
                <th style={th}>Venue</th>
                <th style={th}>Status</th>
                <th style={th}>Visible</th>
                <th style={th}>Trending</th>
                <th style={th}>
                  <button onClick={() => toggleSort('date_start' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>
                    Date <SortIcon col={'date_start' as any} />
                  </button>
                </th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: '48px 18px', textAlign: 'center' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
                </td></tr>
              ) : (sortedEvents || []).map((event, i) => {
                const approvalSt = event.approval_status !== 'approved' ? APPROVAL_STATUS[event.approval_status] : null;
                const st = STATUS[event.status] ?? STATUS[2];
                return (
                  <tr key={event.id} style={{ borderBottom: i < ((sortedEvents?.length || 1) - 1) ? '1px solid #0f0f0f' : 'none', opacity: event.is_visible === 0 ? 0.5 : 1 }}>
                    <td style={{ padding: '10px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 5, overflow: 'hidden', background: '#0e0e0e', border: '1px solid #1c1c1c', flexShrink: 0 }}>
                          {event.image
                            ? <img src={`${IMG_BASE}${event.image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a' }}><Image size={13} /></div>
                          }
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                            {event.is_visible === 0 && <CircleX size={11} style={{ color: '#cc4444', flexShrink: 0 }} />}
                          </div>
                          <div style={{ fontSize: 10, color: '#484848' }}>/{event.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 18px', fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{event.eo_name}</td>
                    <td style={{ padding: '10px 18px', fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{event.venue_name}</td>
                    <td style={{ padding: '10px 18px' }}>
                      {approvalSt
                        ? <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: approvalSt.color }}>● {approvalSt.label}</span>
                        : <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: st.color }}>● {st.label}</span>
                      }
                    </td>
                    <td style={{ padding: '10px 18px' }}>
                      <button
                        onClick={() => toggleMutation.mutate({ id: event.id, field: 'is_visible', value: event.is_visible === 0 ? 1 : 0 })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: event.is_visible === 0 ? '#cc4444' : '#22c55e', padding: 4, display: 'flex', borderRadius: 3 }}
                      >
                        {event.is_visible === 0 ? <CircleX size={14} /> : <CircleCheck size={14} />}
                      </button>
                    </td>
                    <td style={{ padding: '10px 18px' }}>
                      <button
                        onClick={() => toggleMutation.mutate({ id: event.id, field: 'is_trending', value: event.is_trending === 1 ? 0 : 1 })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: event.is_trending === 1 ? '#a07830' : '#2a2a2a', padding: 4, display: 'flex', borderRadius: 3 }}
                      >
                        <TrendingUp size={14} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 18px', fontSize: 11, color: '#484848', whiteSpace: 'nowrap' }}>{formatDate(event.date_start)}</td>
                    <td style={{ padding: '10px 18px' }}>
                      <Link to="/admin/events/$eventId" params={{ eventId: String(event.id) }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 3, textDecoration: 'none' }}>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && (sortedEvents?.length ?? 0) === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#333' }}>No results</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #111' }}>
            <span style={{ fontSize: 11, color: '#444' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, display: 'flex' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, display: 'flex' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
