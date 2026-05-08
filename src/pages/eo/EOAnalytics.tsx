import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { TrendingUp, Users, Eye, MessageSquare, BarChart3, Calendar } from 'lucide-react';

export default function EOAnalytics() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data, isLoading } = useQuery({
    queryKey: ['eo', 'analytics', eoId],
    queryFn: async () => {
      if (!eoId) return null;

      // 1. Fetch EO's events with their impressions
      const { data: events } = await supabase
        .from('ir_content_details')
        .select('id, title, impression, slug, created_at')
        .eq('event_organizers_id', eoId)
        .order('impression', { ascending: false });

      const eventIds = events?.map(e => e.id) || [];

      // 2. Fetch groups for these events and their member counts
      const { data: groups } = await supabase
        .from('ir_groups')
        .select('id, title, content_details_id, max_members, slug')
        .in('content_details_id', eventIds);

      // 3. Aggregate metrics
      const totalImpressions = events?.reduce((acc, e) => acc + (e.impression || 0), 0) || 0;
      const totalGroups = groups?.length || 0;
      
      // Calculate average impressions per event
      const avgImpressions = events?.length ? Math.round(totalImpressions / events.length) : 0;

      return {
        events: events || [],
        groups: groups || [],
        metrics: {
          totalImpressions,
          totalGroups,
          avgImpressions
        }
      };
    },
    enabled: !!eoId
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Event Analytics</h1>
        <p className="text-slate-400 mt-1">Detailed performance metrics for your events</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Impressions', value: data?.metrics.totalImpressions, icon: <Eye size={20} className="text-emerald-400" />, bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Active Groups', value: data?.metrics.totalGroups, icon: <MessageSquare size={20} className="text-blue-400" />, bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Avg Impressions/Event', value: data?.metrics.avgImpressions, icon: <BarChart3 size={20} className="text-violet-400" />, bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border rounded-2xl p-6 flex flex-col gap-3 transition-transform hover:scale-[1.02]`}>
            <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center">
              {stat.icon}
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stat.value?.toLocaleString()}</p>
              <p className="text-sm font-medium text-slate-400 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Events Performance Table */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Event Performance</h2>
            <TrendingUp size={20} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {data?.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{e.title}</p>
                    <p className="text-xs text-slate-500">/{e.slug}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{e.impression?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Impressions</p>
                </div>
              </div>
            ))}
            {(!data?.events || data.events.length === 0) && (
              <p className="text-center py-8 text-slate-500 text-sm">No events found</p>
            )}
          </div>
        </div>

        {/* Groups Distribution */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Groups & Capacity</h2>
            <Users size={20} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {data?.groups.map((g) => {
              const event = data.events.find(e => e.id === g.content_details_id);
              return (
                <div key={g.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{g.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{event?.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-400">{g.max_members}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Capacity</p>
                  </div>
                </div>
              );
            })}
            {(!data?.groups || data.groups.length === 0) && (
              <p className="text-center py-8 text-slate-500 text-sm">No groups found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
