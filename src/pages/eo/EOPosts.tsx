import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Send, Upload, X, Crop as CropIcon, Plus } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';
import ImageCropper from '@/components/ImageCropper';
import PostCard from '@/components/PostCard';
import MentionInput from '@/components/MentionInput';

const SUPABASE_POST_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const SUPABASE_PROFILE_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/`;

function resolveImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/images/')) return `${SUPABASE_PROFILE_IMAGES}${path.slice(1)}`;
  if (path.startsWith('posts/')) return `${SUPABASE_POST_IMAGES}${path}`;
  if (path.startsWith('images/')) return `${SUPABASE_PROFILE_IMAGES}${path}`;
  return `${SUPABASE_POST_IMAGES}${path}`;
}

type Sort = 'newest' | 'popular' | 'official';

type RatioOption = { label: string; aspect: [number, number] | null };

const RATIO_OPTIONS: RatioOption[] = [
  { label: 'Original', aspect: null },
  { label: '1:1', aspect: [1, 1] },
  { label: '4:5', aspect: [4, 5] },
  { label: '16:9', aspect: [16, 9] },
];

interface PhotoItem {
  file: File;
  preview: string;
  naturalW: number;
  naturalH: number;
  cropOrigin: { x: number; y: number } | null;
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' };

export default function EOPosts() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const queryClient = useQueryClient();

  const [sort, setSort] = useState<Sort>('newest');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createEvent, setCreateEvent] = useState('');
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<RatioOption>(RATIO_OPTIONS[0]);

  const { data: events } = useQuery({
    queryKey: ['eo', 'events-for-posts', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase.from('ir_content_details').select('id, title, slug').eq('event_organizers_id', eoId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!eoId,
  });

  const PAGE_SIZE = 30;

  // Fetch all posts across EO events, paginate client-side
  const { data: allPostsData, isLoading } = useQuery({
    queryKey: ['eo', 'posts-all', eoId, sort, selectedEvent],
    queryFn: async () => {
      if (!eoId || !events || !events.length) return [];

      const mapPost = (p: any) => ({
        id: p.slug,
        slug: p.slug,
        caption_post: p.caption ?? null,
        file: null,
        created_at: Math.floor(new Date(p.created_at).getTime() / 1000),
        event_title: p.event?.title || p.event?.slug || '—',
        files: (p.images || []).map((img: any, i: number) => ({
          id: i,
          file: resolveImageUrl(img.image ?? img.file ?? ''),
        })),
        author: {
          display_name: p.user?.name ?? 'User',
          username: p.user?.username ?? '',
          photo: p.user?.image ? resolveImageUrl(p.user.image) : null,
        },
        like_count: Number(p.total_likes ?? 0),
        comment_count: Number(p.total_comments ?? 0),
        is_liked: p.is_liked ?? false,
        group: p.group ?? null,
        _raw_slug: p.slug,
        users_id: p.users_id,
      });

      const sortParam = sort === 'official' ? 'newest' : sort;

      if (selectedEvent) {
        // Single event — fetch up to 200 (backend handles it correctly)
        const params: Record<string, any> = { page: 1, limit: 200, sort: sortParam, event_slug: selectedEvent };
        if (sort === 'official') params.official = 1;
        const res = await api.get('/api/eo/posts', { params });
        return (res.data?.data ?? []).map(mapPost);
      }

      // All EO events — parallel fetch per slug, merge
      const slugs = events.map((e: any) => e.slug);
      const results = await Promise.all(
        slugs.map(async (slug: string) => {
          const params: Record<string, any> = { page: 1, limit: 200, sort: sortParam, event_slug: slug };
          if (sort === 'official') params.official = 1;
          const res = await api.get('/api/eo/posts', { params });
          return (res.data?.data ?? []).map(mapPost);
        })
      );
      const merged: any[] = results.flat();
      // Deduplicate by slug
      const seen = new Set<string>();
      const deduped = merged.filter((p) => { if (seen.has(p.slug)) return false; seen.add(p.slug); return true; });
      // Sort merged results
      if (sort === 'popular') {
        deduped.sort((a, b) => (b.like_count + b.comment_count * 2) - (a.like_count + a.comment_count * 2));
      } else {
        deduped.sort((a, b) => b.created_at - a.created_at);
      }
      return deduped;
    },
    enabled: !!eoId && !!events,
  });

  const allPosts = allPostsData ?? [];
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);
  const pagedPosts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 3) { toast.error('Maximum 3 images'); return; }
    files.forEach((file) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        setPhotos((prev) => [...prev, { file, preview: url, naturalW: img.naturalWidth, naturalH: img.naturalHeight, cropOrigin: null }]);
      };
      img.src = url;
    });
    e.target.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createEvent) throw new Error('Select an event');
      const eventSlug = events?.find((e: any) => String(e.id) === createEvent)?.slug;
      if (!eventSlug) throw new Error('Event not found');
      const imageUrls = await Promise.all(
        photos.map((p) => uploadImageToBucket(p.file, 'post-images', 'official'))
      );
      const fd = new FormData();
      fd.append('caption_post', caption);
      (imageUrls.filter(Boolean) as string[]).forEach((url) => fd.append('image_urls[]', url));
      if (selectedRatio.aspect) {
        fd.append('crop_aspect', JSON.stringify(selectedRatio.aspect));
        photos.forEach((p) => fd.append('crop_origins[]', JSON.stringify(p.cropOrigin ?? { x: 0.5, y: 0.5 })));
      }
      await api.post(`/api/event/official-posts/${eventSlug}`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'posts'] });
      toast.success('Post created');
      setShowCreate(false);
      setCaption(''); setCreateEvent(''); setPhotos([]); setSelectedRatio(RATIO_OPTIONS[0]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/api/event/post/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'posts'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const SORTS: { key: Sort; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'popular', label: 'Popular' },
    { key: 'official', label: 'Official' },
  ];

  const posts = pagedPosts;

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Posts</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            {totalPosts} posts
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {showCreate ? <X size={12} /> : <Plus size={12} />}
          {showCreate ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 20, marginBottom: 20, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase' }}>New Post</div>

          {/* Event selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6 }}>Event *</label>
            <select value={createEvent} onChange={(e) => setCreateEvent(e.target.value)} style={inp}>
              <option value="">Select event…</option>
              {events?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          {/* Caption */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6 }}>Caption *</label>
            <MentionInput value={caption} onChange={setCaption} placeholder="What's happening at this event? (type @ to mention)" rows={4} />
            <div style={{ textAlign: 'right', fontSize: 10, color: '#333', marginTop: 4 }}>{caption.length}/500</div>
          </div>

          {/* Image previews */}
          {photos.length > 0 && (() => {
            const PREVIEW_W = 120;
            const displayAspect = selectedRatio.aspect ?? [1, 1];
            const PREVIEW_H = Math.round(PREVIEW_W * (displayAspect[1] / displayAspect[0]));

            function getPreviewImageStyle(photo: PhotoItem): React.CSSProperties {
              if (!selectedRatio.aspect) {
                return { width: PREVIEW_W, height: PREVIEW_H, objectFit: 'cover' };
              }
              const [aw, ah] = selectedRatio.aspect;
              const targetRatio = aw / ah;
              const imageRatio = photo.naturalW / photo.naturalH;
              let imgScale: number;
              if (imageRatio > targetRatio) {
                imgScale = PREVIEW_H / photo.naturalH;
              } else {
                imgScale = PREVIEW_W / photo.naturalW;
              }
              const renderedW = photo.naturalW * imgScale;
              const renderedH = photo.naturalH * imgScale;
              const fx = photo.cropOrigin?.x ?? 0.5;
              const fy = photo.cropOrigin?.y ?? 0.5;
              const tx = -fx * Math.max(0, renderedW - PREVIEW_W);
              const ty = -fy * Math.max(0, renderedH - PREVIEW_H);
              return { width: renderedW, height: renderedH, transform: `translate(${tx}px, ${ty}px)`, flexShrink: 0 };
            }

            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((photo, index) => (
                  <div key={index} style={{ position: 'relative', width: PREVIEW_W, height: PREVIEW_H, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e', flexShrink: 0 }}>
                    <img src={photo.preview} alt="" style={{ ...getPreviewImageStyle(photo), display: 'block' }} />
                    {selectedRatio.aspect && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.35)', paddingBlock: 3, textAlign: 'center', fontSize: 10, color: '#fff', pointerEvents: 'none' }}>
                        Tap to adjust
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0, transition: 'opacity 0.15s', background: 'rgba(0,0,0,0.3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}>
                      {selectedRatio.aspect && (
                        <button type="button" onClick={() => setCroppingIndex(index)} title="Adjust crop"
                          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #333', color: '#ccc', borderRadius: 4, padding: '5px 6px', cursor: 'pointer', display: 'flex' }}><CropIcon size={12} /></button>
                      )}
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} title="Remove"
                        style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #333', color: '#e44', borderRadius: 4, padding: '5px 6px', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                    </div>
                    <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '2px 5px', fontSize: 9, color: '#ccc', fontWeight: 700 }}>{index + 1}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Ratio pills — shown when images exist */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>Crop</span>
              {RATIO_OPTIONS.map((r) => {
                const active = selectedRatio.label === r.label;
                return (
                  <button key={r.label} type="button" onClick={() => setSelectedRatio(r)}
                    style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: active ? '#3b82f6' : 'transparent', color: active ? '#fff' : '#555', borderColor: active ? '#3b82f6' : '#2a2a2a' }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add photo button */}
          {photos.length < 3 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0', borderTop: '1px solid #141414', cursor: 'pointer', color: '#3b82f6', fontSize: 13, fontWeight: 500 }}>
              <Upload size={15} />
              Add Photo {photos.length > 0 ? `(${photos.length}/3)` : ''}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange} />
            </label>
          )}

          <button onClick={() => createMutation.mutate()} disabled={!createEvent || !caption.trim() || createMutation.isPending}
            style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!createEvent || !caption.trim()) ? 0.4 : 1 }}>
            <Send size={12} /> {createMutation.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2 }}>
          {SORTS.map((s) => (
            <button key={s.key} onClick={() => { setSort(s.key); setPage(1); }}
              style={{ padding: '5px 14px', borderRadius: 3, border: 'none', cursor: 'pointer', background: sort === s.key ? '#161616' : 'transparent', color: sort === s.key ? '#d0d0d0' : '#444', fontSize: 11, fontWeight: 500 }}>
              {s.label}
            </button>
          ))}
        </div>
        <select value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: selectedEvent ? '#e0e0e0' : '#555', fontSize: 11, outline: 'none' }}>
          <option value="">All my events</option>
          {events?.map((e: any) => <option key={e.id} value={e.slug}>{e.title}</option>)}
        </select>
      </div>

      {/* Posts list */}
      {!events?.length ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No events yet</div>
      ) : isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
        </div>
      ) : !posts.length ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No posts yet</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => deleteMutation.mutate((post as any)._raw_slug)}
                queryKey={['eo', 'posts-all', eoId]}
                showEventLabel={!selectedEvent}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: page === 1 ? '#333' : '#aaa', fontSize: 11, cursor: page === 1 ? 'default' : 'pointer' }}>Prev</button>
              <span style={{ fontSize: 11, color: '#555' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: page === totalPages ? '#333' : '#aaa', fontSize: 11, cursor: page === totalPages ? 'default' : 'pointer' }}>Next</button>
            </div>
          )}
        </>
      )}

      {croppingIndex !== null && selectedRatio.aspect && (
        <ImageCropper
          src={photos[croppingIndex].preview}
          naturalW={photos[croppingIndex].naturalW}
          naturalH={photos[croppingIndex].naturalH}
          cropAspect={selectedRatio.aspect}
          initialOrigin={photos[croppingIndex].cropOrigin}
          onConfirm={(origin) => {
            setPhotos((prev) => prev.map((p, i) => i === croppingIndex ? { ...p, cropOrigin: origin } : p));
            setCroppingIndex(null);
          }}
          onCancel={() => setCroppingIndex(null)}
        />
      )}
    </div>
  );
}
