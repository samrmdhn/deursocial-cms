import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import MomentCard from '@/components/MomentCard';

type Sort = 'newest' | 'popular';

const SUPABASE_POST_IMAGES = 'https://jbcdjttfaxwendlfpgjk.supabase.co/storage/v1/object/public/post-images/';
const SUPABASE_PROFILE_IMAGES = 'https://jbcdjttfaxwendlfpgjk.supabase.co/storage/v1/object/public/profile-images/';

function resolveImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/images/')) return `${SUPABASE_PROFILE_IMAGES}${path.slice(1)}`;
  if (path.startsWith('posts/')) return `${SUPABASE_POST_IMAGES}${path}`;
  if (path.startsWith('images/')) return `${SUPABASE_PROFILE_IMAGES}${path}`;
  return `${SUPABASE_POST_IMAGES}${path}`;
}

export default function AdminMoments() {
  const [sort, setSort] = useState<Sort>('newest');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: events } = useQuery({
    queryKey: ['admin', 'events-for-moments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'moments', sort, selectedEvent, search, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 30, sort };
      if (search) params.search = search;
      if (selectedEvent) params.event_slug = selectedEvent;

      const res = await api.get('/api/admin/moments', { params });
      const rows: any[] = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};

      const moments = rows.map((m: any) => ({
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
      }));

      return { moments, pagination: meta.pagination };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/api/event/post/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moments'] });
      toast.success('Moment deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const SORTS: { key: Sort; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'popular', label: 'Popular' },
  ];

  const pagination = data?.pagination;

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Moments</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
          {pagination ? `${pagination.total} moments` : (data?.moments?.length ?? 0) + ' moments'}
        </p>
      </div>

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
          style={{ padding: '7px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 11, outline: 'none' }}>
          <option value="">All events</option>
          {events?.map((e) => <option key={e.id} value={e.slug}>{e.title}</option>)}
        </select>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#383838', pointerEvents: 'none', display: 'flex' }}><Search size={12} /></span>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search caption…"
            style={{ padding: '7px 12px 7px 30px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 11, outline: 'none', width: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
        </div>
      ) : !data?.moments?.length ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: 12, color: '#333' }}>No moments found</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
            {data.moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                onDelete={() => deleteMutation.mutate((moment as any)._raw_slug)}
                queryKey={['admin', 'moments']}
                showEventLabel
              />
            ))}
          </div>

          {pagination && pagination.total_page > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: page === 1 ? '#333' : '#aaa', fontSize: 11, cursor: page === 1 ? 'default' : 'pointer' }}>
                Prev
              </button>
              <span style={{ fontSize: 11, color: '#555' }}>{page} / {pagination.total_page}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.total_page, p + 1))} disabled={page === pagination.total_page}
                style={{ padding: '5px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4, color: page === pagination.total_page ? '#333' : '#aaa', fontSize: 11, cursor: page === pagination.total_page ? 'default' : 'pointer' }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
