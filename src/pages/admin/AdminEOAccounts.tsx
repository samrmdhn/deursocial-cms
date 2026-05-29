import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, UserCog } from 'lucide-react';
import bcryptjs from 'bcryptjs';
import { useTableSort } from '@/hooks/useTableSort';

const th: React.CSSProperties = { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 };

export default function AdminEOAccounts() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', detail: '', image: '', email: '', password: '', username: '' });
  const queryClient = useQueryClient();

  const { data: eos, isLoading } = useQuery({
    queryKey: ['admin', 'eo-accounts'],
    queryFn: async () => {
      const { data: adminEntries } = await supabase.from('ir_users_admin').select('id, users_id, event_organizers_id, created_at').eq('roles_id', 2);
      if (!adminEntries || adminEntries.length === 0) return [];
      const userIds = adminEntries.map((e) => e.users_id).filter(Boolean);
      const eoIds = adminEntries.map((e) => e.event_organizers_id).filter(Boolean);
      const { data: users } = await supabase.from('ir_users').select('id, display_name, username, email, photo').in('id', userIds);
      const { data: eoData } = await supabase.from('ir_event_organizers').select('*').in('id', eoIds);
      return adminEntries.map((entry) => ({
        ...entry,
        user: users?.find((u) => u.id === entry.users_id),
        eo: eoData?.find((e) => e.id === entry.event_organizers_id),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const hashedPassword = await bcryptjs.hash(formData.password, 10);
      const username = formData.username.trim().toLowerCase().replace(/\s+/g, '_');
      const { data: newUser, error: userError } = await supabase.from('ir_users').insert({
        display_name: formData.name, email: formData.email, username,
        username_anonymous: username + '_anon', display_name_anonymous: 'Anonymous ' + formData.name,
        password: hashedPassword, status: 1, created_at: Math.floor(Date.now() / 1000),
      }).select('id').single();
      if (userError) throw userError;
      const { data: newEO, error: eoError } = await supabase.from('ir_event_organizers').insert({
        name: formData.name, detail: formData.detail, image: formData.image || null,
        created_at: Math.floor(Date.now() / 1000),
      }).select('id').single();
      if (eoError) throw eoError;
      const { error: linkError } = await supabase.from('ir_users_admin').insert({
        roles_id: 2, users_id: newUser.id, event_organizers_id: newEO.id,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'eo-accounts'] });
      toast.success('EO account created');
      setShowModal(false);
      setForm({ name: '', detail: '', image: '', email: '', password: '', username: '' });
    },
    onError: (err) => { console.error(err); toast.error('Failed to create EO account'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('ir_users_admin').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'eo-accounts'] }); toast.success('EO access removed'); },
    onError: () => toast.error('Failed'),
  });

  const { sorted: sortedEOs, toggleSort, SortIcon } = useTableSort(eos, 'created_at' as any, 'desc');

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>EO Accounts</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Manage Event Organizer access</p>
        </div>
        <button onClick={() => { setForm({ name: '', detail: '', image: '', email: '', password: '', username: '' }); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={12} /> Create EO
        </button>
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                <th style={th}><button onClick={() => toggleSort('eo' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>EO Name <SortIcon col={'eo' as any} /></button></th>
                <th style={th}>Username</th>
                <th style={th}>Email</th>
                <th style={th}><button onClick={() => toggleSort('created_at' as any)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center' }}>Created <SortIcon col={'created_at' as any} /></button></th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '48px 18px', textAlign: 'center' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
                </td></tr>
              ) : (sortedEOs?.length ?? 0) === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#333' }}>No EO accounts yet</td></tr>
              ) : sortedEOs?.map((entry, i) => (
                <tr key={entry.id} style={{ borderBottom: i < (sortedEOs.length - 1) ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}>
                        <UserCog size={13} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0' }}>{entry.eo?.name || '—'}</div>
                        {entry.eo?.detail && <div style={{ fontSize: 10, color: '#484848', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.eo.detail}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555' }}>@{entry.user?.username || '—'}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555' }}>{entry.user?.email || '—'}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#484848' }}>
                    {entry.created_at ? new Date(entry.created_at * 1000).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    <button onClick={() => { if (confirm('Remove EO access?')) deleteMutation.mutate(entry.id); }}
                      style={{ background: 'none', border: 'none', color: '#4a1a1a', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>Create EO Account</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>EO Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} required /></div>
              <div><label style={lbl}>Username <span style={{ color: '#333', fontSize: 10 }}>(used on posts)</span></label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s+/g, '_').toLowerCase() })} placeholder="e.g. soundrush_official" style={inp} required /></div>
              <div><label style={lbl}>Description</label><textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={3} style={{ ...inp, resize: 'none' }} required /></div>
              <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} required /></div>
              <div><label style={lbl}>Password</label><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inp} required minLength={6} /></div>
              <button type="submit" disabled={createMutation.isPending}
                style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
                {createMutation.isPending ? 'Creating…' : 'Create EO Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
