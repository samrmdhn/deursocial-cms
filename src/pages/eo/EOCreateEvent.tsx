import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Send } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import EventPreviewCard from '@/components/EventPreviewCard';
import EventForm, { type EventFormData } from '@/components/EventForm';

export default function EOCreateEvent() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const [form, setForm] = useState<EventFormData>({
    title: '', description: '', date_start: '', date_end: '',
    schedule_start: '', schedule_end: '', vanues_id: '',
    contents_id: '', instagram_url: '', website_url: '', status: 2, // computed from dates, always upcoming on create
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: venues } = useQuery({ queryKey: ['venues-select'], queryFn: async () => { const { data } = await supabase.from('ir_vanues').select('id, title').order('title'); return data || []; } });
  const { data: typeContentDetails } = useQuery({ queryKey: ['type-content-details'], queryFn: async () => { const { data } = await supabase.from('ir_type_content_details').select('id, title'); return data || []; } });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!eoId) throw new Error('Not an EO');
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const now = Math.floor(Date.now() / 1000);
      let finalImage = null;
      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImage = uploadedUrl;
      }
      const { error } = await supabase.from('ir_content_details').insert({
        title: form.title, slug: slug + '-' + now, description: form.description,
        date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
        date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
        schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
        schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
        vanues_id: Number(form.vanues_id), event_organizers_id: eoId,
        contents_id: Number(form.contents_id), type_content_details_id: typeContentDetails?.[0]?.id || 1,
        image: finalImage, instagram_url: form.instagram_url || null, website_url: form.website_url || null,
        status: 2, approval_status: 'pending', is_trending: 0, impression: 0, created_at: now,
      });
      if (error) throw error;

      const { data: admins } = await supabase.from('ir_users_admin').select('users_id').eq('roles_id', 1);
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await supabase.from('ir_notifications').insert({
            users_id: admin.users_id, source_id: eoId, type: 10,
            message: `New event "${form.title}" submitted by EO for review`,
            is_read: 0, created_at: now,
          });
        }
      }
    },
    onSuccess: () => { toast.success('Event submitted for review!'); navigate({ to: '/eo/events' }); },
    onError: (err) => { console.error(err); toast.error('Failed to create event'); },
  });

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, maxWidth: 560 }}>
        <button onClick={() => navigate({ to: '/eo/events' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          <ArrowLeft size={13} /> Back to Events
        </button>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Create Event</h1>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Event will be submitted for admin review</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
          <EventForm
            form={form}
            onChange={setForm}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onImageRemove={() => { setImageFile(null); setImagePreview(null); }}
          />
          <button type="submit" disabled={createMutation.isPending}
            style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px', background: createMutation.isPending ? '#111' : '#fff', border: 'none', borderRadius: 5, color: createMutation.isPending ? '#555' : '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {createMutation.isPending
              ? <><div style={{ width: 14, height: 14, border: '2px solid #444', borderTopColor: '#888', borderRadius: '50%' }} className="ds-spin" /> Submitting…</>
              : <><Send size={13} /> Submit for Review</>}
          </button>
        </form>
      </div>

      <div style={{ position: 'sticky', top: 24, paddingTop: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#555' }}>Live Preview</span>
        </div>
        <EventPreviewCard form={{ ...form, status: 2 }} imagePreview={imagePreview} venues={venues} />
      </div>
    </div>
  );
}
