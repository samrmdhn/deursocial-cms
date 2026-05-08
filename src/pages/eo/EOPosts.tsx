import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Send, FileText, Upload, X, Crop as CropIcon, LayoutList, Heart, MessageCircle, ChevronLeft, ChevronRight, Reply } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import ImageCropper from '@/components/ImageCropper';

interface PostImage {
  file?: File;
  preview: string;
  blob?: Blob;
}

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const resolveImg = (f: string) => (f?.startsWith('http') ? f : `${IMG_BASE}${f}`);

export default function EOPosts() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'create' | 'browse'>('create');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [browseEvent, setBrowseEvent] = useState('');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<PostImage[]>([]);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ commentId: number } | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: events } = useQuery({
    queryKey: ['eo', 'events-for-posts', eoId],
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

  const { data: browsePosts, isLoading: browseLoading } = useQuery({
    queryKey: ['eo', 'browse-posts', browseEvent, browsePage],
    queryFn: async () => {
      if (!browseEvent) return null;
      const eventSlug = events?.find((e) => String(e.id) === browseEvent)?.slug;
      if (!eventSlug) return null;
      const res = await api.get(`/api/eo/events/${eventSlug}/posts`, { params: { page: browsePage, limit: 20 } });
      return res.data;
    },
    enabled: !!browseEvent && !!events,
  });

  const { data: comments } = useQuery({
    queryKey: ['eo', 'post-comments', selectedPostSlug],
    queryFn: async () => {
      if (!selectedPostSlug) return [];
      const res = await api.get(`/api/comment/post/${selectedPostSlug}`);
      return res.data?.data || [];
    },
    enabled: !!selectedPostSlug,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) { toast.error('Maximum 3 images allowed'); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, { file, preview: reader.result as string }]);
      reader.readAsDataURL(file);
    });
  };

  const handleCropComplete = (blob: Blob) => {
    if (croppingIndex !== null) {
      const preview = URL.createObjectURL(blob);
      setImages(prev => { const next = [...prev]; next[croppingIndex] = { ...next[croppingIndex], blob, preview }; return next; });
      setCroppingIndex(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) throw new Error('Select an event');
      const eventSlug = events?.find((e) => String(e.id) === selectedEvent)?.slug;
      if (!eventSlug) throw new Error('Event not found');

      const imageUrls = await Promise.all(
        images.map(async (img) => {
          const fileToUpload = img.blob ? new File([img.blob], 'post.jpg', { type: 'image/jpeg' }) : img.file;
          if (!fileToUpload) return null;
          return uploadImageToBucket(fileToUpload, 'post-images', 'official');
        })
      );

      const fd = new FormData();
      fd.append('caption_post', caption);
      (imageUrls.filter(Boolean) as string[]).forEach((url) => fd.append('image_urls[]', url));

      await api.post(`/api/event/official-posts/${eventSlug}`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'browse-posts'] });
      toast.success('Official update posted');
      setCaption(''); setSelectedEvent(''); setImages([]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to post update'),
  });

  const likeMutation = useMutation({
    mutationFn: async (slug: string) => api.post(`/api/event/post/like/${slug}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eo', 'browse-posts'] }),
    onError: () => toast.error('Failed to toggle like'),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ postSlug, commentId, text }: { postSlug: string; commentId: number; text: string }) => {
      await api.post(`/api/comment/post/${postSlug}`, { comment_post: text, parent_id: commentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'post-comments', selectedPostSlug] });
      toast.success('Reply sent');
      setReplyingTo(null); setReplyText('');
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const formatDate = (val: string | number) => {
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const pagination = browsePosts?.meta?.pagination;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Official Posts</h1>
        <p className="text-slate-400 mt-1">Post and manage official updates</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-800/50 p-1 w-fit">
        {(['create', 'browse'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === tab ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab === 'create'
              ? <span className="flex items-center gap-2"><Send size={14} /> Create</span>
              : <span className="flex items-center gap-2"><LayoutList size={14} /> Browse</span>}
          </button>
        ))}
      </div>

      {activeTab === 'create' && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-300">New Official Update</h2>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
            <option value="">Select event...</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your official update..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 h-24 resize-none" />
          <div className="flex flex-wrap gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700/50 group">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setCroppingIndex(index)} className="p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"><CropIcon size={14} /></button>
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== index))} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg"><X size={14} /></button>
                </div>
              </div>
            ))}
            {images.length < 3 && (
              <label className="w-24 h-24 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer border border-slate-700/50 border-dashed">
                <Upload size={20} /><span className="text-[10px] mt-1">Add Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
          <button onClick={() => createMutation.mutate()} disabled={!selectedEvent || !caption || createMutation.isPending}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            <Send size={16} /> Post Update
          </button>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-4">
          <select value={browseEvent} onChange={(e) => { setBrowseEvent(e.target.value); setBrowsePage(1); setSelectedPostSlug(null); }}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full max-w-xs">
            <option value="">Select event to browse...</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>

          {!browseEvent ? (
            <div className="py-12 text-center text-slate-500">Select an event to browse its posts</div>
          ) : browseLoading ? (
            <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Posts list */}
              <div className="space-y-3">
                {!browsePosts?.data?.length ? (
                  <div className="py-8 text-center text-slate-500">No posts in this event</div>
                ) : (
                  browsePosts.data.map((post: any) => (
                    <div key={post.slug}
                      onClick={() => setSelectedPostSlug(selectedPostSlug === post.slug ? null : post.slug)}
                      className={`bg-slate-900/50 border rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-600/50 ${selectedPostSlug === post.slug ? 'border-violet-500/50' : 'border-slate-800/50'}`}>
                      <div className="flex items-start gap-3">
                        {post.author?.image
                          ? <img src={resolveImg(post.author.image)} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                          : <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0"><FileText size={14} className="text-violet-400" /></div>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{post.author?.name}</span>
                            {post.is_official && <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium">Official</span>}
                          </div>
                          <span className="text-xs text-slate-500">@{post.author?.username}</span>
                          <p className="text-sm text-slate-300 mt-1 line-clamp-2">{post.caption}</p>
                          {post.images?.length > 0 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto">
                              {post.images.slice(0, 3).map((img: any, i: number) => (
                                <img key={i} src={resolveImg(img.image || img.file)} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="" />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); likeMutation.mutate(post.slug); }}
                              className={`flex items-center gap-1 text-xs transition-colors ${post.is_liked ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`}>
                              <Heart size={13} fill={post.is_liked ? 'currentColor' : 'none'} /> {post.total_likes}
                            </button>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MessageCircle size={13} /> {post.total_comments}
                            </span>
                            <span className="text-xs text-slate-600 ml-auto">{post.created_at ? formatDate(post.created_at) : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {pagination && pagination.total_page > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => setBrowsePage(p => Math.max(1, p - 1))} disabled={browsePage === 1}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-slate-400">Page {pagination.current_page} of {pagination.total_page}</span>
                    <button onClick={() => setBrowsePage(p => Math.min(pagination.total_page, p + 1))} disabled={browsePage >= pagination.total_page}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Comments panel */}
              {selectedPostSlug && (
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 h-fit">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Comments</h3>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {!comments?.length ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No comments yet</p>
                    ) : comments.map((c: any) => (
                      <div key={c.id} className="space-y-2">
                        <div className="bg-slate-800/50 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-300">@{c.username || c.user?.username}</span>
                            <button onClick={() => setReplyingTo(replyingTo?.commentId === c.id ? null : { commentId: c.id })}
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 cursor-pointer">
                              <Reply size={12} /> Reply
                            </button>
                          </div>
                          <p className="text-sm text-slate-200 mt-1">{c.comment_post || c.text}</p>
                        </div>
                        {c.replies?.map((r: any) => (
                          <div key={r.id} className="ml-6 bg-slate-800/30 rounded-xl p-2.5">
                            <span className="text-xs font-medium text-slate-400">@{r.username || r.user?.username}</span>
                            <p className="text-sm text-slate-300 mt-0.5">{r.comment_post || r.text}</p>
                          </div>
                        ))}
                        {replyingTo?.commentId === c.id && (
                          <div className="ml-6 flex gap-2">
                            <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" />
                            <button onClick={() => replyMutation.mutate({ postSlug: selectedPostSlug, commentId: c.id, text: replyText })}
                              disabled={!replyText.trim() || replyMutation.isPending}
                              className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg disabled:opacity-50 cursor-pointer">
                              Send
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-2 py-2 text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {croppingIndex !== null && (
        <ImageCropper src={images[croppingIndex].preview} onCropComplete={handleCropComplete} onCancel={() => setCroppingIndex(null)} aspect={1} />
      )}
    </div>
  );
}
