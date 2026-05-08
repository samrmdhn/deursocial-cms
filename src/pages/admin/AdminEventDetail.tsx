import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft, TrendingUp, Eye, EyeOff, Handshake,
  Users, MessageSquare, Image, Calendar, MapPin, CheckCircle, XCircle
} from 'lucide-react';
import { useState } from 'react';

export default function AdminEventDetail() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const queryClient = useQueryClient();
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_content_details')
        .select('*')
        .eq('id', Number(eventId))
        .single();

      // Get EO name
      let eoName = '-';
      if (data?.event_organizers_id) {
        const { data: eo } = await supabase
          .from('ir_event_organizers')
          .select('name')
          .eq('id', data.event_organizers_id)
          .single();
        eoName = eo?.name || '-';
      }

      // Get venue name
      let venueName = '-';
      if (data?.vanues_id) {
        const { data: venue } = await supabase
          .from('ir_vanues')
          .select('title')
          .eq('id', data.vanues_id)
          .single();
        venueName = venue?.title || '-';
      }

      // Get follower count
      const { count: followerCount } = await supabase
        .from('ir_content_detail_followers')
        .select('*', { count: 'exact', head: true })
        .eq('content_details_id', Number(eventId));

      // Get groups
      const { data: groups } = await supabase
        .from('ir_groups')
        .select('id, title, slug, max_members, status')
        .eq('content_details_id', Number(eventId));

      return {
        ...data,
        eo_name: eoName,
        venue_name: venueName,
        follower_count: followerCount || 0,
        groups: groups || [],
      };
    },
    enabled: !!eventId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ field, value, reason }: { field: string; value: number; reason?: string }) => {
      const updateData: any = { [field]: value, updated_at: Math.floor(Date.now() / 1000) };
      if (reason !== undefined) {
        updateData.rejection_reason = reason;
      }
      const { error } = await supabase
        .from('ir_content_details')
        .update(updateData)
        .eq('id', Number(eventId));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] });
      toast.success('Updated');
    },
  });

  const formatDate = (epoch: number | null) => {
    if (!epoch) return '-';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-400">Event not found</div>
    );
  }

  const statusLabels: Record<number, string> = { 0: 'Ended', 1: 'Approved/Live', 2: 'Pending Review', 3: 'Rejected' };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <Link to="/admin/events" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors">
          <ArrowLeft size={16} />
          Back to Events
        </Link>
        <Link 
          to="/admin/events/$eventId/edit" 
          params={{ eventId: String(eventId) }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
        >
          Edit Event
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        {event.image && (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${event.image}`}
            alt=""
            className="w-full lg:w-80 h-48 object-cover rounded-2xl"
          />
        )}
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          <p className="text-slate-400 text-sm">{event.description || 'No description'}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              {formatDate(event.date_start)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-400" />
              {event.venue_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-indigo-400" />
              {event.follower_count} followers
            </span>
          </div>
        </div>
      </div>

      {/* Review Banner for Pending Events */}
      {event.status === 2 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-amber-400 font-semibold text-lg flex items-center gap-2">
              Pending Review
            </h3>
            <p className="text-amber-500/80 text-sm mt-1">This event was submitted by the EO and requires your approval to go live.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowDenyModal(true)}
              className="flex-1 md:flex-none px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-all"
            >
              Deny
            </button>
            <button
              onClick={() => toggleMutation.mutate({ field: 'status', value: 1, reason: undefined })}
              className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => toggleMutation.mutate({ field: 'status', value: event.status === 1 ? 0 : 1 })}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
            event.status === 1
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-slate-800/30 border-slate-700/50 text-slate-400'
          }`}
        >
          {event.status === 1 ? <Eye size={20} /> : <EyeOff size={20} />}
          <div className="text-left">
            <p className="text-sm font-medium">Visibility</p>
            <p className="text-xs opacity-70">{statusLabels[event.status] || 'Unknown'}</p>
          </div>
        </button>

        <button
          onClick={() => toggleMutation.mutate({ field: 'is_trending', value: event.is_trending === 1 ? 0 : 1 })}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
            event.is_trending === 1
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-slate-800/30 border-slate-700/50 text-slate-400'
          }`}
        >
          <TrendingUp size={20} />
          <div className="text-left">
            <p className="text-sm font-medium">Trending</p>
            <p className="text-xs opacity-70">{event.is_trending === 1 ? 'Active' : 'Inactive'}</p>
          </div>
        </button>

        <div className="flex items-center gap-3 p-4 rounded-2xl border bg-violet-500/10 border-violet-500/20 text-violet-400">
          <Handshake size={20} />
          <div className="text-left">
            <p className="text-sm font-medium">EO</p>
            <p className="text-xs opacity-70">{event.eo_name}</p>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-400" />
            Event Groups ({event.groups?.length || 0})
          </h2>
        </div>
        {event.groups?.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">No groups for this event</div>
        ) : (
          <div className="divide-y divide-slate-800/30">
            {event.groups?.map((group: { id: number; title: string; slug: string; max_members: number; status: number }) => (
              <div key={group.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-200">{group.title}</p>
                  <p className="text-xs text-slate-500">/{group.slug}</p>
                </div>
                <span className="text-xs text-slate-400">
                  Max {group.max_members} members
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#09090b] border border-slate-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Deny Event</h2>
            <p className="text-slate-400 text-sm mb-4">Please provide a reason. The Event Organizer will see this feedback so they can fix the issues and resubmit.</p>
            
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="E.g., The event description is too vague, please add more details."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 h-32 resize-none mb-6"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setDenyReason('');
                }}
                className="flex-1 py-2.5 text-slate-300 font-medium bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!denyReason.trim()}
                onClick={() => {
                  toggleMutation.mutate({ field: 'status', value: 3, reason: denyReason });
                  setShowDenyModal(false);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Confirm Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
