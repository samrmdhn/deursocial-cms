import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Images, Save, Trash2, Upload, X } from 'lucide-react';
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
    if (event) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        date_start: event.date_start ? new Date(event.date_start * 1000).toISOString().split('T')[0] : '',
        date_end: event.date_end ? new Date(event.date_end * 1000).toISOString().split('T')[0] : '',
        schedule_start: event.schedule_start || '',
        schedule_end: event.schedule_end || '',
        vanues_id: String(event.vanues_id || ''),
        contents_id: String(event.contents_id || ''),
        instagram_url: event.instagram_url || '',
        website_url: event.website_url || '',
        status: event.status ?? 2,
        // approval_status read-only from event
      });
      if (event.image) setImagePreview(`${IMG_BASE}${event.image}`);
    }
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
      let finalImage = event?.image || null;
      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImage = uploadedUrl;
      }
      const { error: updateError } = await supabase.from('ir_content_details').update({
        title: form.title, description: form.description,
        date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
        date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
        schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
        schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
        vanues_id: Number(form.vanues_id), contents_id: Number(form.contents_id),
        image: finalImage, instagram_url: form.instagram_url || null, website_url: form.website_url || null,
        status: form.status, approval_status: 'pending', rejection_reason: null, updated_at: Math.floor(Date.now() / 1000),
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
      queryClient.invalidateQueries({ queryKey: ['eo', 'event', 'posters', eventId] });
      refetchPosters();
      toast.success('Event updated');
      navigate({ to: '/eo/events' });
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate({ to: '/eo/events' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ArrowLeft size={13} /> Back to Events
      </button>

      <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Edit Event</h1>

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
          />
        )}

        <button type="submit" disabled={updateMutation.isPending}
          style={{ padding: '10px', background: updateMutation.isPending ? '#0d0d0d' : '#fff', border: updateMutation.isPending ? '1px solid #141414' : '1px solid transparent', borderRadius: 5, color: updateMutation.isPending ? '#2e2e2e' : '#000', fontSize: 12, fontWeight: 600, cursor: updateMutation.isPending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {updateMutation.isPending
            ? <div style={{ width: 14, height: 14, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" />
            : <><Save size={12} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
