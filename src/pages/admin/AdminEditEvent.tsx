import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import EventPreviewCard from '@/components/EventPreviewCard';
import EventDetailPreview from '@/components/EventDetailPreview';
import EventForm, { type EventFormData } from '@/components/EventForm';
import CheckinSection from '@/components/CheckinSection';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

export default function AdminEditEvent() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();

  const [form, setForm] = useState<EventFormData>({
    title: '', description: '', date_start: '', date_end: '',
    schedule_start: '', schedule_end: '', vanues_id: '',
    contents_id: '', instagram_url: '', website_url: '',
    status: 2, event_organizers_id: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
  const apiBase = import.meta.env.VITE_API_BASE_URL as string;
  const authToken = useAuthStore((s) => s.token) ?? '';

  const { data: eventToEdit } = useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: async () => { const { data } = await supabase.from('ir_content_details').select('*').eq('id', Number(eventId)).single(); return data; },
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
