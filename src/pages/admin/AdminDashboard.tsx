import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Calendar,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function AdminDashboard() {
  const { data: totalUsers } = useQuery({
    queryKey: ['admin', 'total-users'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ir_users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      return count || 0;
    },
  });

  const { data: newUsersToday } = useQuery({
    queryKey: ['admin', 'new-users-today'],
    queryFn: async () => {
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const { count } = await supabase
        .from('ir_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .is('deleted_at', null);
      return count || 0;
    },
  });

  const { data: newUsersWeek } = useQuery({
    queryKey: ['admin', 'new-users-week'],
    queryFn: async () => {
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const { count } = await supabase
        .from('ir_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo)
        .is('deleted_at', null);
      return count || 0;
    },
  });

  const { data: totalEvents } = useQuery({
    queryKey: ['admin', 'total-events'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ir_content_details')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: trendingEvents } = useQuery({
    queryKey: ['admin', 'trending-events'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ir_content_details')
        .select('*', { count: 'exact', head: true })
        .eq('is_trending', 1);
      return count || 0;
    },
  });

  const { data: pendingReports } = useQuery({
    queryKey: ['admin', 'pending-reports'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ir_reported_users')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['admin', 'recent-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_users')
        .select('id, display_name, username, photo, email, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const stats: StatCard[] = [
    {
      label: 'Total Users',
      value: totalUsers ?? '...',
      icon: <Users size={22} />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'New Today',
      value: newUsersToday ?? '...',
      icon: <UserPlus size={22} />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'New This Week',
      value: newUsersWeek ?? '...',
      icon: <TrendingUp size={22} />,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      label: 'Total Events',
      value: totalEvents ?? '...',
      icon: <Calendar size={22} />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Trending Events',
      value: trendingEvents ?? '...',
      icon: <TrendingUp size={22} />,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      label: 'Reports',
      value: pendingReports ?? '...',
      icon: <AlertTriangle size={22} />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
    },
  ];

  const formatDate = (epoch: number) => {
    return new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bgColor} border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} opacity-60`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock size={18} className="text-indigo-400" />
            Recent Registrations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {recentUsers?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      {user.photo ? (
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${user.photo}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                          {user.display_name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-sm text-slate-400">
                    {user.email}
                  </td>
                  <td className="py-3 px-6 text-sm text-slate-400">
                    {user.created_at ? formatDate(user.created_at) : '-'}
                  </td>
                </tr>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
