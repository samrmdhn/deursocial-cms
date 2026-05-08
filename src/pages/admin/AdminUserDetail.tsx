import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, UserCircle, Mail, ShieldCheck, MapPin, Phone, Calendar, Flag } from 'lucide-react';

export default function AdminUserDetail() {
  const { userId } = useParams({ strict: false }) as { userId: string };
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_users')
        .select('*')
        .eq('id', Number(userId))
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const formatDate = (epoch?: number) => {
    if (!epoch) return '-';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-white">
        <p>User not found.</p>
        <button onClick={() => navigate({ to: '/admin/users' })} className="mt-4 text-indigo-400">Back</button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <button
        onClick={() => navigate({ to: '/admin/users' })}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Users
      </button>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-1/3 flex flex-col items-center text-center space-y-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800/50 bg-slate-800 flex items-center justify-center">
            {user.photo ? (
              <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${user.photo}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={64} className="text-slate-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              {user.display_name}
              {user.is_verified === 1 && <ShieldCheck size={20} className="text-blue-400" />}
            </h1>
            <p className="text-slate-400">@{user.username}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              user.status === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {user.status === 1 ? 'Active' : 'Banned'}
            </span>
          </div>
        </div>

        <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><Mail size={16} /> Email</p>
              <p className="text-slate-200 mt-1">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><Phone size={16} /> Phone</p>
              <p className="text-slate-200 mt-1">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><UserCircle size={16} /> Gender</p>
              <p className="text-slate-200 mt-1 capitalize">{user.gender || '-'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin size={16} /> Location</p>
              <p className="text-slate-200 mt-1">{user.city || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={16} /> Joined Date</p>
              <p className="text-slate-200 mt-1">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 flex items-center gap-2"><Flag size={16} /> Country Code</p>
              <p className="text-slate-200 mt-1">{user.country_code || '-'}</p>
            </div>
          </div>
          <div className="col-span-full">
            <p className="text-sm text-slate-500">Bio</p>
            <p className="text-slate-200 mt-1 bg-slate-800/30 p-4 rounded-xl">{user.description || 'No bio provided.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
