import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Check, Clock, Save, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import EventPreviewCard from '@/components/EventPreviewCard';
import EventDetailPreview from '@/components/EventDetailPreview';
import EventForm, { type EventFormData } from '@/components/EventForm';
import CheckinSection from '@/components/CheckinSection';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

function fmtTs(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().split('T')[0];
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function statusLabel(s: number) {
  return s === 1 ? 'Published' : s === 2 ? 'Draft' : s === 3 ? 'Archived' : String(s);
}

export default function AdminEditEvent() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EventFormData>({
    title: '', description: '', date_start: '', date_end: '',
    schedule_start: '', schedule_end: '', vanues_id: '',
    contents_id: '', instagram_url: '', website_url: '',
    status: 2, event_organizers_id: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL as string;
  const authToken = useAuthStore((s) => s.token) ?? '';

  const { data: eventToEdit } = useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: async () => {
      const { data } = await supabase.from('ir_content_details').select('*').eq('id', Number(eventId)).single();
      return data;
    },
    enabled: !!eventId,
  });

  const { data: venues } = useQuery({ queryKey: ['venues-select'], queryFn: async () => { const { data } = await supabase.from('ir_vanues').select('id, title').order('title'); return data || []; } });
  const { data: eos } = useQuery({ queryKey: ['eos-select'], queryFn: async () => { const { data } = await supabase.from('ir_event_organizers').select('id, name').order('name'); return data || []; } });
  const { data: typeContentDetails } = useQuery({ queryKey: ['type-content-details'], queryFn: async () => { const { data } = await supabase.from('ir_type_content_details').select('id, title'); return data || []; } });

  useEffect(() => {
    if (eventToEdit) {
      setForm({
        title: eventToEdit.title || '',
        description: eventToEdit.description || '',
        date_start: eventToEdit.date_start ? new Date(eventToEdit.date_start * 1000).toISOString().slice(0, 10) : '',
        date_end: eventToEdit.date_end ? new Date(eventToEdit.date_end * 1000).toISOString().slice(0, 10) : '',
        schedule_start: eventToEdit.schedule_start || '',
        schedule_end: eventToEdit.schedule_end || '',
        vanues_id: eventToEdit.vanues_id?.toString() || '',
        contents_id: eventToEdit.contents_id?.toString() || '',
        instagram_url: eventToEdit.instagram_url || '',
        website_url: eventToEdit.website_url || '',
        status: eventToEdit.status ?? 2,
        event_organizers_id: eventToEdit.event_organizers_id?.toString() || '',
      });
      if (eventToEdit.image) setImagePreview(`${IMG_BASE}${eventToEdit.image}`);
    }
  }, [eventToEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const now = Math.floor(Date.now() / 1000);
      let finalImage = eventToEdit?.image || null;
      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImage = uploadedUrl;
      }
      const { error } = await supabase.from('ir_content_details').update({
        title: form.title, description: form.description,
        date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
        date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
        schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
        schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
        vanues_id: Number(form.vanues_id), event_organizers_id: Number(form.event_organizers_id),
        contents_id: Number(form.contents_id), type_content_details_id: typeContentDetails?.[0]?.id || 1,
        image: finalImage, status: form.status,
        instagram_url: form.instagram_url || null, website_url: form.website_url || null,
        updated_at: now,
      }).eq('id', Number(eventId));
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Event updated'); navigate({ to: '/admin/events' }); },
    onError: () => toast.error('Failed to update event'),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const draft = eventToEdit?.draft_data;
      // New event approval (no draft data — just flip approval_status)
      if (!draft) {
        const { error } = await supabase.from('ir_content_details').update({
          approval_status: 'approved',
          rejection_reason: null,
          updated_at: Math.floor(Date.now() / 1000),
        }).eq('id', Number(eventId));
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('ir_content_details').update({
        title: draft.title ?? eventToEdit.title,
        description: draft.description ?? eventToEdit.description,
        date_start: draft.date_start ?? eventToEdit.date_start,
        date_end: draft.date_end ?? eventToEdit.date_end,
        schedule_start: draft.schedule_start ?? eventToEdit.schedule_start,
        schedule_end: draft.schedule_end ?? eventToEdit.schedule_end,
        vanues_id: draft.vanues_id ?? eventToEdit.vanues_id,
        contents_id: draft.contents_id ?? eventToEdit.contents_id,
        instagram_url: draft.instagram_url ?? null,
        website_url: draft.website_url ?? null,
        status: draft.status ?? eventToEdit.status,
        image: draft.image ?? eventToEdit.image,
        draft_data: null,
        approval_status: 'approved',
        rejection_reason: null,
        updated_at: Math.floor(Date.now() / 1000),
      }).eq('id', Number(eventId));
      if (error) throw error;
      // Apply check-in config changes if EO submitted them via draft
      if (draft.checkin_config && eventToEdit.slug) {
        await supabase.from('ir_event_qr_config').upsert({
          event_slug: eventToEdit.slug,
          is_active: draft.checkin_config.is_active ?? false,
          checkin_mode: draft.checkin_config.checkin_mode ?? 'once',
          checkin_method: draft.checkin_config.checkin_method ?? 'qr',
          geofence_type: 'radius',
          geofence_center_lat: draft.checkin_config.geofence_center_lat,
          geofence_center_lng: draft.checkin_config.geofence_center_lng,
          geofence_radius_m: draft.checkin_config.geofence_radius_m,
          geofence_polygon_json: [],
          passport_image_url: draft.checkin_config.passport_image_url ?? null,
          checkin_badge_id: draft.checkin_config.checkin_badge_id ?? null,
          updated_at: Math.floor(Date.now() / 1000),
        }, { onConflict: 'event_slug' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Changes approved and applied');
      setShowRejectInput(false);
    },
    onError: () => toast.error('Failed to approve changes'),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectReason.trim()) throw new Error('Reason required');
      // If rejecting an edit to an already-approved event (draft_data was set),
      // restore approval_status to 'approved' so the event stays visible on mobile.
      // Only set 'rejected' for new events that were never approved.
      const wasEdit = eventToEdit?.draft_data != null;
      const { error } = await supabase.from('ir_content_details').update({
        draft_data: null,
        approval_status: wasEdit ? 'approved' : 'rejected',
        rejection_reason: rejectReason.trim(),
        updated_at: Math.floor(Date.now() / 1000),
      }).eq('id', Number(eventId));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Changes rejected');
      setShowRejectInput(false);
      setRejectReason('');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reject'),
  });

  const hasPendingChanges = eventToEdit?.draft_data != null || eventToEdit?.approval_status === 'pending';
  const draft = eventToEdit?.draft_data;

  // Build diff rows for pending changes panel
  const diffRows: { field: string; live: string; proposed: string; changed: boolean }[] = (hasPendingChanges && draft) ? [
    { field: 'Title', live: eventToEdit.title || '—', proposed: draft.title || '—', changed: eventToEdit.title !== draft.title },
    { field: 'Description', live: (eventToEdit.description || '').slice(0, 60) + (eventToEdit.description?.length > 60 ? '…' : ''), proposed: (draft.description || '').slice(0, 60) + (draft.description?.length > 60 ? '…' : ''), changed: eventToEdit.description !== draft.description },
    { field: 'Date Start', live: fmtTs(eventToEdit.date_start), proposed: fmtTs(draft.date_start), changed: eventToEdit.date_start !== draft.date_start },
    { field: 'Date End', live: fmtTs(eventToEdit.date_end), proposed: fmtTs(draft.date_end), changed: eventToEdit.date_end !== draft.date_end },
    { field: 'Time Start', live: fmtTime(eventToEdit.schedule_start), proposed: fmtTime(draft.schedule_start), changed: eventToEdit.schedule_start !== draft.schedule_start },
    { field: 'Time End', live: fmtTime(eventToEdit.schedule_end), proposed: fmtTime(draft.schedule_end), changed: eventToEdit.schedule_end !== draft.schedule_end },
    { field: 'Status', live: statusLabel(eventToEdit.status), proposed: statusLabel(draft.status), changed: eventToEdit.status !== draft.status },
    { field: 'Instagram', live: eventToEdit.instagram_url || '—', proposed: draft.instagram_url || '—', changed: eventToEdit.instagram_url !== draft.instagram_url },
    { field: 'Website', live: eventToEdit.website_url || '—', proposed: draft.website_url || '—', changed: eventToEdit.website_url !== draft.website_url },
    { field: 'Image', live: eventToEdit.image ? 'Current image' : '—', proposed: draft.image && draft.image !== eventToEdit.image ? 'New image uploaded' : 'Unchanged', changed: draft.image !== eventToEdit.image },
    ...(draft.checkin_config ? [{
      field: 'Check-in Config',
      live: 'Current config',
      proposed: [
        `Active: ${draft.checkin_config.is_active ? 'Yes' : 'No'}`,
        `Method: ${draft.checkin_config.checkin_method ?? '—'}`,
        draft.checkin_config.checkin_badge_id ? 'Badge: Set' : 'Badge: None',
      ].join(' · '),
      changed: true,
    }] : []),
  ].filter((r) => r.changed) : [];

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', gap: 40, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <button onClick={() => navigate({ to: '/admin/events' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={13} /> Back to Events
        </button>

        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Edit Event</h1>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Modify event details</p>
        </div>

        {/* Pending changes review panel */}
        {hasPendingChanges && (
          <div style={{ border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
              <Clock size={13} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>Pending EO Changes</span>
              <span style={{ fontSize: 10, color: '#78716c', marginLeft: 4 }}>Review and approve or reject below</span>
            </div>

            {!draft ? (
              <div style={{ padding: '12px 16px', fontSize: 11, color: '#888' }}>New event submission — review the form below then approve or reject.</div>
            ) : diffRows.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#090909' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', color: '#555', fontWeight: 500, width: 100 }}>Field</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#555', fontWeight: 500 }}>Current</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#f59e0b', fontWeight: 500 }}>Proposed</th>
                  </tr>
                </thead>
                <tbody>
                  {diffRows.map((row, i) => (
                    <tr key={row.field} style={{ borderTop: i > 0 ? '1px solid #111' : undefined }}>
                      <td style={{ padding: '8px 16px', color: '#666', fontWeight: 500 }}>{row.field}</td>
                      <td style={{ padding: '8px 12px', color: '#888', wordBreak: 'break-word' }}>{row.live}</td>
                      <td style={{ padding: '8px 12px', color: '#d0d0d0', wordBreak: 'break-word' }}>{row.proposed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '12px 16px', fontSize: 11, color: '#555' }}>No detectable field changes (may be image-only update)</div>
            )}

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #111' }}>
              {!showRejectInput ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                    style={{ flex: 1, padding: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {approveMutation.isPending ? <div style={{ width: 12, height: 12, border: '2px solid #166534', borderTopColor: '#22c55e', borderRadius: '50%' }} className="ds-spin" /> : <><Check size={12} /> Approve Changes</>}
                  </button>
                  <button onClick={() => setShowRejectInput(true)}
                    style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <X size={12} /> Reject
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={12} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Rejection reason</span>
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tell the EO why the changes were rejected…"
                    rows={3}
                    style={{ width: '100%', padding: '8px 10px', background: '#080808', border: '1px solid #222', borderRadius: 5, color: '#d0d0d0', fontSize: 11, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || !rejectReason.trim()}
                      style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: rejectReason.trim() ? 'pointer' : 'default', opacity: rejectReason.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {rejectMutation.isPending ? <div style={{ width: 12, height: 12, border: '2px solid #7f1d1d', borderTopColor: '#ef4444', borderRadius: '50%' }} className="ds-spin" /> : 'Confirm Reject'}
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                      style={{ padding: '8px 16px', background: 'none', border: '1px solid #222', borderRadius: 5, color: '#555', fontSize: 11, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}>
          <EventForm
            form={form}
            onChange={setForm}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onImageRemove={() => { setImageFile(null); setImagePreview(null); }}
            showEOSelector
          />
          <button type="submit" disabled={updateMutation.isPending}
            style={{ marginTop: 16, width: '100%', padding: '10px', background: updateMutation.isPending ? '#0d0d0d' : '#fff', border: updateMutation.isPending ? '1px solid #141414' : '1px solid transparent', borderRadius: 5, color: updateMutation.isPending ? '#2e2e2e' : '#000', fontSize: 12, fontWeight: 600, cursor: updateMutation.isPending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {updateMutation.isPending
              ? <div style={{ width: 14, height: 14, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" />
              : <><Save size={12} /> Save Changes</>}
          </button>
        </form>

        {eventToEdit?.slug && (
          <div style={{ marginTop: 24 }}>
            <CheckinSection eventSlug={eventToEdit.slug} apiBase={apiBase} token={authToken} />
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', top: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#555' }}>Live Preview</span>
          <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2 }}>
            {(['card', 'detail'] as const).map((t) => (
              <button key={t} onClick={() => setPreviewTab(t)} style={{ padding: '4px 12px', borderRadius: 3, border: 'none', cursor: 'pointer', background: previewTab === t ? '#161616' : 'transparent', color: previewTab === t ? '#d0d0d0' : '#555', fontSize: 10, fontWeight: 500 }}>
                {t === 'card' ? 'Card' : 'Detail'}
              </button>
            ))}
          </div>
        </div>
        {previewTab === 'card'
          ? <EventPreviewCard form={form} imagePreview={imagePreview} venues={venues} />
          : <EventDetailPreview form={form} imagePreview={imagePreview} venues={venues} eos={eos} />}
      </div>
    </div>
  );
}
