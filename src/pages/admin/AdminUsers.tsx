import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

const th: React.CSSProperties = { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: async () => {
      let q = supabase.from('ir_users').select('id, display_name, username, email, photo, status, created_at, is_verified', { count: 'exact' }).is('deleted_at', null).order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      if (search) q = q.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, count } = await q;
      return { users: data || [], total: count || 0 };
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: number; currentStatus: number }) => {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const { error } = await supabase.from('ir_users').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (s) => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(s === 0 ? 'User banned' : 'User unbanned'); },
    onError: () => toast.error('Failed'),
  });

  const { sorted: sortedUsers, toggleSort, SortIcon } = useTableSort(data?.users, 'created_at' as any, 'desc');
  const totalPages = Math.ceil((data?.total || 0) / limit);
  const formatDate = (epoch: number) => new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Users</h1>
            <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{data?.total ?? 0} registered</p>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#383838', pointerEvents: 'none', display: 'flex' }}><Search size={12} /></span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…" style={{ padding: '8px 12px 8px 30px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', width: 220 }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                <th style={th}><button onClick={() => toggleSort('display_name' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>User <SortIcon col={'display_name' as any} /></button></th>
                <th style={th}>Email</th>
                <th style={th}>Status</th>
                <th style={th}>Verified</th>
                <th style={th}><button onClick={() => toggleSort('created_at' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>Joined <SortIcon col={'created_at' as any} /></button></th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '48px 18px', textAlign: 'center' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
                </td></tr>
              ) : (sortedUsers || []).map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < ((sortedUsers?.length || 1) - 1) ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid #1e1e1e', flexShrink: 0 }}>
                        {user.photo
                          ? <img src={user.photo.startsWith('http') ? user.photo : `${IMG_BASE}${user.photo}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#555' }}>{user.display_name?.charAt(0)?.toUpperCase()}</div>
                        }
                      </div>
                      <div>
                        <Link to="/admin/users/$userId" params={{ userId: user.id.toString() }} style={{ fontSize: 13, fontWeight: 500, color: '#d8d8d8', textDecoration: 'none' }}>{user.display_name}</Link>
                        <div style={{ fontSize: 10, color: '#484848' }}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555' }}>{user.email}</td>
                  <td style={{ padding: '10px 18px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: user.status === 1 ? '#22c55e' : '#ef4444' }}>
                      {user.status === 1 ? '● Active' : '● Banned'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    {user.is_verified === 1
                      ? <span style={{ fontSize: 10, color: '#2a6a3a', fontWeight: 500 }}>✓ verified</span>
                      : <span style={{ color: '#2a2a2a' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#484848' }}>{user.created_at ? formatDate(user.created_at) : '—'}</td>
                  <td style={{ padding: '10px 18px' }}>
                    <button onClick={() => banMutation.mutate({ userId: user.id, currentStatus: user.status })} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }} title={user.status === 1 ? 'Ban' : 'Unban'}>
                      <Ban size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && (sortedUsers?.length ?? 0) === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#333' }}>No results</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #111' }}>
            <span style={{ fontSize: 11, color: '#444' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, display: 'flex' }}><ChevronLeft size={14} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'none', border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, display: 'flex' }}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
