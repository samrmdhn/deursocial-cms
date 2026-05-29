import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Image } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Ended',    color: '#555' },
  1: { label: 'Ongoing',  color: '#22c55e' },
  2: { label: 'Upcoming', color: '#60a5fa' },
};
const APPROVAL: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending Review', color: '#f59e0b' },
  rejected: { label: 'Rejected',       color: '#ef4444' },
};

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

export default function EOEvents() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: events, isLoading } = useQuery({
    queryKey: ['eo', 'events', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug, image, status, approval_status, date_start, vanues_id, rejection_reason, created_at')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });

      const venueIds = [...new Set((data || []).map((e) => e.vanues_id).filter(Boolean))];
      let venueMap: Record<number, string> = {};
      if (venueIds.length) {
        const { data: venues } = await supabase.from('ir_vanues').select('id, title').in('id', venueIds);
        venueMap = Object.fromEntries((venues || []).map((v) => [v.id, v.title]));
      }
      return (data || []).map((e) => ({ ...e, venue_name: venueMap[e.vanues_id] || '—' }));
    },
    enabled: !!eoId,
  });

  const [sortField, setSortField] = useState<'title' | 'date_start'>('date_start');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { sorted: sortedEvents } = useTableSort(events, sortField as any, sortDir);

  const toggleSort = (f: 'title' | 'date_start') => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>My Events</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{events?.length ?? 0} events</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2 }}>
            {(['title', 'date_start'] as const).map((f) => (
              <button key={f} onClick={() => toggleSort(f)} style={{ padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer', background: sortField === f ? '#161616' : 'transparent', color: sortField === f ? '#d0d0d0' : '#444', fontSize: 10, fontWeight: 500 }}>
                {f === 'title' ? `Name ${sortField === f ? (sortDir === 'asc' ? '↑' : '↓') : ''}` : `Date ${sortField === f ? (sortDir === 'asc' ? '↑' : '↓') : ''}`}
              </button>
            ))}
          </div>
          <Link to="/eo/events/create" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            <Plus size={12} /> New Event
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
        </div>
      ) : events?.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No events yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {events?.map((event) => {
            const approvalSt = event.approval_status !== 'approved' ? APPROVAL[event.approval_status] : null;
            const st = approvalSt ?? STATUS[event.status] ?? STATUS[2];
            return (
              <div key={event.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
                {event.image ? (
                  <img src={`${IMG_BASE}${event.image}`} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: 120, background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e1e1e' }}>
                    <Image size={28} />
                  </div>
                )}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#d8d8d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                      <div style={{ fontSize: 10, color: '#484848', marginTop: 2 }}>{event.venue_name} · {formatDate(event.date_start)}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: st.color, whiteSpace: 'nowrap', flexShrink: 0 }}>● {st.label}</span>
                  </div>

                  {event.approval_status === 'rejected' && event.rejection_reason && (
                    <div style={{ padding: '8px 10px', background: '#1a0505', border: '1px solid #2a0808', borderRadius: 4, fontSize: 10, color: '#cc4444' }}>
                      Rejected: {event.rejection_reason}
                    </div>
                  )}

                  <Link
                    to="/eo/events/$eventId/edit"
                    params={{ eventId: String(event.id) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', textDecoration: 'none', fontWeight: 500 }}
                  >
                    <Pencil size={11} />
                    {event.approval_status === 'rejected' ? 'Edit & Resubmit' : 'Edit Event'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
