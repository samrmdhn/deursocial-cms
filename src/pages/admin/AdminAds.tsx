import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

type AdStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface EventAd {
  id: number;
  event_slug: string;
  eo_user_id: number;
  client_name: string;
  image_url: string;
  cta_url: string | null;
  status: string;
  reject_reason: string | null;
  starts_at: number | null;
  ends_at: number | null;
  created_at: number;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
};

function formatDate(epoch: number | null) {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminAds() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AdStatus>('pending');
  const [rejectModal, setRejectModal] = useState<{ id: number; open: boolean }>({ id: 0, open: false });
  const [rejectReason, setRejectReason] = useState('');

  const { data: ads, isLoading } = useQuery({
    queryKey: ['admin', 'ads', filter],
    queryFn: async () => {
      let q = supabase.from('ir_event_ads').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EventAd[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_event_ads').update({ status: 'approved', reject_reason: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'ads'] }); toast.success('Ad approved'); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { error } = await supabase.from('ir_event_ads').update({ status: 'rejected', reject_reason: reason || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] });
      toast.success('Ad rejected');
      setRejectModal({ id: 0, open: false });
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject'),
  });

  const FILTERS: AdStatus[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>EO Ads</h1>
        <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Review and approve sponsored ads from event organizers</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid', borderColor: filter === f ? '#fff' : '#222', background: filter === f ? '#fff' : 'transparent', color: filter === f ? '#000' : '#666', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ color: '#555', fontSize: 13 }}>Loading…</div>
      ) : !ads?.length ? (
        <div style={{ color: '#555', fontSize: 13 }}>No ads found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ads.map(ad => (
            <div key={ad.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Image preview */}
              <img src={ad.image_url} alt={ad.client_name} style={{ width: 200, height: 32, objectFit: 'contain', borderRadius: 4, background: '#111', flexShrink: 0, border: '1px solid #1a1a1a' }} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{ad.client_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[ad.status] || '#666', background: `${STATUS_COLOR[ad.status] || '#666'}18`, padding: '2px 8px', borderRadius: 999 }}>{ad.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Event: {ad.event_slug}</div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>EO User ID: {ad.eo_user_id}</div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Schedule: {formatDate(ad.starts_at)} → {formatDate(ad.ends_at)}</div>
                {ad.cta_url && <div style={{ fontSize: 11, color: '#555' }}>CTA: {ad.cta_url}</div>}
                {ad.reject_reason && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Reject reason: {ad.reject_reason}</div>}
              </div>

              {/* Actions */}
              {ad.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => approveMutation.mutate(ad.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 6, fontSize: 12, color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}>
                    <Check size={13} /> Approve
                  </button>
                  <button onClick={() => { setRejectModal({ id: ad.id, open: true }); setRejectReason(''); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#ef444418', border: '1px solid #ef444444', borderRadius: 6, fontSize: 12, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                    <X size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: 24, width: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0e0', marginBottom: 16 }}>Reject Ad</div>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6 }}>Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this ad is rejected…"
              rows={3}
              style={{ width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal({ id: 0, open: false })} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #222', borderRadius: 6, color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
