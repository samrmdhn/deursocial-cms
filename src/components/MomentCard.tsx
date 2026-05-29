import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Heart, MessageCircle, Share2, Trash2, MoreHorizontal, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import MentionText from './MentionText';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const resolveImg = (f: string) => (f?.startsWith('http') ? f : `${IMG_BASE}${f}`);

function timeAgo(epoch: number) {
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface MomentCardProps {
  moment: {
    id: number | string;
    slug: string;
    caption_post?: string | null;
    file?: string | null;
    created_at: number;
    content_details_id?: number;
    event_title?: string;
    files?: { id: number; file: string }[];
    author?: { display_name: string; username: string; photo?: string | null } | null;
    like_count?: number;
    comment_count?: number;
    is_liked?: boolean;
    group?: { slug: string; title: string } | null;
  };
  onDelete?: () => void;
  queryKey?: any[];
  showEventLabel?: boolean;
}

export default function MomentCard({ moment, onDelete, queryKey, showEventLabel = false }: MomentCardProps) {
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'admin' && !!onDelete;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileBase = role === 'admin' ? '/admin' : '/eo';
  const [imgIndex, setImgIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localLiked, setLocalLiked] = useState(moment.is_liked ?? false);
  const [localLikeCount, setLocalLikeCount] = useState(moment.like_count ?? 0);
  const [menuOpen, setMenuOpen] = useState(false);

  const allFiles = moment.files?.length
    ? moment.files.map((f) => f.file)
    : moment.file
    ? [moment.file]
    : [];

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/api/event/post/like/${moment.slug}`),
    onMutate: () => {
      const wasLiked = localLiked;
      setLocalLiked((v) => !v);
      setLocalLikeCount((c) => wasLiked ? c - 1 : c + 1);
    },
    onSuccess: () => {
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['eo', 'moment-detail', moment.slug] });
      toast.success(localLiked ? 'Unliked' : 'Liked');
    },
    onError: () => {
      setLocalLiked((v) => !v);
      setLocalLikeCount((c) => localLiked ? c + 1 : c - 1);
      toast.error('Failed');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.post(`/api/comment/moment/${moment.slug}`, { comment_post: text }),
    onSuccess: () => {
      setCommentText('');
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      toast.success('Comment posted');
    },
    onError: () => toast.error('Failed'),
  });

  const currentImg = allFiles[imgIndex];
  const avatarSrc = moment.author?.photo ? resolveImg(moment.author.photo) : null;
  const initial = moment.author?.display_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div onClick={() => navigate({ to: `${profileBase}/moments/${moment.slug}` as any })} style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
        <div
          onClick={(e) => { e.stopPropagation(); if (moment.author?.username) navigate({ to: `${profileBase}/user/${moment.author.username}` as any }); }}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #1e1e1e', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#555', cursor: 'pointer' }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={(e) => { e.stopPropagation(); if (moment.author?.username) navigate({ to: `${profileBase}/user/${moment.author.username}` as any }); }}
            style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', lineHeight: 1.2, cursor: 'pointer' }}>
            {moment.author?.display_name || 'User'}
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>
            @{moment.author?.username || '—'} · {timeAgo(moment.created_at)} ago
            {showEventLabel && moment.event_title && <span style={{ color: '#383838' }}> · {moment.event_title}</span>}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            style={{ background: 'none', border: 'none', color: '#3a3a3a', cursor: 'pointer', padding: '4px 4px', display: 'flex', borderRadius: 4 }}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && canDelete && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 6, zIndex: 10, minWidth: 100 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (confirm('Delete this moment?')) onDelete!(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', background: 'none', border: 'none', color: '#e05555', cursor: 'pointer', fontSize: 11 }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Images — full width, natural aspect (like RN) */}
      {currentImg && (
        <div style={{ position: 'relative', background: '#080808' }}>
          <img
            src={resolveImg(currentImg)}
            alt=""
            style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 480 }}
          />
          {allFiles.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setImgIndex((i) => Math.max(0, i - 1)); }} disabled={imgIndex === 0}
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#ccc', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: imgIndex === 0 ? 'default' : 'pointer', opacity: imgIndex === 0 ? 0.3 : 1 }}>
                ‹
              </button>
              <button onClick={(e) => { e.stopPropagation(); setImgIndex((i) => Math.min(allFiles.length - 1, i + 1)); }} disabled={imgIndex === allFiles.length - 1}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#ccc', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: imgIndex === allFiles.length - 1 ? 'default' : 'pointer', opacity: imgIndex === allFiles.length - 1 ? 0.3 : 1 }}>
                ›
              </button>
            </>
          )}
        </div>
      )}

      {/* Pagination dots */}
      {allFiles.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 8 }}>
          {allFiles.map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === imgIndex ? '#e0e0e0' : '#2a2a2a', transition: 'background 0.2s' }} />
          ))}
        </div>
      )}

      {/* Actions — like RN: heart / comment / share row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 14px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); likeMutation.mutate(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: localLiked ? '#ef4444' : '#484848', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Heart size={20} fill={localLiked ? 'currentColor' : 'none'} />
          {localLikeCount > 0 && <span>{localLikeCount}</span>}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: showComments ? '#888' : '#484848', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <MessageCircle size={18} />
          {(moment.comment_count ?? 0) > 0 && <span>{moment.comment_count}</span>}
        </button>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#484848', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Group pill */}
      {moment.group && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 20 }}>
            <Users size={11} color="#555" />
            <span style={{ fontSize: 11, color: '#666' }}>{moment.group.title}</span>
          </div>
        </div>
      )}

      {/* Caption below actions */}
      {moment.caption_post && (
        <div style={{ padding: '8px 14px 10px' }}>
          <MentionText html={moment.caption_post} />
        </div>
      )}

      {/* Comment box */}
      {showComments && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #111', paddingTop: 10, display: 'flex', gap: 6, marginTop: 4 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) commentMutation.mutate(commentText.trim()); }}
            placeholder="Add a comment…"
            style={{ flex: 1, padding: '6px 10px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 20, color: '#e0e0e0', fontSize: 11, outline: 'none' }}
          />
          <button
            onClick={() => { if (commentText.trim()) commentMutation.mutate(commentText.trim()); }}
            disabled={!commentText.trim() || commentMutation.isPending}
            style={{ padding: '6px 8px', background: '#1a1a1a', border: 'none', borderRadius: 20, color: '#888', cursor: 'pointer', display: 'flex' }}
          >
            <Send size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
