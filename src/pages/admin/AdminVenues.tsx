import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, MapPin } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };

export default function AdminVenues() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: venues, isLoading } = useQuery({
    queryKey: ['admin', 'venues'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_vanues').select('id, title, citys_id, created_at').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => { const { data } = await supabase.from('ir_citys').select('id, title'); return data || []; },
  });

  const createMutation = useMutation({
    mutationFn: async (t: string) => {
      const { error } = await supabase.from('ir_vanues').insert({ title: t, citys_id: 1, provinces_id: 1, countries_id: 1, created_at: Math.floor(Date.now() / 1000) });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] }); toast.success('Venue created'); setShowModal(false); setTitle(''); },
    onError: () => toast.error('Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const { error } = await supabase.from('ir_vanues').update({ title, updated_at: Math.floor(Date.now() / 1000) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] }); toast.success('Updated'); setEditItem(null); setShowModal(false); setTitle(''); },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('ir_vanues').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed'),
  });

  const { sorted: sortedVenues } = useTableSort(venues, 'title' as any, 'asc');

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Venues</h1>
            <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{venues?.length ?? 0} venues · sorted A-Z</p>
          </div>
          <button onClick={() => { setEditItem(null); setTitle(''); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={12} /> Add Venue
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {isLoading ? (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#333', fontSize: 12 }}>Loading…</div>
        ) : (sortedVenues?.length ?? 0) === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#333', fontSize: 12 }}>No venues yet</div>
        ) : sortedVenues?.map((venue) => (
          <div key={venue.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d8d8d8', lineHeight: 1.2 }}>{venue.title}</div>
                  <div style={{ fontSize: 11, color: '#484848', marginTop: 2 }}>
                    {cities?.find((c) => c.id === venue.citys_id)?.title || `City #${venue.citys_id}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => { setEditItem({ id: venue.id, title: venue.title }); setTitle(venue.title); setShowModal(true); }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => { if (confirm('Delete this venue?')) deleteMutation.mutate(venue.id); }} style={{ background: 'none', border: 'none', color: '#4a1a1a', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>{editItem ? 'Edit Venue' : 'Add Venue'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editItem ? updateMutation.mutate({ id: editItem.id, title }) : createMutation.mutate(title); }} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>Venue Name</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Club Deur" style={inp} required autoFocus />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {editItem ? 'Save Changes' : 'Create Venue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
