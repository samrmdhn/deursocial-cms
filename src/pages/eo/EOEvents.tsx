import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import { Calendar, Clock, CheckCircle, XCircle, ExternalLink, Pencil } from 'lucide-react';

export default function EOEvents() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: events, isLoading } = useQuery({
    queryKey: ['eo', 'events', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug, image, status, is_trending, date_start, date_end, vanues_id, created_at, rejection_reason')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });

      // Fetch venue names
      const venueIds = [...new Set((data || []).map((e) => e.vanues_id).filter(Boolean))];
      let venueMap: Record<number, string> = {};
      if (venueIds.length > 0) {
        const { data: venues } = await supabase.from('ir_vanues').select('id, title').in('id', venueIds);
        venueMap = Object.fromEntries((venues || []).map((v) => [v.id, v.title]));
      }

      return (data || []).map((e) => ({
        ...e,
        venue_name: venueMap[e.vanues_id] || '-',
      }));
    },
    enabled: !!eoId,
  });

  const statusLabels: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
    0: { label: 'Ended', icon: <XCircle size={14} />, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    1: { label: 'Live', icon: <CheckCircle size={14} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    2: { label: 'Pending Review', icon: <Clock size={14} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    3: { label: 'Rejected', icon: <XCircle size={14} />, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '-';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <p className="text-slate-400 mt-1">{events?.length ?? 0} events created</p>
        </div>
        <Link
          to="/eo/events/create"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all"
        >
          <Calendar size={16} />
          New Event
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 animate-pulse">
              <div className="h-32 bg-slate-800 rounded-xl mb-3" />
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-800/50 rounded w-1/2" />
            </div>
          ))
        ) : events?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No events yet. Create your first event!</div>
        ) : (
          events?.map((event) => {
            const st = statusLabels[event.status] || statusLabels[2];
            return (
              <div key={event.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden group hover:border-violet-500/30 transition-all">
                {event.image ? (
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${event.image}`}
                    alt="" className="w-full h-36 object-cover"
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                    <Calendar size={32} className="text-violet-400/40" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{event.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{event.venue_name} · {formatDate(event.date_start)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border flex-shrink-0 ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <Link
                      to="/eo/events/$eventId/edit"
                      params={{ eventId: String(event.id) }}
                      className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <Pencil size={12} />
                      {event.status === 3 ? 'Edit & Resubmit' : 'Edit Event'}
                    </Link>
                  </div>
                </div>
                {event.status === 3 && event.rejection_reason && (
                  <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
                    <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                      <XCircle size={12} />
                      Rejection Reason:
                    </p>
                    <p className="text-xs text-red-300/80 mt-1 pl-4">
                      {event.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
