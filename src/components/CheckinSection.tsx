import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download, QrCode, Upload, X, MapPin, CheckCircle2, Clock, RefreshCw, Smartphone } from 'lucide-react';
import type { GeofenceConfig } from './GeofenceMap';

const GeofenceMap = lazy(() => import('./GeofenceMap'));

type StripPattern = 'none' | 'stripes' | 'dots' | 'grid';
type FrameStyle = 'none' | 'thin' | 'thick' | 'glow';
type StickerTheme = 'none' | 'energic' | 'confetti' | 'stars' | 'hearts';

interface CheckinConfig {
  is_active: boolean;
  checkin_mode: 'once' | 'per_day';
  checkin_method: 'qr' | 'button';
  geofence: GeofenceConfig;
  passport_image_url: string | null;
  accent_color: string | null;
  strip_pattern: StripPattern;
  frame_style: FrameStyle;
  sticker_theme: StickerTheme;
}

interface Props {
  eventSlug: string;
  apiBase: string;
  token: string;
  disabled?: boolean;
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

export default function CheckinSection({ eventSlug, apiBase, token, disabled }: Props) {
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
    accent_color: null,
    strip_pattern: 'none',
    frame_style: 'none',
    sticker_theme: 'none',
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    supabase
      .from('ir_event_qr_config')
      .select('*')
      .eq('event_slug', eventSlug)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({
            is_active: data.is_active ?? false,
            checkin_mode: data.checkin_mode ?? 'once',
            checkin_method: data.checkin_method ?? 'qr',
            geofence: {
              mode: data.geofence_type ?? 'radius',
              center_lat: data.geofence_center_lat ?? -6.2088,
              center_lng: data.geofence_center_lng ?? 106.8456,
              radius_m: data.geofence_radius_m ?? 200,
              polygon: data.geofence_polygon_json ?? [],
            },
            passport_image_url: data.passport_image_url ?? null,
            accent_color: data.accent_color ?? null,
            strip_pattern: data.strip_pattern ?? 'none',
            frame_style: data.frame_style ?? 'none',
            sticker_theme: data.sticker_theme ?? 'none',
          });
          if (data.passport_image_url) setStampPreview(data.passport_image_url);
          if (data.is_active) doFetchQR();
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
      const { error } = await supabase.from('ir_event_qr_config').upsert({
        event_slug: eventSlug,
        is_active: config.is_active,
        checkin_mode: config.checkin_mode,
        checkin_method: config.checkin_method,
        geofence_type: config.geofence.mode,
        geofence_center_lat: config.geofence.center_lat,
        geofence_center_lng: config.geofence.center_lng,
        geofence_radius_m: config.geofence.radius_m,
        geofence_polygon_json: config.geofence.polygon,
        passport_image_url: stampUrl,
        accent_color: config.accent_color || null,
        strip_pattern: config.strip_pattern === 'none' ? null : config.strip_pattern,
        frame_style: config.frame_style === 'none' ? null : config.frame_style,
        sticker_theme: config.sticker_theme === 'none' ? null : config.sticker_theme,
        updated_at: Math.floor(Date.now() / 1000),
      }, { onConflict: 'event_slug' });
      if (error) throw error;
      setConfig((c) => ({ ...c, passport_image_url: stampUrl }));
      toast.success('Check-in config saved');
      if (config.is_active && !qrDataUrl) doFetchQR();
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
        {/* Check-in Mode */}
        <div>
          <span style={S.label}>Check-in Mode</span>
          <div style={{ display: 'flex', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 7, padding: 3, gap: 2 }}>
            {(['once', 'per_day'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, checkin_mode: m }))}
                style={S.segControl(config.checkin_mode === m)}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {m === 'once' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  {m === 'once' ? 'Once per event' : 'Once per day'}
                </span>
              </button>
            ))}
          </div>
        </div>

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

        {/* Geofence */}
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
            {config.geofence.mode === 'radius' && (
              <div style={{ flex: 1, padding: '8px 12px', background: '#080808', border: '1px solid #141414', borderRadius: 6 }}>
                <span style={{ fontSize: 9, color: '#444', display: 'block', marginBottom: 2 }}>RADIUS</span>
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{config.geofence.radius_m}m</span>
              </div>
            )}
          </div>
        </div>

        {/* Stamp / Passport Image */}
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

        {/* Passport Cosmetics */}
        <div style={{ borderTop: '1px solid #111', paddingTop: 20 }}>
          <span style={{ ...S.label, display: 'block', marginBottom: 14 }}>Passport Card Cosmetics</span>

          {/* Accent colour */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S.label, marginBottom: 6, display: 'block', color: '#444' }}>Accent Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="color"
                  value={config.accent_color ?? '#ffffff'}
                  onChange={(e) => setConfig((c) => ({ ...c, accent_color: e.target.value }))}
                  style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }}
                />
              </div>
              {config.accent_color ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{config.accent_color}</span>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, accent_color: null }))}
                    style={{ fontSize: 10, color: '#555', background: 'none', border: '1px solid #1e1e1e', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#333' }}>No accent — default warm white card</span>
              )}
            </div>
          </div>

          {/* Strip pattern */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S.label, marginBottom: 6, display: 'block', color: '#444' }}>Strip Pattern</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {(['none', 'stripes', 'dots', 'grid'] as StripPattern[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, strip_pattern: p }))}
                  style={{ padding: '5px 12px', borderRadius: 4, border: config.strip_pattern === p ? '1px solid #444' : '1px solid #1a1a1a', background: config.strip_pattern === p ? '#161616' : 'transparent', color: config.strip_pattern === p ? '#d0d0d0' : '#444', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' as const }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Frame style */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S.label, marginBottom: 6, display: 'block', color: '#444' }}>Frame Style</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {(['none', 'thin', 'thick', 'glow'] as FrameStyle[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, frame_style: f }))}
                  style={{ padding: '5px 12px', borderRadius: 4, border: config.frame_style === f ? '1px solid #444' : '1px solid #1a1a1a', background: config.frame_style === f ? '#161616' : 'transparent', color: config.frame_style === f ? '#d0d0d0' : '#444', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' as const }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Sticker theme */}
          <div>
            <span style={{ ...S.label, marginBottom: 6, display: 'block', color: '#444' }}>Sticker Theme</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {(['none', 'energic', 'confetti', 'stars', 'hearts'] as StickerTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, sticker_theme: t }))}
                  style={{ padding: '5px 12px', borderRadius: 4, border: config.sticker_theme === t ? '1px solid #444' : '1px solid #1a1a1a', background: config.sticker_theme === t ? '#161616' : 'transparent', color: config.sticker_theme === t ? '#d0d0d0' : '#444', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' as const }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: '#333', marginTop: 6 }}>Animated particles overlay on the passport photo.</p>
          </div>
        </div>

        {/* Save */}
        <button type="button" onClick={handleSave} disabled={saving} style={S.saveBtn(saving)}>
          {saving
            ? <><div style={{ width: 13, height: 13, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" /> Saving…</>
            : <><CheckCircle2 size={12} /> Save Check-in Config</>}
        </button>
      </div>
    </div>
  );
}
