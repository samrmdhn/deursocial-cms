import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Users, FileText, Calendar, BadgeCheck, Stamp } from 'lucide-react';
import MomentCard from '@/components/MomentCard';
import PostCard from '@/components/PostCard';

const SUPABASE_POST_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const SUPABASE_PROFILE_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/`;
const SUPABASE_EVENT_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/event-images/`;
const SUPABASE_PASSPORT_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/passport-images/`;

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/images/') || path.startsWith('images/')) return `${SUPABASE_PROFILE_IMAGES}${path.replace(/^\//, '')}`;
  if (path.startsWith('posts/')) return `${SUPABASE_POST_IMAGES}${path}`;
  return `${SUPABASE_PROFILE_IMAGES}${path}`;
}

function resolvePostImg(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SUPABASE_POST_IMAGES}${path}`;
}

function resolveEventImg(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SUPABASE_EVENT_IMAGES}${path}`;
}

function resolvePassportImg(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SUPABASE_PASSPORT_IMAGES}${path}`;
}

function parseImages(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return [];
}

function toEpoch(ts: string | number): number {
  if (typeof ts === 'number') return ts;
  return Math.floor(new Date(ts).getTime() / 1000);
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Tab = 'moments' | 'posts' | 'passport';

export default function UserProfile() {
  const { username } = useParams({ strict: false }) as { username: string };
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('moments');
  const [momentPage, setMomentPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [passportModal, setPassportModal] = useState<any>(null);
  const LIMIT = 12;

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const res = await api.get(`/api/user/detail/${username}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!username,
  });

  const { data: momentsData } = useQuery({
    queryKey: ['user-moments', username, momentPage],
    queryFn: async () => {
      const res = await api.get(`/api/event/moments/user/${username}`, { params: { page: momentPage, limit: LIMIT } });
      return res.data;
    },
    enabled: !!username && tab === 'moments',
  });

  const { data: postsData } = useQuery({
    queryKey: ['user-posts', username, postPage],
    queryFn: async () => {
      const res = await api.get(`/api/event/posts/user/${username}`, { params: { page: postPage, limit: LIMIT } });
      return res.data;
    },
    enabled: !!username && tab === 'posts',
  });

  const { data: passportData } = useQuery({
    queryKey: ['user-passport', userData?.id],
    queryFn: async () => {
      const res = await api.get(`/api/users/${userData.id}/passport`);
      return res.data?.data ?? res.data;
    },
    enabled: !!userData?.id && tab === 'passport',
  });

  if (userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  if (!userData) return <div style={{ padding: 32, color: '#555', fontSize: 13 }}>User not found.</div>;

  const avatar = resolveImg(userData.image);
  const moments: any[] = momentsData?.data ?? [];
  const momentTotal = momentsData?.meta?.total_count ?? 0;
  const momentTotalPages = Math.ceil(momentTotal / LIMIT);
  const posts: any[] = postsData?.data ?? [];
  const postTotal = postsData?.meta?.total_count ?? 0;
  const postTotalPages = Math.ceil(postTotal / LIMIT);
  const passportEntries: any[] = passportData?.entries ?? [];

  function toMomentCardProps(m: any) {
    const imgs = parseImages(m.images);
    return {
      id: m.id ?? m.slug,
      slug: m.slug,
      caption_post: m.caption ?? m.caption_post ?? null,
      file: null as string | null,
      created_at: toEpoch(m.created_at),
      files: imgs.map((img: any, i: number) => ({
        id: i,
        file: resolvePostImg(img.image ?? img.file ?? '') ?? '',
      })).filter((f: any) => f.file),
      author: {
        display_name: m.user?.name ?? m.user?.display_name ?? 'User',
        username: m.user?.username ?? '',
        photo: m.user?.image ? resolveImg(m.user.image) : null,
      },
      like_count: Number(m.total_likes ?? m.like_count ?? 0),
      comment_count: Number(m.total_comments ?? m.comment_count ?? 0),
      is_liked: m.is_liked ?? false,
      group: m.group ?? null,
      event_title: m.event_title ?? null,
    };
  }

  function toPostCardProps(p: any) {
    const imgs = parseImages(p.images);
    return {
      id: p.id ?? p.slug,
      slug: p.slug,
      caption_post: p.caption ?? p.caption_post ?? null,
      file: null as string | null,
      created_at: toEpoch(p.created_at),
      files: imgs.map((img: any, i: number) => ({
        id: i,
        file: resolvePostImg(img.image ?? img.file ?? '') ?? '',
      })).filter((f: any) => f.file),
      author: {
        display_name: p.user?.name ?? p.user?.display_name ?? 'User',
        username: p.user?.username ?? '',
        photo: p.user?.image ? resolveImg(p.user.image) : null,
      },
      like_count: Number(p.total_likes ?? p.like_count ?? 0),
      comment_count: Number(p.total_comments ?? p.comment_count ?? 0),
      is_liked: p.is_liked ?? false,
      group: p.group ?? null,
      event_title: p.event_title ?? null,
    };
  }

  return (
    <div style={{ padding: '24px 28px 64px', maxWidth: 720 }}>
      <button onClick={() => navigate({ to: -1 as any })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Profile header */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        {/* Banner */}
        <div style={{ height: 100, background: '#111', position: 'relative' }}>
          {avatar && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.3)' }} />
          )}
        </div>
        {/* Avatar + name row */}
        <div style={{ padding: '0 20px 16px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -36, left: 20, width: 72, height: 72, borderRadius: '50%', border: '3px solid #0a0a0a', overflow: 'hidden', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 24, color: '#555', fontWeight: 700 }}>{userData.display_name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div style={{ paddingTop: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8' }}>{userData.display_name}</span>
              {userData.verified && <BadgeCheck size={15} color="#5b8dee" />}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>@{userData.username}</div>
            {userData.description && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 8, lineHeight: 1.5 }}>{userData.description}</div>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d0d0d0' }}>{Number(userData.total_followers ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={9} /> Followers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d0d0d0' }}>{Number(userData.total_following ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Following</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d0d0d0' }}>{Number(userData.total_post ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={9} /> Posts</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d0d0d0' }}>{Number(userData.total_event_followed ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={9} /> Events</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 6, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {(['moments', 'posts', 'passport'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 20px', borderRadius: 4, border: 'none', cursor: 'pointer', background: tab === t ? '#161616' : 'transparent', color: tab === t ? '#d0d0d0' : '#555', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 5 }}>
            {t === 'passport' && <Stamp size={11} />}
            {t}
          </button>
        ))}
      </div>

      {/* Moments tab */}
      {tab === 'moments' && (
        <>
          {!moments.length ? (
            <div style={{ fontSize: 12, color: '#333', padding: '40px', textAlign: 'center' }}>No moments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moments.map((m: any) => (
                <MomentCard key={m.slug} moment={toMomentCardProps(m)} queryKey={['user-moments', username, momentPage]} />
              ))}
            </div>
          )}
          {momentTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setMomentPage((p) => Math.max(1, p - 1))} disabled={momentPage === 1}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: momentPage === 1 ? '#333' : '#aaa', fontSize: 11, cursor: momentPage === 1 ? 'default' : 'pointer' }}>Prev</button>
              <span style={{ fontSize: 11, color: '#555' }}>{momentPage} / {momentTotalPages}</span>
              <button onClick={() => setMomentPage((p) => Math.min(momentTotalPages, p + 1))} disabled={momentPage === momentTotalPages}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: momentPage === momentTotalPages ? '#333' : '#aaa', fontSize: 11, cursor: momentPage === momentTotalPages ? 'default' : 'pointer' }}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Posts tab */}
      {tab === 'posts' && (
        <>
          {!posts.length ? (
            <div style={{ fontSize: 12, color: '#333', padding: '40px', textAlign: 'center' }}>No posts yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {posts.map((p: any) => (
                <PostCard key={p.slug} post={toPostCardProps(p)} queryKey={['user-posts', username, postPage]} />
              ))}
            </div>
          )}
          {postTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPostPage((p) => Math.max(1, p - 1))} disabled={postPage === 1}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: postPage === 1 ? '#333' : '#aaa', fontSize: 11, cursor: postPage === 1 ? 'default' : 'pointer' }}>Prev</button>
              <span style={{ fontSize: 11, color: '#555' }}>{postPage} / {postTotalPages}</span>
              <button onClick={() => setPostPage((p) => Math.min(postTotalPages, p + 1))} disabled={postPage === postTotalPages}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: postPage === postTotalPages ? '#333' : '#aaa', fontSize: 11, cursor: postPage === postTotalPages ? 'default' : 'pointer' }}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Passport tab */}
      {tab === 'passport' && (
        <>
          {!passportEntries.length ? (
            <div style={{ fontSize: 12, color: '#333', padding: '40px', textAlign: 'center' }}>No passport stamps yet</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {passportEntries.map((entry: any, i: number) => {
                const passportImg = resolvePassportImg(entry.passport_image_url);
                const eventImg = resolveEventImg(entry.event_image);
                const thumb = passportImg ?? eventImg;
                return (
                  <div key={i} onClick={() => setPassportModal(entry)}
                    style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '16/9', background: '#111', position: 'relative' }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Stamp size={28} color="#2a2a2a" /></div>
                      }
                      {passportImg && (
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: '#aaa', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Stamp size={9} /> Stamped
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#d0d0d0', lineHeight: 1.3, marginBottom: 3 }}>{entry.event_title ?? '—'}</div>
                      {entry.checked_in_at && (
                        <div style={{ fontSize: 10, color: '#555' }}>{formatDate(entry.checked_in_at)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Passport modal */}
      {passportModal && (
        <div
          onClick={() => setPassportModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', maxWidth: 420, width: '100%' }}>
            {(resolvePassportImg(passportModal.passport_image_url) ?? resolveEventImg(passportModal.event_image)) && (
              <img
                src={resolvePassportImg(passportModal.passport_image_url) ?? resolveEventImg(passportModal.event_image)!}
                alt=""
                style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 300 }}
              />
            )}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0e0', marginBottom: 6 }}>{passportModal.event_title}</div>
              {passportModal.checked_in_at && (
                <div style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={11} /> Checked in {formatDate(passportModal.checked_in_at)}
                </div>
              )}
              <button onClick={() => setPassportModal(null)}
                style={{ marginTop: 14, width: '100%', padding: '8px', background: '#1a1a1a', border: 'none', borderRadius: 6, color: '#888', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
