import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, ListMusic, ArrowUp, ArrowDown } from 'lucide-react';

export default function AdminLineups() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: lineups, isLoading } = useQuery({
    queryKey: ['admin', 'lineups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_contents')
        .select('id, title, slug, status, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (lineupTitle: string) => {
      const slug = lineupTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Date.now() / 1000);
      const { error } = await supabase.from('ir_contents').insert({
        title: lineupTitle,
        slug,
        status: 1, // default active
        display_types_id: 1, // default rectangle_post
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] });
      toast.success('Lineup created');
      setShowModal(false);
      setTitle('');
    },
    onError: () => toast.error('Failed to create lineup'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const { error } = await supabase
        .from('ir_contents')
        .update({ title, updated_at: Math.floor(Date.now() / 1000) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] });
      toast.success('Lineup updated');
      setEditItem(null);
      setShowModal(false);
      setTitle('');
    },
    onError: () => toast.error('Failed to update lineup'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_contents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] });
      toast.success('Lineup deleted');
    },
    onError: () => toast.error('Failed to delete lineup (Make sure no events depend on it)'),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ item1, item2 }: { item1: { id: number, created_at: number }, item2: { id: number, created_at: number } }) => {
      const { error: e1 } = await supabase.from('ir_contents').update({ created_at: item2.created_at }).eq('id', item1.id);
      const { error: e2 } = await supabase.from('ir_contents').update({ created_at: item1.created_at }).eq('id', item2.id);
      if (e1 || e2) throw new Error('Failed to swap');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] });
    },
    onError: () => toast.error('Failed to reorder'),
  });

  const moveUp = (index: number) => {
    if (!lineups || index === 0) return;
    reorderMutation.mutate({ item1: lineups[index], item2: lineups[index - 1] });
  };

  const moveDown = (index: number) => {
    if (!lineups || index === lineups.length - 1) return;
    reorderMutation.mutate({ item1: lineups[index], item2: lineups[index + 1] });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lineups</h1>
          <p className="text-slate-400 mt-1">Manage event lineups / categories</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setTitle(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus size={16} />
          Add Lineup
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
        ) : lineups?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No lineups yet</div>
        ) : (
          lineups?.map((lineup, index) => (
            <div
              key={lineup.id}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 hover:border-slate-700/50 transition-all group flex flex-col justify-between h-full"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <ListMusic size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{lineup.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      /{lineup.slug}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditItem({ id: lineup.id, title: lineup.title }); setTitle(lineup.title); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this lineup?')) deleteMutation.mutate(lineup.id);
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === lineups.length - 1 || reorderMutation.isPending}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown size={16} />
                </button>
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
                {editItem ? 'Edit Lineup' : 'Add Lineup'}
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
                <label className="block text-sm text-slate-300 mb-1.5">Lineup Title</label>
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
