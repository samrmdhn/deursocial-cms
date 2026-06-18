import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Heart, MessageCircle, Reply, ChevronDown, Trash2, Send, ChevronLeft, ChevronRight, Download, FolderArchive } from 'lucide-react';
import MentionText from '@/components/MentionText';
import { createNotification } from '@/lib/notifications';
import JSZip from 'jszip';

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

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function EOMomentDetail() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [imgIndex, setImgIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string; userId: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showAllReplies, setShowAllReplies] = useState<Record<number, boolean>>({});
  const [localLiked, setLocalLiked] = useState<boolean | null>(null);
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null);

  const { data: moment, isLoading } = useQuery({
    queryKey: ['eo', 'moment-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/api/detail/moment/${slug}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!slug,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['eo', 'moment-comments', slug],
    queryFn: async () => {
      // Moments use same comment table as posts — use the moment comment endpoint for top-level
      const res = await api.get(`/api/comment/moment/${slug}`);
      const rows: any[] = res.data?.data ?? [];
      // Fetch replies via dedicated replies endpoint
      const withReplies = await Promise.all(
        rows.map(async (c: any) => {
          if (Number(c.reply_count ?? 0) === 0) return { ...c, replies: [] };
          const rRes = await api.get(`/api/comment/replies/${c.id}`);
          return { ...c, replies: rRes.data?.data ?? [] };
        })
      );
      return withReplies;
    },
    enabled: !!slug,
  });

  const likeMutation = useMutation({
    // Moments share the same like endpoint as posts
    mutationFn: () => api.post(`/api/event/post/like/${slug}`),
    onMutate: () => {
      const liked = localLiked ?? moment?.post_liked ?? false;
      const count = localLikeCount ?? Number(moment?.total_likes ?? 0);
      setLocalLiked(!liked);
      setLocalLikeCount(liked ? count - 1 : count + 1);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'moments-all'] });
      queryClient.invalidateQueries({ queryKey: ['eo', 'moment-detail', slug] });
      const nowLiked = !(localLiked ?? moment?.post_liked ?? false);
      if (nowLiked && moment?.users_id && user) {
        await createNotification({
          user_id: String(moment.users_id),
          actor_id: String(user.id),
          actor_name: user.display_name || user.username || 'Someone',
          actor_username: user.username || '',
          actor_image: (user as any).photo ?? null,
          type: 'like',
          reference_id: slug,
          reference_type: 'moment',
          reference_event_id: moment.event_slug ?? null,
        });
      }
    },
    onError: () => {
      setLocalLiked(null);
      setLocalLikeCount(null);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.post(`/api/comment/moment/${slug}`, { comment_post: text }),
    onSuccess: async () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['eo', 'moment-detail', slug] });
      if (moment?.users_id && user) {
        await createNotification({
          user_id: String(moment.users_id),
          actor_id: String(user.id),
          actor_name: user.display_name || user.username || 'Someone',
          actor_username: user.username || '',
          actor_image: (user as any).photo ?? null,
          type: 'comment',
          reference_id: slug,
          reference_type: 'moment',
          reference_event_id: moment.event_slug ?? null,
        });
      }
    },
    onError: () => toast.error('Failed to comment'),
  });

  const replyMutation = useMutation({
    // Replies go through post comment endpoint (supports parent_id); moment endpoint does not
    mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
      api.post(`/api/comment/post/${slug}`, { comment_post: text, parent_id: commentId }),
    onSuccess: async () => {
      setReplyText('');
      const targetUserId = replyingTo?.userId;
      setReplyingTo(null);
      refetchComments();
      if (targetUserId && user) {
        await createNotification({
          user_id: targetUserId,
          actor_id: String(user.id),
          actor_name: user.display_name || user.username || 'Someone',
          actor_username: user.username || '',
          actor_image: (user as any).photo ?? null,
          type: 'reply',
          reference_id: slug,
          reference_type: 'moment',
          reference_event_id: moment?.event_slug ?? null,
        });
      }
    },
    onError: () => toast.error('Failed to reply'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/event/post/${slug}`),
    onSuccess: () => {
      toast.success('Moment deleted');
      navigate({ to: '/eo/moments' });
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

  const downloadAllAsZip = async (imgUrls: string[]) => {
    if (!imgUrls.length) { toast.error('No images'); return; }
    const toastId = toast.loading(`Preparing ${imgUrls.length} image${imgUrls.length > 1 ? 's' : ''}…`);
    try {
      const zip = new JSZip();
      await Promise.all(
        imgUrls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = blob.type.includes('png') ? 'png' : 'jpg';
          zip.file(`moment-${i + 1}.${ext}`, blob);
        })
      );
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `moment-${slug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Downloaded!', { id: toastId });
    } catch {
      toast.error('ZIP failed', { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  if (!moment) return <div style={{ padding: 32, color: '#555', fontSize: 13 }}>Moment not found.</div>;

  const images: string[] = (moment.images || []).map((img: any) => resolveImageUrl(img.image ?? img.file ?? ''));
  const liked = localLiked ?? moment.post_liked ?? false;
  const likeCount = localLikeCount ?? Number(moment.total_likes ?? 0);

  return (
    <div style={{ padding: '24px 28px 64px' }}>
      <button onClick={() => navigate({ to: '/eo/moments' })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Moments
      </button>

      <div style={{ maxWidth: 600 }}>
        {/* Moment card */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {moment.user?.image ? (
                <img src={resolveImageUrl(moment.user.image)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 14 }}>
                  {(moment.user?.name || '?')[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{moment.user?.name || 'User'}</div>
                <div style={{ fontSize: 11, color: '#555' }}>
                  @{moment.user?.username} · {timeAgo(moment.created_at)}
                  {moment.event_name && <span> · {moment.event_name}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {images.length > 0 && (
                <button onClick={() => downloadAllAsZip(images)}
                  style={{ background: 'none', border: '1px solid #222', borderRadius: 5, color: '#555', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <FolderArchive size={12} /> ZIP
                </button>
              )}
              {images[imgIndex] && (
                <button onClick={() => downloadImage(images[imgIndex], `moment-${imgIndex + 1}.jpg`)}
                  style={{ background: 'none', border: '1px solid #222', borderRadius: 5, color: '#555', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Download size={12} /> Download
                </button>
              )}
              {user?.role === 'admin' && (
                <button onClick={() => { if (confirm('Delete this moment?')) deleteMutation.mutate(); }}
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {moment.caption && (
            <div style={{ padding: '0 16px 14px', fontSize: 13, color: '#c0c0c0', lineHeight: 1.6 }}>
              <MentionText html={moment.caption} />
            </div>
          )}

          {images.length > 0 && (
            <div style={{ position: 'relative' }}>
              <img src={images[imgIndex]} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'contain', background: '#050505', display: 'block' }} />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex((i) => Math.max(0, i - 1))} disabled={imgIndex === 0}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: imgIndex === 0 ? '#333' : '#ccc', cursor: imgIndex === 0 ? 'default' : 'pointer' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setImgIndex((i) => Math.min(images.length - 1, i + 1))} disabled={imgIndex === images.length - 1}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: imgIndex === images.length - 1 ? '#333' : '#ccc', cursor: imgIndex === images.length - 1 ? 'default' : 'pointer' }}>
                    <ChevronRight size={16} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '2px 6px', fontSize: 10, color: '#ccc' }}>
                    {imgIndex + 1}/{images.length}
                  </div>
                </>
              )}
            </div>
          )}

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
              {images.map((url, i) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 4, overflow: 'hidden', border: `2px solid ${i === imgIndex ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0, background: 'none' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid #111' }}>
            <button onClick={() => likeMutation.mutate()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#e05252' : '#666', fontSize: 12 }}>
              <Heart size={14} fill={liked ? '#e05252' : 'none'} stroke={liked ? '#e05252' : '#666'} /> {likeCount}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
              <MessageCircle size={14} /> {Number(moment.total_comments ?? 0)}
            </span>
          </div>
        </div>

        {/* Comment input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) { e.preventDefault(); commentMutation.mutate(commentText); } }}
            style={{ flex: 1, padding: '9px 12px', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6, color: '#e0e0e0', fontSize: 12, outline: 'none' }} />
          <button onClick={() => commentText.trim() && commentMutation.mutate(commentText)}
            disabled={!commentText.trim() || commentMutation.isPending}
            style={{ padding: '9px 14px', background: '#fff', border: 'none', borderRadius: 6, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !commentText.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Send size={12} /> Post
          </button>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!comments?.length ? (
            <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '24px 0' }}>No comments yet</div>
          ) : comments.map((c: any) => {
            const replies = c.replies || [];
            const showAll = showAllReplies[c.id];
            const visibleReplies = showAll ? replies : replies.slice(0, 3);

            return (
              <div key={c.id}>
                <div style={{ background: '#0a0a0a', border: '1px solid #181818', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {c.user?.image && <img src={resolveImageUrl(c.user.image)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{c.user?.name || c.user?.username}</span>
                      <span style={{ fontSize: 10, color: '#333' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <button onClick={() => setReplyingTo(
                      replyingTo?.commentId === c.id ? null
                        : { commentId: c.id, username: c.user?.username || '', userId: String(c.users_id || '') }
                    )}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: replyingTo?.commentId === c.id ? '#888' : '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Reply size={10} /> Reply
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: '#c0c0c0', margin: 0, lineHeight: 1.5 }}>{c.comment_post}</p>
                </div>

                {visibleReplies.map((r: any) => (
                  <div key={r.id} style={{ marginLeft: 24, marginTop: 4, background: '#080808', border: '1px solid #141414', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {r.user?.image && <img src={resolveImageUrl(r.user.image)} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>{r.user?.name || r.user?.username}</span>
                      <span style={{ fontSize: 10, color: '#2a2a2a' }}>{timeAgo(r.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#888', margin: 0, lineHeight: 1.5 }}>{r.comment_post}</p>
                  </div>
                ))}

                {replies.length > 3 && !showAll && (
                  <button onClick={() => setShowAllReplies((prev) => ({ ...prev, [c.id]: true }))}
                    style={{ marginLeft: 24, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <ChevronDown size={10} /> View {replies.length - 3} more replies
                  </button>
                )}

                {replyingTo !== null && replyingTo.commentId === c.id && (
                  <div style={{ marginLeft: 24, marginTop: 6, display: 'flex', gap: 6 }}>
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${replyingTo.username}…`}
                      onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) { e.preventDefault(); replyMutation.mutate({ commentId: c.id, text: replyText }); } }}
                      style={{ flex: 1, padding: '6px 10px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 11, outline: 'none' }} />
                    <button onClick={() => replyMutation.mutate({ commentId: c.id, text: replyText })}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      style={{ padding: '6px 10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Send
                    </button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 11, padding: '6px 8px' }}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
