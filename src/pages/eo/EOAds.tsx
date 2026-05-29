import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, BarChart2, Download } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const IMG_BASE = `${SUPABASE_URL}/storage/v1/object/public/post-images/`;

type AdStatus = 'pending' | 'approved' | 'rejected';

interface EventAd {
  id: number;
  event_slug: string;
  client_name: string;
  image_url: string;
  cta_url: string | null;
  status: AdStatus;
  reject_reason: string | null;
  starts_at: number | null;
  ends_at: number | null;
  created_at: number;
  event_title?: string;
}

interface AdAnalytic {
  ad_id: number;
  action: string;
  user_id: number;
  created_at: number;
}

interface AdUser {
  id: number;
  display_name: string;
  username: string;
  photo: string | null;
  actions: string[];
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 };

const STATUS_COLOR: Record<AdStatus, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
};

function toEpoch(val: string) {
  if (!val) return null;
  return Math.floor(new Date(val).getTime() / 1000);
}

function fromEpoch(val: number | null) {
  if (!val) return '';
  return new Date(val * 1000).toISOString().slice(0, 16);
}

function formatDate(epoch: number | null) {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EOAds() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [analyticsAdId, setAnalyticsAdId] = useState<number | null>(null);
  const [form, setForm] = useState({ event_slug: '', client_name: '', cta_url: '', starts_at: '', ends_at: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch EO's events for dropdown
  const { data: events } = useQuery({
    queryKey: ['eo', 'events-simple', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase.from('ir_content_details').select('slug, title').eq('event_organizers_id', eoId).order('title');
      return data || [];
    },
    enabled: !!eoId,
  });

  // Fetch ads
  const { data: ads, isLoading } = useQuery({
    queryKey: ['eo', 'ads', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const eventSlugs = (events || []).map((e: any) => e.slug);
      if (!eventSlugs.length) return [];
      const { data } = await supabase
        .from('ir_event_ads')
        .select('*')
        .in('event_slug', eventSlugs)
        .order('created_at', { ascending: false });
      const slugMap = Object.fromEntries((events || []).map((e: any) => [e.slug, e.title]));
      return (data || []).map((ad: any) => ({ ...ad, event_title: slugMap[ad.event_slug] || ad.event_slug })) as EventAd[];
    },
    enabled: !!eoId && !!events,
  });

  // Analytics + audience query
  const { data: analytics } = useQuery({
    queryKey: ['eo', 'ad-analytics', analyticsAdId],
    queryFn: async () => {
      if (!analyticsAdId) return [];
      const { data } = await supabase
        .from('ir_event_ad_analytics')
        .select('ad_id, action, user_id, created_at')
        .eq('ad_id', analyticsAdId)
        .order('created_at', { ascending: true });
      return (data || []) as AdAnalytic[];
    },
    enabled: !!analyticsAdId,
  });

  const { data: audienceUsers } = useQuery({
    queryKey: ['eo', 'ad-audience', analyticsAdId, analytics?.length],
    queryFn: async () => {
      if (!analytics?.length) return [];
      const userIds = [...new Set(analytics.map(r => r.user_id).filter(Boolean))];
      if (!userIds.length) return [];
      const { data } = await supabase
        .from('ir_users')
        .select('id, display_name, username, photo')
        .in('id', userIds);
      const userMap = Object.fromEntries((data || []).map((u: any) => [u.id, u]));
      const actionsByUser: Record<number, Set<string>> = {};
      for (const r of analytics) {
        if (!r.user_id) continue;
        if (!actionsByUser[r.user_id]) actionsByUser[r.user_id] = new Set();
        actionsByUser[r.user_id].add(r.action);
      }
      return userIds.map(uid => ({
        ...userMap[uid],
        actions: [...(actionsByUser[uid] || [])],
      })).filter((u: any) => u.username) as AdUser[];
    },
    enabled: !!analyticsAdId && (analytics?.length ?? 0) > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file || !eoId) throw new Error('Missing file or user');
      if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit');

      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `ad-images/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const image_url = `${IMG_BASE}${path}`;
      const { error } = await supabase.from('ir_event_ads').insert({
        event_slug: form.event_slug,
        eo_user_id: eoId,
        client_name: form.client_name,
        image_url,
        cta_url: form.cta_url || null,
        format: 'banner',
        placement: 'event_detail',
        status: 'pending',
        starts_at: toEpoch(form.starts_at),
        ends_at: toEpoch(form.ends_at),
        sort_order: 0,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eo', 'ads'] });
      toast.success('Ad submitted for review');
      setShowModal(false);
      setForm({ event_slug: '', client_name: '', cta_url: '', starts_at: '', ends_at: '' });
      setFile(null);
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ad: EventAd) => {
      const path = ad.image_url.replace(IMG_BASE, '');
      await supabase.storage.from('post-images').remove([path]);
      const { error } = await supabase.from('ir_event_ads').delete().eq('id', ad.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eo', 'ads'] }); toast.success('Ad deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  // Analytics helpers
  const getAnalyticsSummary = (rows: AdAnalytic[]) => {
    const impressions = rows.filter(r => r.action === 'impression');
    const clicks = rows.filter(r => r.action === 'click');
    const dismissals = rows.filter(r => r.action === 'dismiss');
    const uniqueImpressions = new Set(impressions.map(r => r.user_id)).size;
    const uniqueClicks = new Set(clicks.map(r => r.user_id)).size;
    const ctr = impressions.length ? ((clicks.length / impressions.length) * 100).toFixed(2) : '0.00';
    return { impressions: impressions.length, uniqueImpressions, clicks: clicks.length, uniqueClicks, ctr, dismissals: dismissals.length };
  };

  const getDailyBreakdown = (rows: AdAnalytic[]) => {
    const map: Record<string, { impressions: Set<number>; clicks: Set<number>; dismissals: number; imp_total: number; clk_total: number }> = {};
    for (const r of rows) {
      const day = new Date(r.created_at * 1000).toISOString().slice(0, 10);
      if (!map[day]) map[day] = { impressions: new Set(), clicks: new Set(), dismissals: 0, imp_total: 0, clk_total: 0 };
      if (r.action === 'impression') { map[day].impressions.add(r.user_id); map[day].imp_total++; }
      if (r.action === 'click') { map[day].clicks.add(r.user_id); map[day].clk_total++; }
      if (r.action === 'dismiss') map[day].dismissals++;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
      date,
      impressions: v.imp_total,
      unique_impressions: v.impressions.size,
      clicks: v.clk_total,
      unique_clicks: v.clicks.size,
      dismissals: v.dismissals,
    }));
  };

  const exportCSV = () => {
    if (!analytics) return;
    const rows = getDailyBreakdown(analytics);
    const header = 'date,impressions,unique_impressions,clicks,unique_clicks,dismissals';
    const body = rows.map(r => `${r.date},${r.impressions},${r.unique_impressions},${r.clicks},${r.unique_clicks},${r.dismissals}`).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-${analyticsAdId}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = analytics ? getAnalyticsSummary(analytics) : null;
  const daily = analytics ? getDailyBreakdown(analytics) : [];
  const selectedAd = ads?.find(a => a.id === analyticsAdId);

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>My Ads</h1>
          <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Manage sponsored banners for your events</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> New Ad
        </button>
      </div>

      {/* Ads list */}
      {isLoading ? (
        <div style={{ color: '#555', fontSize: 13 }}>Loading…</div>
      ) : !ads?.length ? (
        <div style={{ color: '#555', fontSize: 13 }}>No ads yet. Create your first ad.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ads.map(ad => (
            <div key={ad.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <img src={ad.image_url} alt={ad.client_name} style={{ width: 160, height: 25, objectFit: 'contain', borderRadius: 4, background: '#111', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{ad.client_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[ad.status], background: `${STATUS_COLOR[ad.status]}18`, padding: '2px 8px', borderRadius: 999 }}>{ad.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Event: {ad.event_title}</div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Schedule: {formatDate(ad.starts_at)} → {formatDate(ad.ends_at)}</div>
                {ad.cta_url && <div style={{ fontSize: 11, color: '#555' }}>CTA: {ad.cta_url}</div>}
                {ad.status === 'rejected' && ad.reject_reason && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>Rejected: {ad.reject_reason}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => setAnalyticsAdId(ad.id)} title="Analytics" style={{ padding: '6px 8px', background: '#111', border: '1px solid #222', borderRadius: 6, cursor: 'pointer', color: '#888' }}>
                  <BarChart2 size={14} />
                </button>
                {(ad.status === 'pending' || ad.status === 'rejected') && (
                  <button onClick={() => { if (confirm('Delete this ad?')) deleteMutation.mutate(ad); }} title="Delete" style={{ padding: '6px 8px', background: '#111', border: '1px solid #222', borderRadius: 6, cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: 24, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#e0e0e0' }}>New Ad</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Event *</label>
                <select value={form.event_slug} onChange={e => setForm(f => ({ ...f, event_slug: e.target.value }))} style={{ ...inp }}>
                  <option value="">Select event…</option>
                  {(events || []).map((e: any) => <option key={e.slug} value={e.slug}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Client Name *</label>
                <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} style={inp} placeholder="e.g. AQUA, Samsung" />
              </div>
              <div>
                <label style={lbl}>Banner Image * (JPEG/GIF, max 5MB, recommended 320×50)</label>
                <input type="file" accept="image/jpeg,image/gif,image/png" onChange={e => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 5 * 1024 * 1024) { toast.error('File exceeds 5MB'); return; }
                  setFile(f);
                }} style={{ ...inp, padding: '7px 12px' }} />
                {file && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{file.name} ({(file.size / 1024).toFixed(0)} KB)</div>}
              </div>
              <div>
                <label style={lbl}>CTA URL (optional)</label>
                <input value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} style={inp} placeholder="https://…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Start Date (optional)</label>
                  <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>End Date (optional)</label>
                  <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} style={inp} />
                </div>
              </div>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.event_slug || !form.client_name || !file || uploading}
                style={{ padding: '10px 16px', background: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!form.event_slug || !form.client_name || !file || uploading) ? 0.5 : 1 }}
              >
                {uploading ? 'Uploading…' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics modal */}
      {analyticsAdId && selectedAd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: 24, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0e0' }}>Analytics — {selectedAd.client_name}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{selectedAd.event_title}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#111', border: '1px solid #222', borderRadius: 6, fontSize: 11, color: '#aaa', cursor: 'pointer' }}>
                  <Download size={12} /> Export CSV
                </button>
                <button onClick={() => setAnalyticsAdId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={16} /></button>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Impressions', value: summary.impressions },
                  { label: 'Unique Impressions', value: summary.uniqueImpressions },
                  { label: 'Clicks', value: summary.clicks },
                  { label: 'Unique Clicks', value: summary.uniqueClicks },
                  { label: 'CTR', value: `${summary.ctr}%` },
                  { label: 'Dismissals', value: summary.dismissals },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Daily breakdown */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10 }}>Daily Breakdown</div>
            {!daily.length ? (
              <div style={{ color: '#444', fontSize: 12 }}>No data yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Date', 'Impr.', 'Uniq. Impr.', 'Clicks', 'Uniq. Clicks', 'Dismiss'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 500, borderBottom: '1px solid #1a1a1a' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daily.map(r => (
                    <tr key={r.date}>
                      {[r.date, r.impressions, r.unique_impressions, r.clicks, r.unique_clicks, r.dismissals].map((v, i) => (
                        <td key={i} style={{ padding: '6px 8px', color: '#aaa', borderBottom: '1px solid #111' }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Audience */}
            {!!audienceUsers?.length && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#666', margin: '20px 0 10px' }}>Audience ({audienceUsers.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {audienceUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.photo
                        ? <img src={u.photo} alt={u.display_name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#222' }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#666' }}>{(u.display_name || u.username || '?')[0].toUpperCase()}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.display_name || u.username}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>@{u.username}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {u.actions.map(action => {
                          const color = action === 'click' ? '#22c55e' : action === 'dismiss' ? '#ef4444' : '#555';
                          return <span key={action} style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, padding: '2px 7px', borderRadius: 999, textTransform: 'capitalize' }}>{action}</span>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
