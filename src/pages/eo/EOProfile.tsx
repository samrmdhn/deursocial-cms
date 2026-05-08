import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Save, BadgeCheck, Users, AtSign } from 'lucide-react';

export default function EOProfile() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const queryClient = useQueryClient();

  const { data: eoInfo } = useQuery({
    queryKey: ['eo', 'profile', eoId],
    queryFn: async () => {
      if (!eoId) return null;
      const { data } = await supabase.from('ir_event_organizers').select('*').eq('id', eoId).single();
      return data;
    },
    enabled: !!eoId,
  });

  const { data: userInfo } = useQuery({
    queryKey: ['eo', 'user-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('ir_users').select('id, username, display_name').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: followerCount } = useQuery({
    queryKey: ['eo', 'followers', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('ir_following_users')
        .select('*', { count: 'exact', head: true })
        .eq('users_id', user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [username, setUsername] = useState('');

  // Sync state when data loads
  if (eoInfo && !name) setName(eoInfo.name || '');
  if (eoInfo && !detail) setDetail(eoInfo.detail || '');
  if (userInfo && !username) setUsername(userInfo.username || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!eoId || !user?.id) return;
      const [{ error: eoError }, { error: userError }] = await Promise.all([
        supabase.from('ir_event_organizers').update({ name, detail, updated_at: Math.floor(Date.now() / 1000) }).eq('id', eoId),
        supabase.from('ir_users').update({ username: username.trim().toLowerCase(), display_name: name }).eq('id', user.id),
      ]);
      if (eoError) throw eoError;
      if (userError) throw userError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['eo', 'user-info'] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">EO Profile</h1>

      {/* Profile Card */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          {eoInfo?.image ? (
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${eoInfo.image}`}
              alt="" className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
              {eoInfo?.name?.charAt(0)?.toUpperCase() || 'E'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{eoInfo?.name || 'EO'}</h2>
              <BadgeCheck size={20} className="text-violet-400" />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
              <span className="flex items-center gap-1"><AtSign size={14} /> {userInfo?.username || '—'}</span>
              <span className="flex items-center gap-1"><Users size={14} /> {followerCount} followers</span>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">EO Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Username <span className="text-slate-500 text-xs">(shown on posts)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Description</label>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 h-28 resize-none" required />
          </div>
          <button type="submit" disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            <Save size={16} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
