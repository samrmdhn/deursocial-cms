import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, GripVertical, X, Star, Circle, RectangleHorizontal,
  ArrowUp, ArrowDown,
} from 'lucide-react';

interface FeaturedAd {
  id: number;
  content_details_id: number;
  format: 'rounded' | 'banner';
  image: string;
  sort_order: number;
  is_active: number;
  created_at: number;
  event_title?: string;
  event_slug?: string;
}

export default function AdminFeaturedAds() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    content_details_id: '',
    format: 'rounded' as 'rounded' | 'banner',
    image: '',
  });
  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['admin', 'featured-ads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_featured_ads')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!data || data.length === 0) return [];

      const eventIds = data.map((a) => a.content_details_id);
      const { data: events } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .in('id', eventIds);
      const eventMap = Object.fromEntries((events || []).map((e) => [e.id, e]));

      return data.map((ad) => ({
        ...ad,
        event_title: eventMap[ad.content_details_id]?.title || '-',
        event_slug: eventMap[ad.content_details_id]?.slug || '',
      })) as FeaturedAd[];
    },
  });

  const { data: events } = useQuery({
    queryKey: ['events-for-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .order('title', { ascending: true });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = ads?.length ? Math.max(...ads.map((a) => a.sort_order)) : 0;
      const { error } = await supabase.from('ir_featured_ads').insert({
        content_details_id: Number(form.content_details_id),
        format: form.format,
        image: form.image,
        sort_order: maxOrder + 1,
        is_active: 1,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] });
      toast.success('Featured ad created');
      setShowModal(false);
      setForm({ content_details_id: '', format: 'rounded', image: '' });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to create ad. Make sure the ir_featured_ads table exists.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_featured_ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] });
      toast.success('Ad removed');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: 'up' | 'down' }) => {
      if (!ads) return;
      const idx = ads.findIndex((a) => a.id === id);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ads.length) return;

      const updates = [
        { id: ads[idx].id, sort_order: ads[swapIdx].sort_order },
        { id: ads[swapIdx].id, sort_order: ads[idx].sort_order },
      ];

      for (const u of updates) {
        await supabase.from('ir_featured_ads').update({ sort_order: u.sort_order }).eq('id', u.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] });
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Featured Ads</h1>
          <p className="text-slate-400 mt-1">Manage homepage featured events (ads)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus size={16} />
          Add Featured
        </button>
      </div>

      {/* Format legend */}
      <div className="flex items-center gap-6 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <Circle size={14} className="text-violet-400" />
          Rounded (circle image + name + slug)
        </span>
        <span className="flex items-center gap-2">
          <RectangleHorizontal size={14} className="text-amber-400" />
          Banner (wide image + slug, like Google Ads)
        </span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : ads?.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800/50 rounded-2xl">
            No featured ads yet. Create one to show on the homepage.
          </div>
        ) : (
          ads?.map((ad, idx) => (
            <div
              key={ad.id}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700/50 transition-all"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => reorderMutation.mutate({ id: ad.id, direction: 'up' })}
                  disabled={idx === 0}
                  className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => reorderMutation.mutate({ id: ad.id, direction: 'down' })}
                  disabled={idx === (ads?.length || 0) - 1}
                  className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              <span className="text-xs text-slate-500 font-mono w-6">#{ad.sort_order}</span>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                ad.format === 'rounded'
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {ad.format === 'rounded' ? <Circle size={18} /> : <RectangleHorizontal size={18} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{ad.event_title}</p>
                <p className="text-xs text-slate-500">
                  {ad.format} · /{ad.event_slug}
                </p>
              </div>

              {ad.image && (
                <img
                  src={ad.image.startsWith('http') ? ad.image : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${ad.image}`}
                  alt=""
                  className={`object-cover flex-shrink-0 ${
                    ad.format === 'rounded' ? 'w-12 h-12 rounded-full' : 'w-24 h-12 rounded-xl'
                  }`}
                />
              )}

              <button
                onClick={() => { if (confirm('Remove this ad?')) deleteMutation.mutate(ad.id); }}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Add Featured Ad</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Event</label>
                <select
                  value={form.content_details_id}
                  onChange={(e) => setForm({ ...form, content_details_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                >
                  <option value="">Select event...</option>
                  {events?.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Format</label>
                <div className="flex gap-3">
                  {(['rounded', 'banner'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setForm({ ...form, format: fmt })}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        form.format === fmt
                          ? fmt === 'rounded'
                            ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {fmt === 'rounded' ? '● Rounded' : '▬ Banner'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Image URL</label>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="https://..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending ? 'Creating...' : 'Add Featured'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
