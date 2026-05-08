import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import EventPreviewCard from '@/components/EventPreviewCard';
import EventDetailPreview from '@/components/EventDetailPreview';
import { useEffect } from 'react';

export default function AdminEditEvent() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    date_start: '',
    date_end: '',
    schedule_start: '',
    schedule_end: '',
    vanues_id: '',
    event_organizers_id: '',
    contents_id: '',
    status: 1,
  } as {
    title: string; description: string; date_start: string; date_end: string;
    schedule_start: string; schedule_end: string; vanues_id: string;
    event_organizers_id: string; contents_id: string; status: number;
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');

  const { data: eventToEdit, isLoading: isEventLoading } = useQuery({
    queryKey: ['admin', 'event', eventId],
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
        event_organizers_id: eventToEdit.event_organizers_id?.toString() || '',
        contents_id: eventToEdit.contents_id?.toString() || '',
        status: eventToEdit.status ?? 2,
      });
      if (eventToEdit.image) {
        setImagePreview(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${eventToEdit.image}`);
      }
    }
  }, [eventToEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const { data: venues } = useQuery({
    queryKey: ['venues-select'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_vanues').select('id, title').order('title');
      return data || [];
    },
  });

  const { data: eos } = useQuery({
    queryKey: ['eos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_event_organizers').select('id, name').order('name');
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

  const { data: typeContentDetails } = useQuery({
    queryKey: ['type-content-details'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_type_content_details').select('id, title');
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const now = Math.floor(Date.now() / 1000);

      let finalImage = eventToEdit?.image || null;

      if (imageFile) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'events');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImage = uploadedUrl;
      }

      const { error } = await supabase.from('ir_content_details').update({
        title: form.title,
        slug: slug + '-' + now,
        description: form.description,
        date_start: form.date_start ? Math.floor(new Date(form.date_start).getTime() / 1000) : null,
        date_end: form.date_end ? Math.floor(new Date(form.date_end).getTime() / 1000) : null,
        schedule_start: form.schedule_start ? Math.floor(new Date(`2000-01-01T${form.schedule_start}`).getTime() / 1000) : null,
        schedule_end: form.schedule_end ? Math.floor(new Date(`2000-01-01T${form.schedule_end}`).getTime() / 1000) : null,
        vanues_id: Number(form.vanues_id),
        event_organizers_id: Number(form.event_organizers_id),
        contents_id: Number(form.contents_id),
        type_content_details_id: typeContentDetails?.[0]?.id || 1,
        image: finalImage,
        status: form.status,
      }).eq('id', Number(eventId));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Event updated successfully!');
      navigate({ to: '/admin/events' });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to update event');
    },
  });

  return (
    <div className="p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 space-y-6 w-full max-w-2xl">
        <button
          onClick={() => navigate({ to: '/admin/events' })}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Events
        </button>

        <div>
          <h1 className="text-2xl font-bold text-white">Edit Event</h1>
          <p className="text-slate-400 mt-1">Modify event details</p>
        </div>

      <form
        onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Event Name</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 h-28 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Start Date</label>
            <input
              type="date"
              value={form.date_start}
              onChange={(e) => setForm({ ...form, date_start: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">End Date</label>
            <input
              type="date"
              value={form.date_end}
              onChange={(e) => setForm({ ...form, date_end: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Start Time</label>
            <input
              type="time"
              value={form.schedule_start}
              onChange={(e) => setForm({ ...form, schedule_start: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">End Time</label>
            <input
              type="time"
              value={form.schedule_end}
              onChange={(e) => setForm({ ...form, schedule_end: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Venue</label>
            <select
              value={form.vanues_id}
              onChange={(e) => setForm({ ...form, vanues_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            >
              <option value="">Select venue...</option>
              {venues?.map((v) => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Event Organizer</label>
            <select
              value={form.event_organizers_id}
              onChange={(e) => setForm({ ...form, event_organizers_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            >
              <option value="">Select EO...</option>
              {eos?.map((eo) => (
                <option key={eo.id} value={eo.id}>{eo.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Lineup</label>
            <select
              value={form.contents_id}
              onChange={(e) => setForm({ ...form, contents_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            >
              <option value="">Select lineup...</option>
              {contents?.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Event Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value={1}>🟢 Ongoing (Live)</option>
              <option value={2}>🔵 Upcoming</option>
              <option value={3}>⚫ Ended</option>
            </select>
          </div>
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

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {updateMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
    
    <div className="hidden lg:block sticky top-8 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Live Preview</h3>
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setPreviewTab('card')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewTab === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Card
          </button>
          <button
            onClick={() => setPreviewTab('detail')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewTab === 'detail' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Detail
          </button>
        </div>
      </div>
      {previewTab === 'card' ? (
        <EventPreviewCard form={form} imagePreview={imagePreview} venues={venues} />
      ) : (
        <EventDetailPreview form={form} imagePreview={imagePreview} venues={venues} eos={eos} />
      )}
    </div>
  </div>
  );
}
