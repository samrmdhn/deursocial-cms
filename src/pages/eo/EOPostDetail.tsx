import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Heart, MessageCircle, Reply, ChevronDown, Trash2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import MentionText from '@/components/MentionText';
import { createNotification } from '@/lib/notifications';

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

export default function EOPostDetail() {
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

  const { data: post, isLoading } = useQuery({
    queryKey: ['eo', 'post-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/api/detail/post/${slug}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!slug,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['eo', 'post-comments', slug],
    queryFn: async () => {
      const res = await api.get(`/api/comment/post/${slug}`);
      const rows: any[] = res.data?.data ?? [];
      // fetch replies for each top-level comment
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
    mutationFn: () => api.post(`/api/event/post/like/${slug}`),
    onMutate: () => {
      const liked = localLiked ?? post?.post_liked ?? false;
      const count = localLikeCount ?? Number(post?.total_likes ?? 0);
      setLocalLiked(!liked);
      setLocalLikeCount(liked ? count - 1 : count + 1);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'posts-all'] });
      queryClient.invalidateQueries({ queryKey: ['eo', 'post-detail', slug] });
      const nowLiked = !(localLiked ?? post?.post_liked ?? false);
      if (nowLiked && post?.users_id && user) {
        await createNotification({
          user_id: String(post.users_id),
          actor_id: String(user.id),
          actor_name: user.display_name || user.username || 'Someone',
          actor_username: user.username || '',
          actor_image: (user as any).photo ?? null,
          type: 'like',
          reference_id: slug,
          reference_type: 'post',
          reference_event_id: post.event?.slug ?? null,
        });
      }
    },
    onError: () => {
      setLocalLiked(null);
      setLocalLikeCount(null);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.post(`/api/comment/post/${slug}`, { comment_post: text }),
    onSuccess: async () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['eo', 'post-detail', slug] });
      if (post?.users_id && user) {
        await createNotification({
          user_id: String(post.users_id),
          actor_id: String(user.id),
          actor_name: user.display_name || user.username || 'Someone',
          actor_username: user.username || '',
          actor_image: (user as any).photo ?? null,
          type: 'comment',
          reference_id: slug,
          reference_type: 'post',
          reference_event_id: post.event?.slug ?? null,
        });
      }
    },
    onError: () => toast.error('Failed to comment'),
  });

  const replyMutation = useMutation({
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
          reference_type: 'post',
          reference_event_id: post?.event?.slug ?? null,
        });
      }
    },
    onError: () => toast.error('Failed to reply'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/event/post/${slug}`),
    onSuccess: () => {
      toast.success('Post deleted');
      navigate({ to: '/eo/posts' });
    },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  if (!post) return <div style={{ padding: 32, color: '#555', fontSize: 13 }}>Post not found.</div>;

  const images: string[] = (post.images || []).map((img: any) => resolveImageUrl(img.image ?? img.file ?? ''));
  const liked = localLiked ?? post.post_liked ?? false;
  const likeCount = localLikeCount ?? Number(post.total_likes ?? 0);

  return (
    <div style={{ padding: '24px 28px 64px' }}>
      <button onClick={() => navigate({ to: '/eo/posts' })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Posts
      </button>

      <div style={{ maxWidth: 600 }}>
        {/* Post card */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {post.user?.image ? (
                <img src={resolveImageUrl(post.user.image)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 14 }}>
                  {(post.user?.name || '?')[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{post.user?.name || 'User'}</div>
                <div style={{ fontSize: 11, color: '#555' }}>@{post.user?.username} · {timeAgo(post.created_at)}</div>
              </div>
            </div>
            {user?.role === 'admin' && (
              <button onClick={() => { if (confirm('Delete this post?')) deleteMutation.mutate(); }}
                style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {post.caption && (
            <div style={{ padding: '0 16px 14px', fontSize: 13, color: '#c0c0c0', lineHeight: 1.6 }}>
              <MentionText html={post.caption} />
            </div>
          )}

          {images.length > 0 && (
            <div style={{ position: 'relative' }}>
              <img src={images[imgIndex]} alt="" style={{ width: '100%', maxHeight: 480, objectFit: 'contain', background: '#050505', display: 'block' }} />
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

          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid #111' }}>
            <button onClick={() => likeMutation.mutate()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#e05252' : '#666', fontSize: 12 }}>
              <Heart size={14} fill={liked ? '#e05252' : 'none'} stroke={liked ? '#e05252' : '#666'} /> {likeCount}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
              <MessageCircle size={14} /> {Number(post.total_comments ?? 0)}
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

                {replyingTo?.commentId === c.id && (
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
