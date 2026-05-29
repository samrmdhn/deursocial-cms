import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { ArrowLeft, TrendingUp, Eye, EyeOff, Handshake, Users, MessageSquare, Calendar, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

const STATUS: Record<number, string> = { 0: 'Ended', 1: 'Ongoing', 2: 'Upcoming' };

export default function AdminEventDetail() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const queryClient = useQueryClient();
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: async () => {
      const { data } = await supabase.from('ir_content_details').select('*').eq('id', Number(eventId)).single();
      let eoName = '—';
      if (data?.event_organizers_id) {
        const { data: eo } = await supabase.from('ir_event_organizers').select('name').eq('id', data.event_organizers_id).single();
        eoName = eo?.name || '—';
      }
      let venueName = '—';
      if (data?.vanues_id) {
        const { data: venue } = await supabase.from('ir_vanues').select('title').eq('id', data.vanues_id).single();
        venueName = venue?.title || '—';
      }
      const { count: followerCount } = await supabase.from('ir_content_detail_followers').select('*', { count: 'exact', head: true }).eq('content_details_id', Number(eventId));
      const { data: groups } = await supabase.from('ir_groups').select('id, title, slug, max_members, status').eq('content_details_id', Number(eventId));
      return { ...data, eo_name: eoName, venue_name: venueName, follower_count: followerCount || 0, groups: groups || [] };
    },
    enabled: !!eventId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ field, value, reason }: { field: string; value: number | string; reason?: string }) => {
      const updateData: any = { [field]: value, updated_at: Math.floor(Date.now() / 1000) };
      if (reason !== undefined) updateData.rejection_reason = reason;
      const { error } = await supabase.from('ir_content_details').update(updateData).eq('id', Number(eventId));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] }); toast.success('Updated'); },
  });

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  if (!event) {
    return <div style={{ padding: '24px 28px', fontSize: 12, color: '#555' }}>Event not found</div>;
  }

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/admin/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Back to Events
        </Link>
        <Link to="/admin/events/$eventId/edit" params={{ eventId: String(eventId) }}
          style={{ padding: '7px 14px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
          Edit Event
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {event.image && (
          <img src={`${IMG_BASE}${event.image}`} alt="" style={{ width: 220, height: 140, objectFit: 'cover', borderRadius: 6, border: '1px solid #1a1a1a', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', marginBottom: 6 }}>{event.title}</h1>
          {event.description && <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>{event.description}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#484848' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /> {formatDate(event.date_start)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={11} /> {event.venue_name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={11} /> {event.follower_count} followers</span>
          </div>
        </div>
      </div>

      {/* Pending review banner */}
      {event.approval_status === 'pending' && (
        <div style={{ background: '#1a1200', border: '1px solid #2a1e00', borderRadius: 6, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c08020' }}>Pending Review</div>
            <div style={{ fontSize: 11, color: '#8a6010', marginTop: 3 }}>Submitted by EO — approve to publish or deny with feedback.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowDenyModal(true)}
              style={{ padding: '7px 16px', background: 'none', border: '1px solid #4a1a1a', borderRadius: 5, color: '#cc4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Deny
            </button>
            <button onClick={() => toggleMutation.mutate({ field: 'approval_status', value: 'approved', reason: undefined })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', background: '#0a2a0a', border: '1px solid #1a4a1a', borderRadius: 5, color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={12} /> Approve
            </button>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {event.approval_status === 'rejected' && (
        <div style={{ background: '#1a0505', border: '1px solid #2a0808', borderRadius: 6, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#cc4444' }}>Rejected</div>
          {event.rejection_reason && <div style={{ fontSize: 11, color: '#884444', marginTop: 3 }}>{event.rejection_reason}</div>}
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <button onClick={() => toggleMutation.mutate({ field: 'is_visible', value: event.is_visible === 0 ? 1 : 0 })}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: event.is_visible === 0 ? '#1a0a0a' : '#0a0a0a', border: `1px solid ${event.is_visible === 0 ? '#2a1010' : '#1a1a1a'}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
          {event.is_visible === 0 ? <EyeOff size={16} style={{ color: '#cc4444', flexShrink: 0 }} /> : <Eye size={16} style={{ color: '#22c55e', flexShrink: 0 }} />}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: event.is_visible === 0 ? '#cc4444' : '#22c55e' }}>
              {event.is_visible === 0 ? 'Hidden' : 'Visible'}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{STATUS[event.status] ?? 'Upcoming'}</div>
          </div>
        </button>

        <button onClick={() => toggleMutation.mutate({ field: 'is_trending', value: event.is_trending === 1 ? 0 : 1 })}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: event.is_trending === 1 ? '#1a1200' : '#0a0a0a', border: `1px solid ${event.is_trending === 1 ? '#2a2000' : '#1a1a1a'}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
          <TrendingUp size={16} style={{ color: event.is_trending === 1 ? '#c08020' : '#444', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: event.is_trending === 1 ? '#c08020' : '#888' }}>Trending</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{event.is_trending === 1 ? 'Active' : 'Inactive'}</div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6 }}>
          <Handshake size={16} style={{ color: '#484848', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>EO</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{event.eo_name}</div>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={12} style={{ color: '#444' }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' }}>Event Groups ({event.groups?.length || 0})</span>
        </div>
        {event.groups?.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 11, color: '#333' }}>No groups for this event</div>
        ) : event.groups?.map((group: any, i: number) => (
          <div key={group.id} style={{ padding: '10px 18px', borderBottom: i < event.groups.length - 1 ? '1px solid #0f0f0f' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0' }}>{group.title}</div>
              <div style={{ fontSize: 10, color: '#484848' }}>/{group.slug}</div>
            </div>
            <span style={{ fontSize: 10, color: '#555' }}>Max {group.max_members}</span>
          </div>
        ))}
      </div>

      {/* Deny Modal */}
      {showDenyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>Deny Event</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Reason shown to the EO so they can fix and resubmit.</div>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea value={denyReason} onChange={(e) => setDenyReason(e.target.value)} rows={4}
                placeholder="E.g., The event description is too vague..."
                style={{ width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', resize: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowDenyModal(false); setDenyReason(''); }}
                  style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid #1e1e1e', borderRadius: 5, color: '#888', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button disabled={!denyReason.trim()}
                  onClick={() => { toggleMutation.mutate({ field: 'approval_status', value: 'rejected', reason: denyReason }); setShowDenyModal(false); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px', background: denyReason.trim() ? '#1a0505' : '#0a0a0a', border: `1px solid ${denyReason.trim() ? '#4a1515' : '#1a1a1a'}`, borderRadius: 5, color: denyReason.trim() ? '#cc4444' : '#333', fontSize: 12, fontWeight: 600, cursor: denyReason.trim() ? 'pointer' : 'default' }}>
                  <XCircle size={12} /> Confirm Deny
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
