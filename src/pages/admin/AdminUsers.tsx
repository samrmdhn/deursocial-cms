import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Search,
  Ban,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: async () => {
      let query = supabase
        .from('ir_users')
        .select('id, display_name, username, email, photo, status, created_at, is_verified, gender', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, count } = await query;
      return { users: data || [], total: count || 0 };
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: number; currentStatus: number }) => {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const { error } = await supabase
        .from('ir_users')
        .update({ status: newStatus })
        .eq('id', userId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(newStatus === 0 ? 'User banned' : 'User unbanned');
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const formatDate = (epoch: number) =>
    new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 mt-1">
            Manage platform users · {data?.total ?? 0} total
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            className="pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
          />
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                {['User', 'Email', 'Status', 'Verified', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <Link to="/admin/users/$userId" params={{ userId: user.id.toString() }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          {user.photo ? (
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${user.photo}`}
                              alt="" className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                              {user.display_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-indigo-400 hover:text-indigo-300">{user.display_name}</p>
                            <p className="text-xs text-slate-500">@{user.username}</p>
                          </div>
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-400">{user.email}</td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                        user.status === 1
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {user.status === 1 ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {user.is_verified === 1 ? (
                        <ShieldCheck size={16} className="text-blue-400" />
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-400">
                      {user.created_at ? formatDate(user.created_at) : '-'}
                    </td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => banMutation.mutate({ userId: user.id, currentStatus: user.status })}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          user.status === 1
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={user.status === 1 ? 'Ban user' : 'Unban user'}
                      >
                        <Ban size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/50">
            <p className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
