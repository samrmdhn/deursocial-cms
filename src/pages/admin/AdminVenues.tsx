import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, MapPin } from 'lucide-react';

export default function AdminVenues() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: venues, isLoading } = useQuery({
    queryKey: ['admin', 'venues'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_vanues')
        .select('id, title, citys_id, provinces_id, countries_id, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_citys').select('id, title');
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (venueTitle: string) => {
      const { error } = await supabase.from('ir_vanues').insert({
        title: venueTitle,
        citys_id: 1,
        provinces_id: 1,
        countries_id: 1,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      toast.success('Venue created');
      setShowModal(false);
      setTitle('');
    },
    onError: () => toast.error('Failed to create venue'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const { error } = await supabase
        .from('ir_vanues')
        .update({ title, updated_at: Math.floor(Date.now() / 1000) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      toast.success('Venue updated');
      setEditItem(null);
      setShowModal(false);
      setTitle('');
    },
    onError: () => toast.error('Failed to update venue'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_vanues').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
      toast.success('Venue deleted');
    },
    onError: () => toast.error('Failed to delete venue'),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues</h1>
          <p className="text-slate-400 mt-1">Manage event venues</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setTitle(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus size={16} />
          Add Venue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-800/50 rounded w-1/2" />
            </div>
          ))
        ) : venues?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No venues yet</div>
        ) : (
          venues?.map((venue) => (
            <div
              key={venue.id}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 hover:border-slate-700/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <MapPin size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{venue.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cities?.find((c) => c.id === venue.citys_id)?.title || `City #${venue.citys_id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditItem({ id: venue.id, title: venue.title }); setTitle(venue.title); setShowModal(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50 cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this venue?')) deleteMutation.mutate(venue.id);
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
              <h2 className="text-lg font-semibold text-white">
                {editItem ? 'Edit Venue' : 'Add Venue'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editItem) {
                  updateMutation.mutate({ id: editItem.id, title });
                } else {
                  createMutation.mutate(title);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Venue Name</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all cursor-pointer"
              >
                {editItem ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
