import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Download, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EOMoments() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: events } = useQuery({
    queryKey: ['eo', 'events-for-moments', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!eoId,
  });

  const { data: moments, isLoading } = useQuery({
    queryKey: ['eo', 'moments', eoId],
    queryFn: async () => {
      if (!eoId || !events || events.length === 0) return [];
      const eventIds = events.map((e) => e.id);

      // Get posts (moments) for these events
      const { data: posts } = await supabase
        .from('ir_post_content_details')
        .select('id, slug, file, type, created_at, content_details_id')
        .in('content_details_id', eventIds)
        .eq('type', 2) // moments type
        .order('created_at', { ascending: false })
        .limit(100);

      if (!posts || posts.length === 0) return [];

      // Get files for these posts
      const postIds = posts.map((p) => p.id);
      const { data: files } = await supabase
        .from('ir_file_post_content_details')
        .select('id, file, post_content_details_id')
        .in('post_content_details_id', postIds);

      const eventMap = Object.fromEntries(events.map((e) => [e.id, e.title]));

      return posts.map((p) => ({
        ...p,
        event_title: eventMap[p.content_details_id] || '-',
        files: (files || []).filter((f) => f.post_content_details_id === p.id),
      }));
    },
    enabled: !!eoId && !!events && events.length > 0,
  });

  const handleDownload = async (url: string, filename: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${url}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error('Download failed');
    }
  };

  const formatDate = (epoch: number) =>
    new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moments</h1>
        <p className="text-slate-400 mt-1">View and download moments from your events</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : moments?.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800/50 rounded-2xl">
          No moments yet
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {moments?.map((moment) => (
            <div key={moment.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden group">
              {moment.file ? (
                <div className="relative">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${moment.file}`}
                    alt="" className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => handleDownload(moment.file, `moment-${moment.slug}.jpg`)}
                    className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ) : moment.files?.length > 0 ? (
                <div className="relative">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${moment.files[0].file}`}
                    alt="" className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => handleDownload(moment.files[0].file, `moment-${moment.slug}.jpg`)}
                    className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-full h-40 bg-slate-800/30 flex items-center justify-center">
                  <ImageIcon size={24} className="text-slate-600" />
                </div>
              )}
              <div className="p-3">
                <p className="text-xs text-slate-400 truncate">{moment.event_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{moment.created_at ? formatDate(moment.created_at) : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
