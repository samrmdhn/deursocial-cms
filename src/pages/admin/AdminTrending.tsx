import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Activity, Users, MessageSquare, Image as ImageIcon, Star } from 'lucide-react';

export default function AdminTrending() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'trending-metrics'],
    queryFn: async () => {
      // Fetch exact counts
      const [users, groups, posts, events] = await Promise.all([
        supabase.from('ir_users').select('id', { count: 'exact', head: true }),
        supabase.from('ir_groups').select('id', { count: 'exact', head: true }),
        supabase.from('ir_official_posts').select('id', { count: 'exact', head: true }),
        supabase.from('ir_content_details').select('id', { count: 'exact', head: true }),
      ]);

      // fetch top 5 most active groups (by max_members as proxy)
      const { data: topGroups } = await supabase
        .from('ir_groups')
        .select('title, max_members')
        .order('max_members', { ascending: false })
        .limit(5);

      // fetch top events
      const { data: topEvents } = await supabase
        .from('ir_content_details')
        .select('title, impression')
        .order('impression', { ascending: false })
        .limit(5);

      return {
        counts: {
          users: users.count || 0,
          groups: groups.count || 0,
          posts: posts.count || 0,
          events: events.count || 0,
        },
        topGroups: topGroups || [],
        topEvents: topEvents || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Trending Metrics</h1>
        <p className="text-slate-400 mt-1">Platform-wide activity and statistics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data?.counts.users, icon: <Users size={20} className="text-indigo-400" /> },
          { label: 'Active Groups', value: data?.counts.groups, icon: <MessageSquare size={20} className="text-blue-400" /> },
          { label: 'Official Posts', value: data?.counts.posts, icon: <Star size={20} className="text-yellow-400" /> },
          { label: 'Events', value: data?.counts.events, icon: <Activity size={20} className="text-emerald-400" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 flex flex-col gap-3 hover:bg-slate-800/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Groups (Capacity)</h2>
          <div className="space-y-4">
            {data?.topGroups.map((g, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                <p className="text-slate-300 font-medium">{g.title}</p>
                <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">{g.max_members} max capacity</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Trending Events (Impressions)</h2>
          <div className="space-y-4">
            {data?.topEvents.map((e, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                <p className="text-slate-300 font-medium">{e.title}</p>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">{e.impression} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
