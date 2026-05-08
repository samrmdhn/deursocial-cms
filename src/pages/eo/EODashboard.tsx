import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Calendar, Users, FileText, Image } from 'lucide-react';

export default function EODashboard() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: eventCount } = useQuery({
    queryKey: ['eo', 'event-count', eoId],
    queryFn: async () => {
      if (!eoId) return 0;
      const { count } = await supabase
        .from('ir_content_details')
        .select('*', { count: 'exact', head: true })
        .eq('event_organizers_id', eoId);
      return count || 0;
    },
    enabled: !!eoId,
  });

  const { data: eoInfo } = useQuery({
    queryKey: ['eo', 'info', eoId],
    queryFn: async () => {
      if (!eoId) return null;
      const { data } = await supabase
        .from('ir_event_organizers')
        .select('*')
        .eq('id', eoId)
        .single();
      return data;
    },
    enabled: !!eoId,
  });

  const stats = [
    { label: 'My Events', value: eventCount ?? '...', icon: <Calendar size={22} />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome, {eoInfo?.name || user?.display_name || 'Event Organizer'}
        </h1>
        <p className="text-slate-400 mt-1">Your Event Organizer dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* EO Info */}
      {eoInfo && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">EO Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {eoInfo.image ? (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${eoInfo.image}`}
                  alt="" className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 text-xl font-bold">
                  {eoInfo.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-white">{eoInfo.name}</p>
                <p className="text-slate-400">{eoInfo.detail}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
