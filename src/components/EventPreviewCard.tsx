import React from 'react';
import { CalendarDays, MapPin } from 'lucide-react';

interface EventPreviewCardProps {
  form: {
    title: string;
    date_start: string;
    date_end: string;
    vanues_id: string;
    status?: number;
  };
  imagePreview: string | null;
  venues: { id: number; title: string }[] | undefined;
}

function formatDateRange(start: string, end: string) {
  if (!start) return 'No Date';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const s = new Date(start).toLocaleDateString('id-ID', opts);
  if (!end) return s;
  const e = new Date(end).toLocaleDateString('id-ID', opts);
  return s === e ? s : `${s} – ${e}`;
}

export default function EventPreviewCard({ form, imagePreview, venues }: EventPreviewCardProps) {
  const venueName = venues?.find((v) => v.id.toString() === form.vanues_id)?.title || 'Select Venue…';
  const statusMap: Record<number, { label: string; bg: string; border: string; dot: string; text: string }> = {
    0: { label: 'Ended',    bg: 'rgba(80,80,80,0.15)',   border: 'rgba(80,80,80,0.3)',   dot: '#555',     text: '#999' },
    1: { label: 'Ongoing',  bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e',  text: '#86efac' },
    2: { label: 'Upcoming', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', dot: '#60a5fa',  text: '#93c5fd' },
  };
  const st = statusMap[form.status ?? 2] ?? statusMap[2];

  return (
    <div style={{ width: 280, borderRadius: 14, overflow: 'hidden', background: '#111', border: '1px solid #1a1a1a', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      {/* Image — 16:9 */}
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#0e0e0e', position: 'relative', overflow: 'hidden' }}>
        {imagePreview ? (
          <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#2a2a2a' }}>{form.title?.slice(0, 2).toUpperCase() || '?'}</span>
          </div>
        )}
        {/* Status badge top-left */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: st.bg, border: `1px solid ${st.border}`,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: st.text }}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Text content below image */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#e8e8e8', letterSpacing: -0.4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {form.title || 'Event Title'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={11} style={{ color: '#555', flexShrink: 0 }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venueName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={11} style={{ color: '#555', flexShrink: 0 }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, color: '#888' }}>{formatDateRange(form.date_start, form.date_end)}</span>
          </div>
        </div>
        {/* Dummy followers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{ display: 'flex' }}>
            {['#6366f1', '#8b5cf6', '#d946ef'].map((c, i) => (
              <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1.5px solid #111', marginLeft: i === 0 ? 0 : -5 }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: '#555' }}>0 followers</span>
        </div>
      </div>
    </div>
  );
}
