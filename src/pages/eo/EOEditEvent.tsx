import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Globe, Images, Save, Trash2, Upload, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import CheckinSection from '@/components/CheckinSection';

export default function EOEditEvent() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authToken = useAuthStore((s) => s.token) ?? '';

  const [form, setForm] = useState({
    title: '', description: '', date_start: '', date_end: '',
    schedule_start: '', schedule_end: '', vanues_id: '', contents_id: '',
    instagram_url: '', website_url: '', status: 2,
  } as {
    title: string; description: string; date_start: string; date_end: string;
    schedule_start: string; schedule_end: string; vanues_id: string;
    contents_id: string; instagram_url: string; website_url: string; status: number;
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posterFiles, setPosterFiles] = useState<File[]>([]);
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);

  const { data: existingPosters, refetch: refetchPosters } = useQuery({
    queryKey: ['eo', 'event', 'posters', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_event_posters')
        .select('*')
        .eq('content_details_id', Number(eventId))
        .order('id');
      return data || [];
    },
    enabled: !!eventId,
  });

  const { data: event } = useQuery({
    queryKey: ['eo', 'event', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_content_details')
        .select('*')
        .eq('id', Number(eventId))
        .single();
      return data;
    },
    enabled: !!eventId,
  });

  const { data: venues } = useQuery({
    queryKey: ['venues-select'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_vanues').select('id, title').order('title');
      return data || [];
    },
  });

  const { data: contents } = useQuery({
    queryKey: ['contents-select'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_contents').select('id, title').eq('status', 1).order('title');
      return data || [];
    },
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
      });
      if (event.image) {
        setImagePreview(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${event.image}`);
      }
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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
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

  const removePosterPreview = (idx: number) => {
    setPosterFiles((prev) => prev.filter((_, i) => i !== idx));
    setPosterPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteExistingPoster = useMutation({
    mutationFn: async (posterId: number) => {
      const { error } = await supabase.from('ir_event_posters').delete().eq('id', posterId);
      if (error) throw error;
    },
    onSuccess: () => { refetchPosters(); toast.success('Poster removed'); },
    onError: () => toast.error('Failed to remove poster'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      let finalImage = event?.image || null;

      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImage = uploadedUrl;
      }

      const { error: updateError } = await supabase
        .from('ir_content_details')
        .update({
          title: form.title,
          description: form.description,
          date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
          date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
          schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
          schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
          vanues_id: Number(form.vanues_id),
          contents_id: Number(form.contents_id),
          image: finalImage,
          instagram_url: form.instagram_url || null,
          website_url: form.website_url || null,
          status: form.status,
          rejection_reason: null,
          updated_at: Math.floor(Date.now() / 1000),
        })
        .eq('id', Number(eventId));
      if (updateError) throw updateError;

      // Upload new poster images
      if (posterFiles.length > 0) {
        for (const posterFile of posterFiles) {
          const posterUrl = await uploadImageToBucket(posterFile, 'post-images', 'posters');
          if (posterUrl) {
            // Extract relative path from full public URL
            const supabaseBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
            const relativePath = posterUrl.startsWith(supabaseBase)
              ? posterUrl.replace(supabaseBase, '')
              : posterUrl;
            await supabase.from('ir_event_posters').insert({
              content_details_id: Number(eventId),
              image_url: relativePath,
              created_at: Math.floor(Date.now() / 1000),
            });
          }
        }
        setPosterFiles([]);
        setPosterPreviews([]);
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
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <button onClick={() => navigate({ to: '/eo/events' })}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors cursor-pointer">
        <ArrowLeft size={16} /> Back to Events
      </button>

      <h1 className="text-2xl font-bold text-white">Edit Event</h1>

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-5">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Event Name</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 h-28 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Start Date</label>
            <input type="date" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">End Date</label>
            <input type="date" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Start Time</label>
            <input type="time" value={form.schedule_start} onChange={(e) => setForm({ ...form, schedule_start: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">End Time</label>
            <input type="time" value={form.schedule_end} onChange={(e) => setForm({ ...form, schedule_end: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Venue</label>
            <select value={form.vanues_id} onChange={(e) => setForm({ ...form, vanues_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required>
              <option value="">Select venue...</option>
              {venues?.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Lineup</label>
            <select value={form.contents_id} onChange={(e) => setForm({ ...form, contents_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required>
              <option value="">Select lineup...</option>
              {contents?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Event Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value={2}>🔵 Upcoming</option>
            <option value={1}>🟢 Ongoing (Live)</option>
            <option value={3}>⚫ Ended</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Event Image</label>
          {imagePreview ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700/50">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <Upload className="text-slate-400 mb-2" size={24} />
              <span className="text-sm text-slate-400">Click to upload image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>

        {/* Social Media */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">Social Media</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">@</span>
            <input
              value={form.instagram_url}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="instagram handle or URL"
              className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div className="relative">
            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder="Website URL (e.g. https://event.com)"
              className="w-full pl-9 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        {/* Poster Images */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Images size={15} className="text-slate-400" />
            <p className="text-sm font-medium text-slate-300">Event Posters</p>
          </div>

          {/* Existing posters */}
          {(existingPosters?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-3">
              {existingPosters!.map((p: { id: number; image_url: string }) => (
                <div key={p.id} className="relative w-28 h-40 rounded-xl overflow-hidden border border-slate-700/50 group">
                  <img
                    src={p.image_url.startsWith('http') ? p.image_url : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${p.image_url}`}
                    alt="poster"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deleteExistingPoster.mutate(p.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New poster previews */}
          {posterPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {posterPreviews.map((src, idx) => (
                <div key={idx} className="relative w-28 h-40 rounded-xl overflow-hidden border border-violet-500/40 group">
                  <img src={src} alt="new poster" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePosterPreview(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600/80 text-white rounded-lg"
                  >
                    <X size={13} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-violet-600/70 text-center text-xs py-0.5 text-white font-medium">New</div>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-center gap-2 w-full h-12 bg-slate-800/50 border border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
            <Upload size={15} className="text-slate-400" />
            <span className="text-sm text-slate-400">Add poster image(s)</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePosterChange} />
          </label>
        </div>

        {/* Check-in Configuration */}
        {event?.slug && (
          <CheckinSection
            eventSlug={event.slug}
            apiBase={import.meta.env.VITE_API_BASE_URL ?? ''}
            token={authToken}
          />
        )}

        <button type="submit" disabled={updateMutation.isPending}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
          {updateMutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={18} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
