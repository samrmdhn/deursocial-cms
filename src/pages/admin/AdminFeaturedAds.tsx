import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Circle, RectangleHorizontal, ArrowUp, ArrowDown } from 'lucide-react';

interface FeaturedAd {
  id: number; content_details_id: number; format: 'rounded' | 'banner';
  image: string; sort_order: number; is_active: number; created_at: number;
  event_title?: string; event_slug?: string;
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 };

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

export default function AdminFeaturedAds() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ content_details_id: '', format: 'rounded' as 'rounded' | 'banner', image: '' });
  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['admin', 'featured-ads'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_featured_ads').select('*').order('sort_order', { ascending: true });
      if (!data || data.length === 0) return [];
      const eventIds = data.map((a) => a.content_details_id);
      const { data: events } = await supabase.from('ir_content_details').select('id, title, slug').in('id', eventIds);
      const eventMap = Object.fromEntries((events || []).map((e) => [e.id, e]));
      return data.map((ad) => ({ ...ad, event_title: eventMap[ad.content_details_id]?.title || '—', event_slug: eventMap[ad.content_details_id]?.slug || '' })) as FeaturedAd[];
    },
  });

  const { data: events } = useQuery({
    queryKey: ['events-for-select'],
    queryFn: async () => { const { data } = await supabase.from('ir_content_details').select('id, title, slug').order('title', { ascending: true }); return data || []; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = ads?.length ? Math.max(...ads.map((a) => a.sort_order)) : 0;
      const { error } = await supabase.from('ir_featured_ads').insert({
        content_details_id: Number(form.content_details_id), format: form.format, image: form.image,
        sort_order: maxOrder + 1, is_active: 1, created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] });
      toast.success('Featured ad created');
      setShowModal(false);
      setForm({ content_details_id: '', format: 'rounded', image: '' });
    },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('ir_featured_ads').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] }); toast.success('Removed'); },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: 'up' | 'down' }) => {
      if (!ads) return;
      const idx = ads.findIndex((a) => a.id === id);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ads.length) return;
      for (const u of [{ id: ads[idx].id, sort_order: ads[swapIdx].sort_order }, { id: ads[swapIdx].id, sort_order: ads[idx].sort_order }]) {
        await supabase.from('ir_featured_ads').update({ sort_order: u.sort_order }).eq('id', u.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'featured-ads'] }),
  });

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Featured Ads</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Manage homepage featured events</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={12} /> Add Featured
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, fontSize: 11, color: '#555' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Circle size={11} /> Rounded (circle image)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RectangleHorizontal size={11} /> Banner (wide image)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
          </div>
        ) : ads?.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: 12, color: '#333', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6 }}>No featured ads yet.</div>
        ) : ads?.map((ad, idx) => (
          <div key={ad.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => reorderMutation.mutate({ id: ad.id, direction: 'up' })} disabled={idx === 0}
                style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '2px 3px', display: 'flex', opacity: idx === 0 ? 0.2 : 1 }}><ArrowUp size={12} /></button>
              <button onClick={() => reorderMutation.mutate({ id: ad.id, direction: 'down' })} disabled={idx === (ads?.length || 0) - 1}
                style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '2px 3px', display: 'flex', opacity: idx === (ads?.length || 0) - 1 ? 0.2 : 1 }}><ArrowDown size={12} /></button>
            </div>
            <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', width: 20 }}>#{ad.sort_order}</span>
            <div style={{ width: 28, height: 28, borderRadius: 4, background: '#0e0e0e', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexShrink: 0 }}>
              {ad.format === 'rounded' ? <Circle size={13} /> : <RectangleHorizontal size={13} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.event_title}</div>
              <div style={{ fontSize: 10, color: '#484848' }}>{ad.format} · /{ad.event_slug}</div>
            </div>
            {ad.image && (
              <img src={ad.image.startsWith('http') ? ad.image : `${IMG_BASE}${ad.image}`} alt=""
                style={{ objectFit: 'cover', flexShrink: 0, border: '1px solid #1e1e1e', ...(ad.format === 'rounded' ? { width: 36, height: 36, borderRadius: '50%' } : { width: 80, height: 36, borderRadius: 4 }) }} />
            )}
            <button onClick={() => { if (confirm('Remove this ad?')) deleteMutation.mutate(ad.id); }}
              style={{ background: 'none', border: 'none', color: '#4a1a1a', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>Add Featured Ad</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Event</label>
                <select value={form.content_details_id} onChange={(e) => setForm({ ...form, content_details_id: e.target.value })} style={inp} required>
                  <option value="">Select event…</option>
                  {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Format</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['rounded', 'banner'] as const).map((fmt) => (
                    <button key={fmt} type="button" onClick={() => setForm({ ...form, format: fmt })}
                      style={{ flex: 1, padding: '8px', borderRadius: 5, border: `1px solid ${form.format === fmt ? '#333' : '#1e1e1e'}`, cursor: 'pointer', background: form.format === fmt ? '#111' : '#080808', color: form.format === fmt ? '#d0d0d0' : '#555', fontSize: 11, fontWeight: 500 }}>
                      {fmt === 'rounded' ? '● Rounded' : '▬ Banner'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Image URL</label>
                <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" style={inp} required />
              </div>
              <button type="submit" disabled={createMutation.isPending}
                style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {createMutation.isPending ? 'Creating…' : 'Add Featured'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
