import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Award, Download, Plus, QrCode, Upload, X, MapPin, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import type { GeofenceConfig } from './GeofenceMap';

const GeofenceMap = lazy(() => import('./GeofenceMap'));

interface CheckinConfig {
  is_active: boolean;
  checkin_mode: 'once';
  checkin_method: 'qr' | 'button';
  geofence: GeofenceConfig;
  passport_image_url: string | null;
}

interface BadgeSummary {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
}

interface Props {
  eventSlug: string;
  apiBase: string;
  token: string;
  disabled?: boolean;
  /** EO mode: saves checkin config to draft_data instead of directly to ir_event_qr_config */
  eoMode?: boolean;
  /** Required when eoMode=true — the ir_content_details.id for the event */
  eventContentId?: number;
  /** Existing draft_data.checkin_config to overlay on loaded live config */
  draftCheckinConfig?: Record<string, any> | null;
}

const DEFAULT_GEOFENCE: GeofenceConfig = {
  mode: 'radius',
  center_lat: -6.2088,
  center_lng: 106.8456,
  radius_m: 200,
  polygon: [],
};

const S = {
  section: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #141414',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    color: '#444',
    marginBottom: 8,
    display: 'block',
  },
  segControl: (active: boolean) => ({
    flex: 1,
    padding: '7px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#1c1c1c' : 'transparent',
    color: active ? '#d0d0d0' : '#444',
    fontSize: 11,
    fontWeight: 500,
    transition: 'all 0.15s',
  }),
  saveBtn: (saving: boolean) => ({
    width: '100%',
    padding: '10px',
    background: saving ? '#0d0d0d' : '#fff',
    border: saving ? '1px solid #141414' : '1px solid transparent',
    borderRadius: 6,
    color: saving ? '#2e2e2e' : '#000',
    fontSize: 12,
    fontWeight: 600,
    cursor: saving ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }),
};

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        background: value ? '#22c55e' : '#1e1e1e',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: value ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export default function CheckinSection({ eventSlug, apiBase, token, disabled, eoMode, eventContentId, draftCheckinConfig }: Props) {
  if (disabled) {
    return (
      <div style={{ ...S.section, opacity: 0.5, pointerEvents: 'none' }}>
        <div style={S.header}>
          <div style={S.headerLeft}>
            <QrCode size={14} style={{ color: '#555' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0', letterSpacing: '-0.2px' }}>Check-in</span>
          </div>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <QrCode size={24} style={{ color: '#333', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Check-in configuration</p>
          <p style={{ fontSize: 11, color: '#333' }}>Available after event is created</p>
        </div>
      </div>
    );
  }

  const [config, setConfig] = useState<CheckinConfig>({
    is_active: false,
    checkin_mode: 'once',
    checkin_method: 'qr',
    geofence: DEFAULT_GEOFENCE,
    passport_image_url: null,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Badge state
  const [checkinBadgeId, setCheckinBadgeId] = useState<number | null>(null);
  const [currentBadge, setCurrentBadge] = useState<BadgeSummary | null>(null);
  const [badgeMode, setBadgeMode] = useState<'none' | 'create'>('none');
  const [badgeCreateName, setBadgeCreateName] = useState('');
  const [badgeCreateDesc, setBadgeCreateDesc] = useState('');
  const [badgeCreateFile, setBadgeCreateFile] = useState<File | null>(null);
  const [badgeCreatePreview, setBadgeCreatePreview] = useState<string | null>(null);
  const [creatingBadge, setCreatingBadge] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    supabase
      .from('ir_event_qr_config')
      .select('*')
      .eq('event_slug', eventSlug)
      .single()
      .then(({ data }) => {
        let cfg: CheckinConfig = {
          is_active: false,
          checkin_mode: 'once',
          checkin_method: 'qr',
          geofence: DEFAULT_GEOFENCE,
          passport_image_url: null,
        };
        let badgeId: number | null = null;

        if (data) {
          cfg = {
            is_active: data.is_active ?? false,
            checkin_mode: 'once',
            checkin_method: data.checkin_method ?? 'qr',
            geofence: {
              mode: 'radius',
              center_lat: data.geofence_center_lat ?? -6.2088,
              center_lng: data.geofence_center_lng ?? 106.8456,
              radius_m: data.geofence_radius_m ?? 200,
              polygon: [],
            },
            passport_image_url: data.passport_image_url ?? null,
          };
          badgeId = data.checkin_badge_id ?? null;
          if (data.passport_image_url) setStampPreview(data.passport_image_url);
          if (data.is_active) doFetchQR();
        }

        // EO mode: overlay pending draft config on top of live config
        if (eoMode && draftCheckinConfig) {
          cfg = {
            is_active: draftCheckinConfig.is_active ?? cfg.is_active,
            checkin_mode: 'once',
            checkin_method: draftCheckinConfig.checkin_method ?? cfg.checkin_method,
            geofence: {
              mode: 'radius',
              center_lat: draftCheckinConfig.geofence_center_lat ?? cfg.geofence.center_lat,
              center_lng: draftCheckinConfig.geofence_center_lng ?? cfg.geofence.center_lng,
              radius_m: draftCheckinConfig.geofence_radius_m ?? cfg.geofence.radius_m,
              polygon: [],
            },
            passport_image_url: draftCheckinConfig.passport_image_url ?? cfg.passport_image_url,
          };
          badgeId = draftCheckinConfig.checkin_badge_id ?? null;
          if (draftCheckinConfig.passport_image_url) setStampPreview(draftCheckinConfig.passport_image_url);
        }

        setConfig(cfg);

        if (badgeId) {
          setCheckinBadgeId(badgeId);
          supabase
            .from('ir_badges')
            .select('id, slug, name, image_url')
            .eq('id', badgeId)
            .single()
            .then(({ data: b }) => { if (b) setCurrentBadge(b); });
        }
        setLoaded(true);
      });

  }, [eventSlug]);

  const doFetchQR = async () => {
    setLoadingQR(true);
    try {
      const res = await fetch(`${apiBase}/api/events/${eventSlug}/qr`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': 'ku4jaK6v%$gd364GAga5',
          'x-date-for': new Date().toISOString(),
        },
      });
      const json = await res.json();
      if (json.data?.qr) setQrDataUrl(json.data.qr);
      else toast.error('QR not available. Save config first.');
    } catch {
      toast.error('Failed to load QR code');
    } finally {
      setLoadingQR(false);
    }
  };

  const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampFile(file);
    setStampPreview(URL.createObjectURL(file));
  };

  const handleBadgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBadgeCreateFile(file);
    setBadgeCreatePreview(URL.createObjectURL(file));
  };

  const handleCreateBadge = async () => {
    if (!badgeCreateName.trim()) { toast.error('Badge name is required'); return; }
    setCreatingBadge(true);
    try {
      let imageUrl: string | null = null;
      if (badgeCreateFile) {
        const path = `badges/${Date.now()}-${badgeCreateFile.name}`;
        const { error: upErr } = await supabase.storage.from('post-images').upload(path, badgeCreateFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const slug = badgeCreateName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
      const { data: newBadge, error } = await supabase.from('ir_badges').insert({
        slug,
        name: badgeCreateName.trim(),
        description: badgeCreateDesc.trim() || null,
        image_url: imageUrl,
        is_active: true,
        created_at: Math.floor(Date.now() / 1000),
      }).select('id, slug, name, image_url').single();
      if (error) {
        if (error.code === '23505') toast.error('A badge with this name already exists');
        else throw error;
        return;
      }
      setCheckinBadgeId(newBadge.id);
      setCurrentBadge(newBadge);
      setBadgeMode('none');
      setBadgeCreateName(''); setBadgeCreateDesc('');
      setBadgeCreateFile(null); setBadgeCreatePreview(null);
      // Immediately persist the badge link so check-in can award it
      if (eoMode && eventContentId) {
        // EO mode: save to draft_data.checkin_config so it goes through approval
        const { data: currentRow } = await supabase.from('ir_content_details')
          .select('draft_data').eq('id', eventContentId).single();
        const existing = currentRow?.draft_data ?? {};
        const existingCfg = existing.checkin_config ?? {};
        await supabase.from('ir_content_details').update({
          draft_data: {
            ...existing,
            checkin_config: {
              is_active: config.is_active, checkin_mode: 'once',
              checkin_method: config.checkin_method,
              geofence_center_lat: config.geofence.center_lat,
              geofence_center_lng: config.geofence.center_lng,
              geofence_radius_m: config.geofence.radius_m,
              passport_image_url: config.passport_image_url,
              ...existingCfg,
              checkin_badge_id: newBadge.id,
            },
          },
          updated_at: Math.floor(Date.now() / 1000),
        }).eq('id', eventContentId);
        toast.success('Badge created — submit for review to go live');
      } else {
        // Admin mode: UPSERT directly (handles missing row too)
        await supabase.from('ir_event_qr_config').upsert({
          event_slug: eventSlug,
          is_active: config.is_active, checkin_mode: 'once',
          checkin_method: config.checkin_method,
          geofence_type: 'radius',
          geofence_center_lat: config.geofence.center_lat,
          geofence_center_lng: config.geofence.center_lng,
          geofence_radius_m: config.geofence.radius_m,
          geofence_polygon_json: [],
          passport_image_url: config.passport_image_url,
          checkin_badge_id: newBadge.id,
          updated_at: Math.floor(Date.now() / 1000),
        }, { onConflict: 'event_slug' });
        toast.success('Badge created and linked to event');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create badge');
    } finally {
      setCreatingBadge(false);
    }
  };

  const handleRemoveBadge = async () => {
    setCheckinBadgeId(null);
    setCurrentBadge(null);
    setBadgeMode('none');
    if (eoMode && eventContentId) {
      const { data: currentRow } = await supabase.from('ir_content_details')
        .select('draft_data').eq('id', eventContentId).single();
      const existing = currentRow?.draft_data ?? {};
      const existingCfg = existing.checkin_config ?? {};
      await supabase.from('ir_content_details').update({
        draft_data: { ...existing, checkin_config: { ...existingCfg, checkin_badge_id: null } },
        updated_at: Math.floor(Date.now() / 1000),
      }).eq('id', eventContentId);
    } else {
      await supabase.from('ir_event_qr_config')
        .update({ checkin_badge_id: null })
        .eq('event_slug', eventSlug);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let stampUrl = config.passport_image_url;
      if (stampFile) {
        const ext = stampFile.name.split('.').pop();
        const path = `stamps/${eventSlug}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('post-images')
          .upload(path, stampFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
        stampUrl = urlData.publicUrl;
      }

      if (eoMode && eventContentId) {
        // EO mode: write to draft_data.checkin_config (requires admin approval)
        const { data: currentRow } = await supabase.from('ir_content_details')
          .select('draft_data').eq('id', eventContentId).single();
        const existing = currentRow?.draft_data ?? {};
        const { error } = await supabase.from('ir_content_details').update({
          draft_data: {
            ...existing,
            checkin_config: {
              is_active: config.is_active,
              checkin_mode: 'once',
              checkin_method: config.checkin_method,
              geofence_center_lat: config.geofence.center_lat,
              geofence_center_lng: config.geofence.center_lng,
              geofence_radius_m: config.geofence.radius_m,
              passport_image_url: stampUrl,
              checkin_badge_id: checkinBadgeId ?? null,
            },
          },
          updated_at: Math.floor(Date.now() / 1000),
        }).eq('id', eventContentId);
        if (error) throw error;
        setConfig((c) => ({ ...c, passport_image_url: stampUrl }));
        toast.success('Check-in config submitted for review');
      } else {
        // Admin mode: save directly to ir_event_qr_config
        const { error } = await supabase.from('ir_event_qr_config').upsert({
          event_slug: eventSlug,
          is_active: config.is_active,
          checkin_mode: 'once',
          checkin_method: config.checkin_method,
          geofence_type: 'radius',
          geofence_center_lat: config.geofence.center_lat,
          geofence_center_lng: config.geofence.center_lng,
          geofence_radius_m: config.geofence.radius_m,
          geofence_polygon_json: [],
          passport_image_url: stampUrl,
          checkin_badge_id: checkinBadgeId ?? null,
          updated_at: Math.floor(Date.now() / 1000),
        }, { onConflict: 'event_slug' });
        if (error) throw error;
        setConfig((c) => ({ ...c, passport_image_url: stampUrl }));
        toast.success('Check-in config saved');
        if (config.is_active && !qrDataUrl) doFetchQR();
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `checkin-qr-${eventSlug}.png`;
    a.click();
  };

  if (!loaded) {
    return (
      <div style={{ ...S.section, padding: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 14, height: 14, border: '2px solid #1a1a1a', borderTopColor: '#333', borderRadius: '50%' }} className="ds-spin" />
        <span style={{ fontSize: 11, color: '#444' }}>Loading check-in config…</span>
      </div>
    );
  }

  return (
    <div style={S.section}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <QrCode size={14} style={{ color: '#555' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0', letterSpacing: '-0.2px' }}>Check-in</span>
          {config.is_active && (
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '2px 7px', borderRadius: 10 }}>
              Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: config.is_active ? '#22c55e' : '#444' }}>
            {config.is_active ? 'Enabled' : 'Disabled'}
          </span>
          <Toggle value={config.is_active} onChange={() => setConfig((c) => ({ ...c, is_active: !c.is_active }))} />
        </div>
      </div>

      <div style={S.body}>
        {/* EO pending review banner */}
        {eoMode && draftCheckinConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.5px' }}>⏳ PENDING REVIEW</span>
            <span style={{ fontSize: 10, color: '#78716c' }}>These check-in changes await admin approval</span>
          </div>
        )}

        {/* Check-in Method */}
        <div>
          <span style={S.label}>Check-in Method</span>
          <div style={{ display: 'flex', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 7, padding: 3, gap: 2 }}>
            {([
              { key: 'qr', label: 'Scan QR', icon: <QrCode size={11} /> },
              { key: 'button', label: 'Location Button', icon: <Smartphone size={11} /> },
            ] as const).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, checkin_method: m.key }))}
                style={S.segControl(config.checkin_method === m.key)}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {m.icon}{m.label}
                </span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#333', marginTop: 6 }}>
            {config.checkin_method === 'qr'
              ? 'User scans QR code shown at venue. More secure.'
              : 'User taps a button on their phone and location is verified against geofence.'}
          </p>
        </div>

        {/* Geofence — radius only */}
        <div>
          <span style={S.label}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={10} /> Geofence Location
            </span>
          </span>
          <Suspense fallback={
            <div style={{ height: 240, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#333' }}>Loading map…</span>
            </div>
          }>
            <GeofenceMap
              value={config.geofence}
              onChange={(g) => setConfig((c) => ({ ...c, geofence: g }))}
              polygonEnabled={false}
            />
          </Suspense>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1, padding: '8px 12px', background: '#080808', border: '1px solid #141414', borderRadius: 6 }}>
              <span style={{ fontSize: 9, color: '#444', display: 'block', marginBottom: 2 }}>LAT</span>
              <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{config.geofence.center_lat.toFixed(6)}</span>
            </div>
            <div style={{ flex: 1, padding: '8px 12px', background: '#080808', border: '1px solid #141414', borderRadius: 6 }}>
              <span style={{ fontSize: 9, color: '#444', display: 'block', marginBottom: 2 }}>LNG</span>
              <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{config.geofence.center_lng.toFixed(6)}</span>
            </div>
            <div style={{ flex: 1, padding: '8px 12px', background: '#080808', border: '1px solid #141414', borderRadius: 6 }}>
              <span style={{ fontSize: 9, color: '#444', display: 'block', marginBottom: 2 }}>RADIUS</span>
              <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{config.geofence.radius_m}m</span>
            </div>
          </div>
        </div>

        {/* Passport Stamp Image */}
        <div>
          <span style={S.label}>Passport Stamp Image</span>
          {stampPreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: '1px solid #1a1a1a', flexShrink: 0 }}>
                <img src={stampPreview} alt="stamp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Stamp image set. Will appear in user passport after check-in.</p>
                <button
                  type="button"
                  onClick={() => { setStampFile(null); setStampPreview(null); setConfig((c) => ({ ...c, passport_image_url: null })); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#f87171', fontSize: 10, cursor: 'pointer' }}
                >
                  <X size={10} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#080808', border: '1px dashed #1e1e1e', borderRadius: 8, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#111', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={13} style={{ color: '#444' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>Upload stamp image</p>
                <p style={{ fontSize: 10, color: '#333' }}>PNG or JPG, shown in user passport</p>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStampChange} />
            </label>
          )}
        </div>

        {/* Check-in Reward Badge */}
        <div style={{ borderTop: '1px solid #111', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ ...S.label, marginBottom: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Award size={10} /> Check-in Reward Badge
              </span>
            </span>
            <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.5px' }}>OPTIONAL</span>
          </div>

          {currentBadge ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#080808', border: '1px solid #1a2a1a', borderRadius: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#111', border: '1px solid #1e1e1e', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentBadge.image_url
                  ? <img src={currentBadge.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Award size={18} style={{ color: '#333' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#d8d8d8' }}>{currentBadge.name}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>Awarded on successful check-in</div>
              </div>
              <button
                type="button"
                onClick={handleRemoveBadge}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#f87171', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={10} /> Remove
              </button>
            </div>
          ) : badgeMode === 'create' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 90, border: '1px dashed #222', borderRadius: 6, cursor: 'pointer', overflow: 'hidden', background: '#060606' }}>
                {badgeCreatePreview
                  ? <img src={badgeCreatePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#333' }}>
                      <Upload size={16} />
                      <span style={{ fontSize: 10 }}>Badge image</span>
                    </div>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBadgeFileChange} />
              </label>
              <input
                style={{ width: '100%', padding: '8px 12px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }}
                placeholder="Badge name *"
                value={badgeCreateName}
                onChange={(e) => setBadgeCreateName(e.target.value)}
              />
              <input
                style={{ width: '100%', padding: '8px 12px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }}
                placeholder="Description (optional)"
                value={badgeCreateDesc}
                onChange={(e) => setBadgeCreateDesc(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleCreateBadge}
                  disabled={creatingBadge || !badgeCreateName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 5, border: 'none', cursor: creatingBadge ? 'default' : 'pointer', background: '#1a2a1a', color: '#22c55e', fontSize: 11, fontWeight: 600 }}
                >
                  <Plus size={12} /> {creatingBadge ? 'Creating…' : 'Create Badge'}
                </button>
                <button type="button" onClick={() => { setBadgeMode('none'); setBadgeCreateName(''); setBadgeCreateDesc(''); setBadgeCreateFile(null); setBadgeCreatePreview(null); }} style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid #222', cursor: 'pointer', background: 'none', color: '#555', fontSize: 11 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setBadgeMode('create')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 5, border: '1px solid #1e1e1e', cursor: 'pointer', background: 'transparent', color: '#888', fontSize: 11 }}
              >
                <Plus size={11} /> Create New
              </button>
            </div>
          )}
        </div>

        {/* QR Code */}
        {config.is_active && config.checkin_method === 'qr' && (
          <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={S.label}>Venue QR Code</span>
              <button
                type="button"
                onClick={doFetchQR}
                disabled={loadingQR}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'none', border: '1px solid #1e1e1e', borderRadius: 5, color: '#555', fontSize: 10, cursor: loadingQR ? 'default' : 'pointer' }}
              >
                <RefreshCw size={9} style={loadingQR ? { animation: 'spin 1s linear infinite' } : {}} />
                Refresh
              </button>
            </div>
            {loadingQR ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, gap: 8 }}>
                <div style={{ width: 14, height: 14, border: '2px solid #1a1a1a', borderTopColor: '#333', borderRadius: '50%' }} className="ds-spin" />
                <span style={{ fontSize: 11, color: '#333' }}>Loading QR…</span>
              </div>
            ) : qrDataUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#fff', padding: 12, borderRadius: 10 }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 160, height: 160, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={downloadQR}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#161616', border: '1px solid #222', borderRadius: 6, color: '#d0d0d0', fontSize: 11, cursor: 'pointer' }}
                  >
                    <Download size={11} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#161616', border: '1px solid #222', borderRadius: 6, color: '#d0d0d0', fontSize: 11, cursor: 'pointer' }}
                  >
                    Print
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: 11, color: '#444', marginBottom: 10 }}>Save config first to generate QR code</p>
                <button
                  type="button"
                  onClick={doFetchQR}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#111', border: '1px solid #222', borderRadius: 6, color: '#888', fontSize: 11, cursor: 'pointer' }}
                >
                  <QrCode size={12} /> Load QR Code
                </button>
              </div>
            )}
          </div>
        )}

        {/* Save */}
        <button type="button" onClick={handleSave} disabled={saving} style={S.saveBtn(saving)}>
          {saving
            ? <><div style={{ width: 13, height: 13, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" /> Saving…</>
            : eoMode
              ? <><CheckCircle2 size={12} /> Save Check-in to Draft</>
              : <><CheckCircle2 size={12} /> Save Check-in Config</>}
        </button>
      </div>
    </div>
  );
}
