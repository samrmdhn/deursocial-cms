import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import {
  Search, Eye, EyeOff, TrendingUp, Handshake, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, ExternalLink,
} from 'lucide-react';

export default function AdminEvents() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'pending' | 'trending'>('all');
  const limit = 15;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', search, page, filter],
    queryFn: async () => {
      let query = supabase
        .from('ir_content_details')
        .select(`
          id, title, slug, image, status, is_trending, description,
          schedule_start, schedule_end, date_start, date_end,
          vanues_id, event_organizers_id, contents_id, impression,
          created_at, updated_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (filter === 'trending') {
        query = query.eq('is_trending', 1);
      }
      if (filter === 'pending') {
        query = query.eq('status', 2);
      }

      const { data, count } = await query;

      // Fetch EO names
      const eoIds = [...new Set((data || []).map((e) => e.event_organizers_id).filter(Boolean))];
      let eoMap: Record<number, string> = {};
      if (eoIds.length > 0) {
        const { data: eos } = await supabase
          .from('ir_event_organizers')
          .select('id, name')
          .in('id', eoIds);
        eoMap = Object.fromEntries((eos || []).map((e) => [e.id, e.name]));
      }

      // Fetch venue names
      const venueIds = [...new Set((data || []).map((e) => e.vanues_id).filter(Boolean))];
      let venueMap: Record<number, string> = {};
      if (venueIds.length > 0) {
        const { data: venues } = await supabase
          .from('ir_vanues')
          .select('id, title')
          .in('id', venueIds);
        venueMap = Object.fromEntries((venues || []).map((v) => [v.id, v.title]));
      }

      return {
        events: (data || []).map((e) => ({
          ...e,
          eo_name: eoMap[e.event_organizers_id] || '-',
          venue_name: venueMap[e.vanues_id] || '-',
        })),
        total: count || 0,
      };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: number }) => {
      const { error } = await supabase
        .from('ir_content_details')
        .update({ [field]: value, updated_at: Math.floor(Date.now() / 1000) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event updated');
    },
    onError: () => toast.error('Failed to update event'),
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);
  const statusLabels: Record<number, { label: string; color: string }> = {
    0: { label: 'Ended', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    1: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    2: { label: 'Pending Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    3: { label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '-';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Events</h1>
            <p className="text-slate-400 mt-1">{data?.total ?? 0} events total</p>
          </div>
          <Link
            to="/admin/events/create"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
          >
            Create Event
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-800/50 p-1">
            {(['all', 'pending', 'trending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pending' ? 'Pending Review' : 'Trending'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search events..."
              className="pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-56"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                {['Event', 'EO', 'Venue', 'Status', 'Trending', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : (
                data?.events.map((event) => {
                  const st = statusLabels[event.status] || statusLabels[2];
                  return (
                    <tr key={event.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 max-w-[250px]">
                          {event.image ? (
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${event.image}`}
                              alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              <Clock size={16} className="text-indigo-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{event.title}</p>
                            <p className="text-xs text-slate-500 truncate">/{event.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-400">{event.eo_name}</td>
                      <td className="py-3 px-5 text-sm text-slate-400">{event.venue_name}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: event.id,
                              field: 'is_trending',
                              value: event.is_trending === 1 ? 0 : 1,
                            })
                          }
                          className={`p-2 rounded-lg transition-all cursor-pointer ${
                            event.is_trending === 1
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'text-slate-500 hover:bg-slate-800/50'
                          }`}
                          title={event.is_trending === 1 ? 'Remove trending' : 'Set trending'}
                        >
                          <TrendingUp size={16} />
                        </button>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-400">
                        {formatDate(event.date_start)}
                      </td>
                      <td className="py-3 px-5">
                        <Link
                          to="/admin/events/$eventId"
                          params={{ eventId: String(event.id) }}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-indigo-400 transition-all inline-flex"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/50">
            <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 disabled:opacity-30 cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
