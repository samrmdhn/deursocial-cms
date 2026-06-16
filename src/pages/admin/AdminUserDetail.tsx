import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, UserCircle, Mail, ShieldCheck, MapPin, Phone, Calendar, Flag, Award, X } from 'lucide-react';
import toast from 'react-hot-toast';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/`;

export default function AdminUserDetail() {
  const { userId } = useParams({ strict: false }) as { userId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const { data } = await supabase.from('ir_users').select('*').eq('id', Number(userId)).single();
      return data;
    },
    enabled: !!userId,
  });

  const verifyMutation = useMutation({
    mutationFn: async (val: 0 | 1) => {
      const { error } = await supabase.from('ir_users').update({ is_verified: val }).eq('id', Number(userId));
      if (error) throw error;
    },
    onSuccess: (_, val) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      toast.success(val === 1 ? 'User verified' : 'Verification removed');
    },
    onError: () => toast.error('Failed to update'),
  });

  const { data: allBadges } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_badges').select('id, slug, name, image_url').eq('is_active', true).order('name');
      return data ?? [];
    },
  });

  const { data: userBadges, refetch: refetchUserBadges } = useQuery({
    queryKey: ['user-assigned-badges', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_user_assigned_badges')
        .select('id, badge_number, assigned_at, ir_badges(id, slug, name, image_url)')
        .eq('user_id', Number(userId))
        .order('assigned_at');
      return data ?? [];
    },
    enabled: !!userId,
  });

  const assignBadgeMutation = useMutation({
    mutationFn: async (badgeId: number) => {
      const count = userBadges?.filter((b: any) => b.ir_badges?.id === badgeId).length ?? 0;
      if (count > 0) throw new Error('User already has this badge');
      const { count: total } = await supabase
        .from('ir_user_assigned_badges')
        .select('id', { count: 'exact', head: true })
        .eq('badge_id', badgeId);
      const { error } = await supabase.from('ir_user_assigned_badges').insert({
        user_id: Number(userId),
        badge_id: badgeId,
        badge_number: (total ?? 0) + 1,
        assigned_by: 'admin',
      });
      if (error) throw error;
    },
    onSuccess: () => { refetchUserBadges(); toast.success('Badge assigned'); setSelectedBadgeId(''); },
    onError: (err: any) => toast.error(err.message ?? 'Failed to assign'),
  });

  const removeBadgeMutation = useMutation({
    mutationFn: async (badgeId: number) => {
      const { error } = await supabase
        .from('ir_user_assigned_badges')
        .delete()
        .eq('user_id', Number(userId))
        .eq('badge_id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => { refetchUserBadges(); toast.success('Badge removed'); },
    onError: () => toast.error('Failed to remove'),
  });

  const formatDate = (epoch?: number) => {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%' }} className="ds-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '24px 28px', color: '#888', fontSize: 12 }}>
        User not found.{' '}
        <button onClick={() => navigate({ to: '/admin/users' })} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>Back</button>
      </div>
    );
  }

  const row = (icon: React.ReactNode, label: string, value: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 12, color: '#c0c0c0' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate({ to: '/admin/users' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ArrowLeft size={13} /> Back to Users
      </button>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '24px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Avatar + basic */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 120 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '1px solid #1e1e1e', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user.photo
              ? <img src={`${IMG_BASE}${user.photo}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <UserCircle size={40} style={{ color: '#333' }} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d8', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              {user.display_name}
              {user.is_verified === 1 && <ShieldCheck size={14} style={{ color: '#4a8a8a' }} />}
            </div>
            <div style={{ fontSize: 11, color: '#484848', marginTop: 2 }}>@{user.username}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: user.status === 1 ? '#22c55e' : '#ef4444' }}>
            ● {user.status === 1 ? 'Active' : 'Banned'}
          </span>
          <button
            onClick={() => verifyMutation.mutate(user.is_verified === 1 ? 0 : 1)}
            disabled={verifyMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600,
              padding: '5px 10px', borderRadius: 4, border: '1px solid',
              cursor: 'pointer', opacity: verifyMutation.isPending ? 0.5 : 1,
              background: user.is_verified === 1 ? 'transparent' : '#0e1a0e',
              borderColor: user.is_verified === 1 ? '#333' : '#1a3a1a',
              color: user.is_verified === 1 ? '#555' : '#22c55e',
            }}
          >
            <ShieldCheck size={11} />
            {user.is_verified === 1 ? 'Remove Verified' : 'Set Verified'}
          </button>
        </div>

        {/* Detail grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {row(<Mail size={11} />, 'Email', user.email || '—')}
          {row(<Phone size={11} />, 'Phone', user.phone || '—')}
          {row(<UserCircle size={11} />, 'Gender', user.gender || '—')}
          {row(<MapPin size={11} />, 'Location', user.city || '—')}
          {row(<Calendar size={11} />, 'Joined', formatDate(user.created_at))}
          {row(<Flag size={11} />, 'Country Code', user.country_code || '—')}
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444' }}>Bio</div>
            <div style={{ fontSize: 12, color: user.description ? '#c0c0c0' : '#333', background: '#080808', border: '1px solid #141414', borderRadius: 4, padding: '10px 12px', lineHeight: 1.6 }}>
              {user.description || 'No bio provided.'}
            </div>
          </div>
        </div>
      </div>

      {/* Badges section */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={13} style={{ color: '#666' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444' }}>Assigned Badges</span>
        </div>

        {/* Current badges */}
        {userBadges && userBadges.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {userBadges.map((ub: any) => {
              const badge = ub.ir_badges;
              return (
                <div key={ub.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#111', border: '1px solid #1e1e1e', borderRadius: 6,
                  padding: '6px 10px',
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {badge?.image_url
                      ? <img src={badge.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <Award size={12} style={{ color: '#444' }} />
                    }
                  </div>
                  <span style={{ fontSize: 12, color: '#c0c0c0' }}>
                    {badge?.name}{ub.badge_number ? ` #${ub.badge_number}` : ''}
                  </span>
                  <button
                    onClick={() => removeBadgeMutation.mutate(badge?.id)}
                    disabled={removeBadgeMutation.isPending}
                    title="Remove badge"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', display: 'flex', padding: 0, marginLeft: 2 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#333' }}>No badges assigned.</div>
        )}

        {/* Assign new badge */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedBadgeId}
            onChange={e => setSelectedBadgeId(e.target.value)}
            style={{
              flex: 1, padding: '8px 10px', background: '#080808', border: '1px solid #1e1e1e',
              borderRadius: 5, color: selectedBadgeId ? '#e0e0e0' : '#444', fontSize: 12, outline: 'none',
            }}
          >
            <option value="">Select badge to assign…</option>
            {allBadges?.map((b: any) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={() => selectedBadgeId && assignBadgeMutation.mutate(Number(selectedBadgeId))}
            disabled={!selectedBadgeId || assignBadgeMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
              background: selectedBadgeId ? '#1a2a1a' : '#111',
              color: selectedBadgeId ? '#22c55e' : '#333',
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            <Award size={12} /> Assign
          </button>
        </div>
      </div>
    </div>
  );
}
