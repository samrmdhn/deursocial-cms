import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Upload, X, Send, Image as ImageIcon, LayoutGrid, LayoutList, Download, ChevronLeft, ChevronRight, FolderArchive, CheckSquare, Square, Crop as CropIcon } from 'lucide-react';
import JSZip from 'jszip';
import { uploadImageToBucket } from '@/lib/upload';
import MomentCard from '@/components/MomentCard';
import MentionInput from '@/components/MentionInput';
import ImageCropper from '@/components/ImageCropper';

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
type ViewMode = 'card' | 'grid';

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

export default function EOMoments() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<Sort>('newest');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [caption, setCaption] = useState('');
  const [createEvent, setCreateEvent] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<RatioOption>(RATIO_OPTIONS[0]);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

  // Lightbox state for grid mode
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  // Select mode for bulk ZIP
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  const { data: events } = useQuery({
    queryKey: ['eo', 'events-for-moments', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase.from('ir_content_details').select('id, title, slug').eq('event_organizers_id', eoId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!eoId,
  });

  const PAGE_SIZE = 30;

  const { data: allMomentsData, isLoading } = useQuery({
    queryKey: ['eo', 'moments-all', eoId, sort, selectedEvent],
    queryFn: async () => {
      if (!eoId || !events || !events.length) return [];

      const mapMoment = (m: any) => ({
        id: m.slug,
        slug: m.slug,
        caption_post: m.caption ?? null,
        file: null,
        created_at: Math.floor(new Date(m.created_at).getTime() / 1000),
        event_title: m.event?.title || m.event?.slug || '—',
        files: (m.images || []).map((img: any, i: number) => ({
          id: i,
          file: resolveImageUrl(img.image ?? img.file ?? ''),
        })),
        author: {
          display_name: m.user?.name ?? 'User',
          username: m.user?.username ?? '',
          photo: m.user?.image ? resolveImageUrl(m.user.image) : null,
        },
        like_count: Number(m.total_likes ?? 0),
        comment_count: Number(m.total_comments ?? 0),
        is_liked: m.is_liked ?? false,
        group: m.group ?? null,
        _raw_slug: m.slug,
        users_id: m.users_id,
      });

      const sortParam = sort === 'official' ? 'newest' : sort;

      if (selectedEvent) {
        const params: Record<string, any> = { page: 1, limit: 200, sort: sortParam, event_slug: selectedEvent };
        if (sort === 'official') params.official = 1;
        const res = await api.get('/api/eo/moments', { params });
        return (res.data?.data ?? []).map(mapMoment);
      }

      const slugs = events.map((e: any) => e.slug);
      const results = await Promise.all(
        slugs.map(async (slug: string) => {
          const params: Record<string, any> = { page: 1, limit: 200, sort: sortParam, event_slug: slug };
          if (sort === 'official') params.official = 1;
          const res = await api.get('/api/eo/moments', { params });
          return (res.data?.data ?? []).map(mapMoment);
        })
      );
      const merged: any[] = results.flat();
      const seen = new Set<string>();
      const deduped = merged.filter((m) => { if (seen.has(m.slug)) return false; seen.add(m.slug); return true; });
      if (sort === 'popular') {
        deduped.sort((a, b) => (b.like_count + b.comment_count * 2) - (a.like_count + a.comment_count * 2));
      } else {
        deduped.sort((a, b) => b.created_at - a.created_at);
      }
      return deduped;
    },
    enabled: !!eoId && !!events,
  });

  const allMoments = allMomentsData ?? [];
  const totalMoments = allMoments.length;
  const totalPages = Math.ceil(totalMoments / PAGE_SIZE);
  const pagedMoments = allMoments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) { toast.error('Maximum 5 images'); return; }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const imgEl = new Image();
      imgEl.onload = () => {
        setPhotos((prev) => [...prev, { file, preview: url, naturalW: imgEl.naturalWidth, naturalH: imgEl.naturalHeight, cropOrigin: null }]);
      };
      imgEl.src = url;
    });
    e.target.value = '';
  };

  async function prepareImage(photo: PhotoItem, aspect: [number, number] | null): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const imgW = img.naturalWidth, imgH = img.naturalHeight;
        let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
        if (aspect) {
          const [aw, ah] = aspect;
          const targetRatio = aw / ah;
          const imageRatio = imgW / imgH;
          let cropW: number, cropH: number;
          if (imageRatio > targetRatio) { cropH = imgH; cropW = Math.round(imgH * targetRatio); }
          else { cropW = imgW; cropH = Math.round(imgW / targetRatio); }
          const fx = photo.cropOrigin?.x ?? 0.5, fy = photo.cropOrigin?.y ?? 0.5;
          srcX = Math.round(Math.max(0, Math.min(fx * (imgW - cropW), imgW - cropW)));
          srcY = Math.round(Math.max(0, Math.min(fy * (imgH - cropH), imgH - cropH)));
          srcW = cropW; srcH = cropH;
        }
        const outW = Math.min(srcW, 1200), outH = Math.round(srcH * (outW / srcW));
        const canvas = document.createElement('canvas');
        canvas.width = outW; canvas.height = outH;
        canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          resolve(new File([blob], 'moment.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
      img.src = photo.preview;
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createEvent) throw new Error('Select an event');
      if (!photos.length) throw new Error('Add at least one image');
      const eventSlug = events?.find((e: any) => String(e.id) === createEvent)?.slug;
      if (!eventSlug) throw new Error('Event not found');
      const croppedFiles = await Promise.all(photos.map((p) => prepareImage(p, selectedRatio.aspect)));
      const uploadedFiles = await Promise.all(croppedFiles.map((f) => uploadImageToBucket(f, 'post-images', 'moments')));
      const validFiles = uploadedFiles.filter(Boolean) as string[];
      const fd = new FormData();
      if (caption) fd.append('caption_post', caption);
      validFiles.forEach((url) => fd.append('image_urls[]', url));
      await api.post(`/api/event/moments/${eventSlug}`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'moments'] });
      toast.success('Moment posted');
      setShowCreate(false);
      setCaption(''); setCreateEvent(''); setPhotos([]); setSelectedRatio(RATIO_OPTIONS[0]);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/api/event/post/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'moments'] });
      toast.success('Moment deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Download failed');
    }
  };

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSlugs.size === moments.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(moments.map((m: any) => m.slug)));
    }
  };

  const downloadZip = async () => {
    const targets = allMoments.filter((m: any) => selectedSlugs.has(m.slug));
    const allEntries: { url: string; name: string }[] = targets.flatMap((m: any) => {
      const username = m.author?.username || 'unknown';
      const eventName = (m.event_title || 'event').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
      return (m.files || [])
        .map((f: any, fi: number) => ({ url: f.file, name: `moment_@${username}_${fi + 1}_${eventName}` }))
        .filter((f: any) => f.url);
    });
    if (!allEntries.length) { toast.error('No images in selection'); return; }
    setZipping(true);
    const toastId = toast.loading(`Zipping ${allEntries.length} image(s)…`);
    try {
      const zip = new JSZip();
      await Promise.all(allEntries.map(async ({ url, name }) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        zip.file(`${name}.${ext}`, blob);
      }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const eventLabel = selectedEvent
        ? (events?.find((e: any) => e.slug === selectedEvent)?.title || selectedEvent).replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase()
        : 'all_events';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `deursocial_${eventLabel}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Downloaded!', { id: toastId });
      setSelectMode(false);
      setSelectedSlugs(new Set());
    } catch {
      toast.error('ZIP failed', { id: toastId });
    } finally {
      setZipping(false);
    }
  };

  const SORTS: { key: Sort; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'popular', label: 'Popular' },
    { key: 'official', label: 'Official' },
  ];

  const moments = pagedMoments;

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Moments</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            {totalMoments} moments
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {showCreate ? <X size={12} /> : <ImageIcon size={12} />}
          {showCreate ? 'Cancel' : 'New Moment'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 20, marginBottom: 20, maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase' }}>New Moment</div>

          {/* Event selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6 }}>Event *</label>
            <select value={createEvent} onChange={(e) => setCreateEvent(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' }}>
              <option value="">Select event…</option>
              {events?.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          {/* Image upload */}
          {photos.length === 0 ? (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160, background: '#060606', border: '1.5px dashed #1e1e1e', borderRadius: 10, cursor: 'pointer', color: '#333' }}>
              <ImageIcon size={28} strokeWidth={1.5} />
              <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Upload an image</span>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange} />
            </label>
          ) : (() => {
            const PREVIEW_W = 120;
            const displayAspect = selectedRatio.aspect ?? [1, 1];
            const PREVIEW_H = Math.round(PREVIEW_W * (displayAspect[1] / displayAspect[0]));

            function getPreviewBgStyle(photo: PhotoItem): React.CSSProperties {
              if (!selectedRatio.aspect || !photo.naturalW || !photo.naturalH) {
                return { position: 'absolute', inset: 0, backgroundImage: `url(${photo.preview})`, backgroundSize: 'cover', backgroundPosition: 'center' };
              }
              const [aw, ah] = selectedRatio.aspect;
              const targetRatio = aw / ah;
              const imageRatio = photo.naturalW / photo.naturalH;
              let scale: number;
              if (imageRatio > targetRatio) { scale = PREVIEW_H / photo.naturalH; } else { scale = PREVIEW_W / photo.naturalW; }
              const renderedW = photo.naturalW * scale, renderedH = photo.naturalH * scale;
              const fx = photo.cropOrigin?.x ?? 0.5, fy = photo.cropOrigin?.y ?? 0.5;
              const tx = -(fx * Math.max(0, renderedW - PREVIEW_W)), ty = -(fy * Math.max(0, renderedH - PREVIEW_H));
              return { position: 'absolute', inset: 0, backgroundImage: `url(${photo.preview})`, backgroundSize: `${renderedW}px ${renderedH}px`, backgroundRepeat: 'no-repeat', backgroundPosition: `${tx}px ${ty}px` };
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {photos.map((photo, i) => (
                    <div key={i} style={{ position: 'relative', width: PREVIEW_W, height: PREVIEW_H, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e', flexShrink: 0 }}>
                      <div style={getPreviewBgStyle(photo)} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0, transition: 'opacity 0.15s', background: 'rgba(0,0,0,0.3)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}>
                        {selectedRatio.aspect && (
                          <button type="button" onClick={() => setCroppingIndex(i)}
                            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #333', color: '#ccc', borderRadius: 4, padding: '5px 6px', cursor: 'pointer', display: 'flex' }}><CropIcon size={12} /></button>
                        )}
                        <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #333', color: '#e44', borderRadius: 4, padding: '5px 6px', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                      </div>
                      <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '2px 5px', fontSize: 9, color: '#ccc', fontWeight: 700 }}>{i + 1}</div>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label style={{ width: PREVIEW_W, height: PREVIEW_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#060606', border: '1.5px dashed #1e1e1e', borderRadius: 8, cursor: 'pointer', color: '#333', gap: 6, fontSize: 9, fontWeight: 600 }}>
                      <Upload size={16} />Add Photo ({photos.length}/5)
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                {/* Ratio pills */}
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
              </div>
            );
          })()}

          {/* Caption */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6 }}>Caption <span style={{ color: '#333' }}>(optional)</span></label>
            <MentionInput value={caption} onChange={setCaption} placeholder="Write a caption… (type @ to mention)" rows={3} />
          </div>

          <button onClick={() => createMutation.mutate()} disabled={!createEvent || !photos.length || createMutation.isPending}
            style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!createEvent || !photos.length) ? 0.4 : 1 }}>
            <Send size={12} /> {createMutation.isPending ? 'Posting…' : 'Post Moment'}
          </button>
        </div>
      )}

      {/* Filter + view toggle bar */}
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

        {/* View mode toggle + select/zip */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {viewMode === 'grid' && moments.length > 0 && (
            selectMode ? (
              <>
                <button onClick={toggleSelectAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, color: '#888', fontSize: 11, cursor: 'pointer' }}>
                  {selectedSlugs.size === moments.length ? <CheckSquare size={12} /> : <Square size={12} />} All
                </button>
                <button onClick={downloadZip} disabled={!selectedSlugs.size || zipping}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: selectedSlugs.size ? '#fff' : '#1a1a1a', border: 'none', borderRadius: 4, color: selectedSlugs.size ? '#000' : '#444', fontSize: 11, cursor: selectedSlugs.size ? 'pointer' : 'default', fontWeight: 600 }}>
                  <FolderArchive size={12} /> {zipping ? 'Zipping…' : `ZIP (${selectedSlugs.size})`}
                </button>
                <button onClick={() => { setSelectMode(false); setSelectedSlugs(new Set()); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, color: '#666', fontSize: 11, cursor: 'pointer' }}>
                  <X size={12} /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setSelectMode(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, color: '#888', fontSize: 11, cursor: 'pointer' }}>
                <FolderArchive size={12} /> ZIP Download
              </button>
            )
          )}
          <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2 }}>
            <button onClick={() => { setViewMode('card'); setSelectMode(false); setSelectedSlugs(new Set()); }} title="Card view"
              style={{ padding: '5px 8px', borderRadius: 3, border: 'none', cursor: 'pointer', background: viewMode === 'card' ? '#161616' : 'transparent', color: viewMode === 'card' ? '#d0d0d0' : '#444', display: 'flex', alignItems: 'center' }}>
              <LayoutList size={13} />
            </button>
            <button onClick={() => setViewMode('grid')} title="Photo grid"
              style={{ padding: '5px 8px', borderRadius: 3, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? '#161616' : 'transparent', color: viewMode === 'grid' ? '#d0d0d0' : '#444', display: 'flex', alignItems: 'center' }}>
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!events?.length ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No events yet</div>
      ) : isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
        </div>
      ) : !moments.length ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No moments yet</div>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {moments.map((moment: any) => {
              const urls: string[] = (moment.files || []).map((f: any) => f.file).filter(Boolean);
              const firstImg = urls[0];
              const isSelected = selectedSlugs.has(moment.slug);
              return (
                <div key={moment.id}
                  style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 4, background: '#111', position: 'relative', cursor: 'pointer', outline: isSelected ? '2px solid #fff' : 'none' }}
                  onClick={() => selectMode ? toggleSelect(moment.slug) : (firstImg && setLightbox({ urls, index: 0 }))}>
                  {firstImg
                    ? <img src={firstImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: selectMode && !isSelected ? 0.5 : 1 }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 10 }}>No img</div>
                  }
                  {urls.length > 1 && !selectMode && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 3, padding: '2px 5px', fontSize: 9, color: '#ccc' }}>+{urls.length - 1}</div>
                  )}
                  {selectMode && (
                    <div style={{ position: 'absolute', top: 6, left: 6, color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                  )}
                  {selectMode && isSelected && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '2px 5px', fontSize: 9, color: '#ccc' }}>
                      {urls.length} img{urls.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
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
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {moments.map((moment: any) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                onDelete={() => deleteMutation.mutate((moment as any)._raw_slug)}
                queryKey={['eo', 'moments-all', eoId]}
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

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img
              src={lightbox.urls[lightbox.index]}
              alt=""
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 6 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setLightbox((lb) => lb && lb.index > 0 ? { ...lb, index: lb.index - 1 } : lb)}
                disabled={lightbox.index === 0}
                style={{ padding: '6px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: lightbox.index === 0 ? '#333' : '#ccc', cursor: lightbox.index === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 11, color: '#666' }}>{lightbox.index + 1} / {lightbox.urls.length}</span>
              <button
                onClick={() => setLightbox((lb) => lb && lb.index < lb.urls.length - 1 ? { ...lb, index: lb.index + 1 } : lb)}
                disabled={lightbox.index === lightbox.urls.length - 1}
                style={{ padding: '6px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: lightbox.index === lightbox.urls.length - 1 ? '#333' : '#ccc', cursor: lightbox.index === lightbox.urls.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => downloadImage(lightbox.urls[lightbox.index], `moment-${lightbox.index + 1}.jpg`)}
                style={{ padding: '6px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <Download size={13} /> Download
              </button>
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: '1px solid #333', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', cursor: 'pointer', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
