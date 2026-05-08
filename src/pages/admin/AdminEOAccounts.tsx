import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, UserCog } from 'lucide-react';
import bcryptjs from 'bcryptjs';

export default function AdminEOAccounts() {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', detail: '', image: '', email: '', password: '', username: '' });
  const queryClient = useQueryClient();

  const { data: eos, isLoading } = useQuery({
    queryKey: ['admin', 'eo-accounts'],
    queryFn: async () => {
      // Get EO entries from users_admin table with roles_id = 2
      const { data: adminEntries } = await supabase
        .from('ir_users_admin')
        .select('id, users_id, event_organizers_id, created_at')
        .eq('roles_id', 2);

      if (!adminEntries || adminEntries.length === 0) return [];

      const userIds = adminEntries.map((e) => e.users_id).filter(Boolean);
      const eoIds = adminEntries.map((e) => e.event_organizers_id).filter(Boolean);

      const { data: users } = await supabase
        .from('ir_users')
        .select('id, display_name, username, email, photo')
        .in('id', userIds);

      const { data: eoData } = await supabase
        .from('ir_event_organizers')
        .select('*')
        .in('id', eoIds);

      return adminEntries.map((entry) => ({
        ...entry,
        user: users?.find((u) => u.id === entry.users_id),
        eo: eoData?.find((e) => e.id === entry.event_organizers_id),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      // 1. Create user account
      const hashedPassword = await bcryptjs.hash(formData.password, 10);
      const username = formData.username.trim().toLowerCase().replace(/\s+/g, '_');

      const { data: newUser, error: userError } = await supabase
        .from('ir_users')
        .insert({
          display_name: formData.name,
          email: formData.email,
          username,
          username_anonymous: username + '_anon',
          display_name_anonymous: 'Anonymous ' + formData.name,
          password: hashedPassword,
          status: 1,
          created_at: Math.floor(Date.now() / 1000),
        })
        .select('id')
        .single();
      if (userError) throw userError;

      // 2. Create EO entry
      const { data: newEO, error: eoError } = await supabase
        .from('ir_event_organizers')
        .insert({
          name: formData.name,
          detail: formData.detail,
          image: formData.image || null,
          created_at: Math.floor(Date.now() / 1000),
        })
        .select('id')
        .single();
      if (eoError) throw eoError;

      // 3. Link in users_admin with roles_id = 2 (EO)
      const { error: linkError } = await supabase
        .from('ir_users_admin')
        .insert({
          roles_id: 2,
          users_id: newUser.id,
          event_organizers_id: newEO.id,
          created_at: Math.floor(Date.now() / 1000),
        });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'eo-accounts'] });
      toast.success('EO account created');
      setShowModal(false);
      resetForm();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to create EO account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('ir_users_admin')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'eo-accounts'] });
      toast.success('EO access removed');
    },
    onError: () => toast.error('Failed to remove EO access'),
  });

  const resetForm = () => {
    setForm({ name: '', detail: '', image: '', email: '', password: '', username: '' });
    setEditId(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">EO Accounts</h1>
          <p className="text-slate-400 mt-1">Manage Event Organizer access</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create EO
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/50">
              {['EO Name', 'Username', 'Email', 'Created', 'Actions'].map((h) => (
                <th key={h} className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-500">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : eos?.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-500">No EO accounts yet</td></tr>
            ) : (
              eos?.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center">
                        <UserCog size={16} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{entry.eo?.name || '-'}</p>
                        <p className="text-xs text-slate-500 max-w-[200px] truncate">{entry.eo?.detail || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-sm text-slate-300 font-mono">@{entry.user?.username || '-'}</td>
                  <td className="py-3 px-6 text-sm text-slate-400">{entry.user?.email || '-'}</td>
                  <td className="py-3 px-6 text-sm text-slate-400">
                    {entry.created_at
                      ? new Date(entry.created_at * 1000).toLocaleDateString('id-ID')
                      : '-'}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm('Remove EO access?')) deleteMutation.mutate(entry.id);
                        }}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Create EO Account</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">EO Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Username <span className="text-slate-500 text-xs">(used on posts)</span></label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                  placeholder="e.g. soundrush_official"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-20 resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending ? 'Creating...' : 'Create EO Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
