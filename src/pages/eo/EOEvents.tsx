import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import { AlertCircle, Clock, Pencil, Plus } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import EventPreviewCard from '@/components/EventPreviewCard';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

function fmtDateStr(epoch: number | null): string {
  if (!epoch) return '';
  return new Date(epoch * 1000).toISOString().split('T')[0];
}

function toImgUrl(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${IMG_BASE}${img}`;
}

export default function EOEvents() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: venues } = useQuery({
    queryKey: ['venues-select'],
    queryFn: async () => { const { data } = await supabase.from('ir_vanues').select('id, title').order('title'); return data || []; },
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['eo', 'events', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug, image, status, approval_status, draft_data, date_start, date_end, vanues_id, rejection_reason, created_at')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });
      return data || [];
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {(sortedEvents || []).map((event) => {
            const isPending = event.approval_status === 'pending' || !!event.draft_data;
            const isRejected = event.approval_status === 'rejected' ||
              (event.approval_status === 'approved' && !!event.rejection_reason && !event.draft_data);
            const cardForm = {
              title: event.title || '',
              date_start: fmtDateStr(event.date_start),
              date_end: fmtDateStr(event.date_end),
              vanues_id: String(event.vanues_id || ''),
              status: event.status,
            };
            const imgPreview = toImgUrl(event.image);
            return (
              <div key={event.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Card with approval overlay */}
                <div style={{ position: 'relative' }}>
                  <EventPreviewCard form={cardForm} imagePreview={imgPreview} venues={venues} />
                  {isPending && (
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                      <Clock size={9} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Pending</span>
                    </div>
                  )}
                  {isRejected && (
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                      <AlertCircle size={9} style={{ color: '#ef4444' }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Rejected</span>
                    </div>
                  )}
                </div>

                {/* Rejection reason */}
                {isRejected && event.rejection_reason && (
                  <div style={{ display: 'flex', gap: 7, padding: '8px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
                    <AlertCircle size={11} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 10, color: '#f87171', lineHeight: 1.5 }}>{event.rejection_reason}</span>
                  </div>
                )}

                {/* Edit button */}
                <Link
                  to="/eo/events/$eventId/edit"
                  params={{ eventId: String(event.id) }}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 5, fontSize: 11, color: '#888', textDecoration: 'none', fontWeight: 500 }}
                >
                  <Pencil size={11} />
                  {isRejected ? 'Edit & Resubmit' : isPending ? 'Edit Submission' : 'Edit Event'}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
