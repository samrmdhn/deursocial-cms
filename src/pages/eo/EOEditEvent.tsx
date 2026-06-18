import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Clock, Images, Save, Trash2, Upload, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import CheckinSection from '@/components/CheckinSection';
import EventForm, { type EventFormData } from '@/components/EventForm';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

export default function EOEditEvent() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authToken = useAuthStore((s) => s.token) ?? '';

  const [form, setForm] = useState<EventFormData>({
    title: '', description: '', date_start: '', date_end: '',
    schedule_start: '', schedule_end: '', vanues_id: '', contents_id: '',
    instagram_url: '', website_url: '', status: 2,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posterFiles, setPosterFiles] = useState<File[]>([]);
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);

  const { data: existingPosters, refetch: refetchPosters } = useQuery({
    queryKey: ['eo', 'event', 'posters', eventId],
    queryFn: async () => { const { data } = await supabase.from('ir_event_posters').select('*').eq('content_details_id', Number(eventId)).order('id'); return data || []; },
    enabled: !!eventId,
  });

  const { data: event } = useQuery({
    queryKey: ['eo', 'event', eventId],
    queryFn: async () => { const { data } = await supabase.from('ir_content_details').select('*').eq('id', Number(eventId)).single(); return data; },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (!event) return;

    // Pre-populate from draft_data when there is a pending edit (so EO sees what they submitted),
    // otherwise use live fields (covers approved, rejected, and edit-rejected cases)
    const src = event.draft_data ?? event;

    setForm({
      title: src.title || '',
      description: src.description || '',
      date_start: src.date_start ? new Date(src.date_start * 1000).toISOString().split('T')[0] : '',
      date_end: src.date_end ? new Date(src.date_end * 1000).toISOString().split('T')[0] : '',
      schedule_start: src.schedule_start || '',
      schedule_end: src.schedule_end || '',
      vanues_id: String(src.vanues_id || ''),
      contents_id: String(src.contents_id || ''),
      instagram_url: src.instagram_url || '',
      website_url: src.website_url || '',
      status: src.status ?? 2,
    });

    // Show live image (not draft image) as the current image reference
    if (event.image) setImagePreview(`${IMG_BASE}${event.image}`);
  }, [event]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      setPosterFiles((prev) => [...prev, file]);
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const deleteExistingPoster = useMutation({
    mutationFn: async (posterId: number) => { const { error } = await supabase.from('ir_event_posters').delete().eq('id', posterId); if (error) throw error; },
    onSuccess: () => { refetchPosters(); toast.success('Poster removed'); },
    onError: () => toast.error('Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Upload new image to storage (if any) but store path in draft_data only
      let draftImagePath: string | null = event?.image ?? null;
      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        // Store relative path in draft
        const supabaseBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
        draftImagePath = uploadedUrl.startsWith(supabaseBase) ? uploadedUrl.replace(supabaseBase, '') : uploadedUrl;
      }

      const draftData = {
        title: form.title,
        description: form.description,
        date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
        date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
        schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
        schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
        vanues_id: Number(form.vanues_id),
        contents_id: Number(form.contents_id),
        instagram_url: form.instagram_url || null,
        website_url: form.website_url || null,
        status: form.status,
        image: draftImagePath,
      };

      // Preserve existing draft_data.checkin_config so separate check-in draft saves aren't lost
      const { data: currentRow } = await supabase.from('ir_content_details')
        .select('draft_data').eq('id', Number(eventId)).single();
      const existingCheckinConfig = currentRow?.draft_data?.checkin_config ?? null;
      if (existingCheckinConfig) (draftData as any).checkin_config = existingCheckinConfig;

      // Write only draft_data — approval_status stays 'approved' so event stays
      // visible on mobile with current live data until admin applies the draft.
      const { error: updateError } = await supabase.from('ir_content_details').update({
        draft_data: draftData,
        rejection_reason: null,
        updated_at: Math.floor(Date.now() / 1000),
      }).eq('id', Number(eventId));
      if (updateError) throw updateError;

      if (posterFiles.length > 0) {
        for (const posterFile of posterFiles) {
          const posterUrl = await uploadImageToBucket(posterFile, 'post-images', 'posters');
          if (posterUrl) {
            const supabaseBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
            const relativePath = posterUrl.startsWith(supabaseBase) ? posterUrl.replace(supabaseBase, '') : posterUrl;
            await supabase.from('ir_event_posters').insert({ content_details_id: Number(eventId), image_url: relativePath, created_at: Math.floor(Date.now() / 1000) });
          }
        }
        setPosterFiles([]); setPosterPreviews([]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['eo', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eo', 'event', 'posters', eventId] });
      refetchPosters();
      toast.success('Changes submitted for review');
      navigate({ to: '/eo/events' });
    },
    onError: () => toast.error('Failed to submit changes'),
  });

  const approvalStatus = event?.approval_status;
  const hasPendingDraft = !!event?.draft_data;
  // Rejected: new event (status='rejected') OR edit rejected (status='approved', reason set, no draft)
  const isRejected = approvalStatus === 'rejected' || (approvalStatus === 'approved' && !!event?.rejection_reason && !event?.draft_data);

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate({ to: '/eo/events' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ArrowLeft size={13} /> Back to Events
      </button>

      <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Edit Event</h1>

      {/* Approval status banner */}
      {(approvalStatus === 'pending' || hasPendingDraft) && !isRejected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
          <Clock size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>Pending Review</div>
            <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>Your changes have been submitted and are waiting for admin approval.</div>
          </div>
        </div>
      )}
      {isRejected && event?.rejection_reason && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
          <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Changes Rejected</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{event.rejection_reason}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Update your changes below and resubmit.</div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <EventForm
          form={form}
          onChange={setForm}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          onImageRemove={() => { setImageFile(null); setImagePreview(null); }}
        />

        {/* Posters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Images size={12} style={{ color: '#666' }} />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 0 }}>Event Posters</label>
          </div>
          {(existingPosters?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {existingPosters!.map((p: { id: number; image_url: string }) => (
                <div key={p.id} style={{ position: 'relative', width: 80, height: 112, borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                  <img src={p.image_url.startsWith('http') ? p.image_url : `${IMG_BASE}${p.image_url}`} alt="poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => deleteExistingPoster.mutate(p.id)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 3, color: '#cc4444', cursor: 'pointer', padding: '3px', display: 'flex' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {posterPreviews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {posterPreviews.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 112, borderRadius: 5, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                  <img src={src} alt="new poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => { setPosterFiles(prev => prev.filter((_, i) => i !== idx)); setPosterPreviews(prev => prev.filter((_, i) => i !== idx)); }}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 3, color: '#cc4444', cursor: 'pointer', padding: '3px', display: 'flex' }}>
                    <X size={11} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.1)', textAlign: 'center', fontSize: 9, padding: '2px', color: '#aaa', fontWeight: 600 }}>NEW</div>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: 40, background: '#080808', border: '1px dashed #1e1e1e', borderRadius: 5, cursor: 'pointer', color: '#666', fontSize: 11 }}>
            <Upload size={13} /> Add poster image(s)
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePosterChange} />
          </label>
        </div>

        {event?.slug && (
          <CheckinSection
            eventSlug={event.slug}
            apiBase={import.meta.env.VITE_API_BASE_URL ?? ''}
            token={authToken}
            eoMode={true}
            eventContentId={Number(eventId)}
            draftCheckinConfig={event?.draft_data?.checkin_config ?? null}
          />
        )}

        <button type="submit" disabled={updateMutation.isPending}
          style={{ padding: '10px', background: updateMutation.isPending ? '#0d0d0d' : '#fff', border: updateMutation.isPending ? '1px solid #141414' : '1px solid transparent', borderRadius: 5, color: updateMutation.isPending ? '#2e2e2e' : '#000', fontSize: 12, fontWeight: 600, cursor: updateMutation.isPending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {updateMutation.isPending
            ? <div style={{ width: 14, height: 14, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" />
            : <><Save size={12} /> Submit for Review</>}
        </button>
      </form>
    </div>
  );
}
