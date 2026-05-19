import { useState, useEffect, lazy, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download, QrCode, Upload, X } from 'lucide-react';
import type { GeofenceConfig } from './GeofenceMap';

const GeofenceMap = lazy(() => import('./GeofenceMap'));

interface CheckinConfig {
  is_active: boolean;
  checkin_mode: 'once' | 'per_day';
  geofence: GeofenceConfig;
  stamp_image_url: string | null;
}

interface Props {
  eventSlug: string;
  apiBase: string;
  token: string;
}

const DEFAULT_GEOFENCE: GeofenceConfig = {
  mode: 'radius',
  center_lat: -6.2088,
  center_lng: 106.8456,
  radius_m: 200,
  polygon: [],
};

export default function CheckinSection({ eventSlug, apiBase, token }: Props) {
  const [config, setConfig] = useState<CheckinConfig>({
    is_active: false,
    checkin_mode: 'once',
    geofence: DEFAULT_GEOFENCE,
    stamp_image_url: null,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
            geofence: {
              mode: data.geofence_type ?? 'radius',
              center_lat: data.geofence_center_lat ?? -6.2088,
              center_lng: data.geofence_center_lng ?? 106.8456,
              radius_m: data.geofence_radius_m ?? 200,
              polygon: data.geofence_polygon_json ?? [],
            },
            stamp_image_url: data.stamp_image_url ?? null,
          });
          if (data.stamp_image_url) setStampPreview(data.stamp_image_url);
          if (data.is_active) fetchQR();
        }
        setLoaded(true);
      });
  }, [eventSlug]);

  const fetchQR = async () => {
    try {
      const res = await fetch(`${apiBase}/api/events/${eventSlug}/qr`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': 'ku4jaK6v%$gd364GAga5',
          'x-date-for': new Date().toISOString(),
        },
      });
      const json = await res.json();
      console.log('[CheckinSection] QR response:', JSON.stringify(json).slice(0, 200));
      if (json.data?.qr) setQrDataUrl(json.data.qr);
      else toast.error('QR not available. Make sure check-in is enabled.');
    } catch {
      toast.error('Failed to load QR code');
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
      let stampUrl = config.stamp_image_url;

      // Upload stamp image if changed
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

      const upsertData = {
        event_slug: eventSlug,
        is_active: config.is_active,
        checkin_mode: config.checkin_mode,
        geofence_type: config.geofence.mode,
        geofence_center_lat: config.geofence.center_lat,
        geofence_center_lng: config.geofence.center_lng,
        geofence_radius_m: config.geofence.radius_m,
        geofence_polygon_json: config.geofence.polygon,
        stamp_image_url: stampUrl,
        updated_at: Math.floor(Date.now() / 1000),
      };

      const { error } = await supabase
        .from('ir_event_qr_config')
        .upsert(upsertData, { onConflict: 'event_slug' });

      if (error) throw error;
      setConfig((c) => ({ ...c, stamp_image_url: stampUrl }));
      toast.success('Check-in config saved');
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

  if (!loaded) return <div className="text-slate-500 text-sm">Loading check-in config…</div>;

  return (
    <div className="space-y-5 border border-slate-700/50 rounded-xl p-4 bg-slate-800/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <QrCode size={16} className="text-violet-400" /> Check-in
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-slate-400">{config.is_active ? 'Active' : 'Inactive'}</span>
          <div
            onClick={() => setConfig((c) => ({ ...c, is_active: !c.is_active }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${config.is_active ? 'bg-violet-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {/* Check-in mode */}
      <div className="flex gap-3">
        {(['once', 'per_day'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setConfig((c) => ({ ...c, checkin_mode: m }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              config.checkin_mode === m ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {m === 'once' ? 'Once per event' : 'Once per day'}
          </button>
        ))}
      </div>

      {/* Geofence Map */}
      <div>
        <p className="text-xs font-medium text-slate-400 mb-2">Geofence</p>
        <Suspense fallback={<div className="h-64 bg-slate-800 rounded-xl animate-pulse" />}>
          <GeofenceMap
            value={config.geofence}
            onChange={(g) => setConfig((c) => ({ ...c, geofence: g }))}
          />
        </Suspense>
      </div>

      {/* Stamp Image */}
      <div>
        <p className="text-xs font-medium text-slate-400 mb-2">Stamp Image</p>
        {stampPreview ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700/50 group">
            <img src={stampPreview} alt="stamp" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => { setStampFile(null); setStampPreview(null); setConfig((c) => ({ ...c, stamp_image_url: null })); }}
              className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-red-600/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 w-full h-12 px-3 bg-slate-800/50 border border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
            <Upload size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Upload stamp image (PNG/JPG)</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleStampChange} />
          </label>
        )}
      </div>

      {/* QR Code display */}
      {config.is_active && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">Venue QR Code</p>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
                >
                  Print
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={fetchQR}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs rounded-lg hover:bg-violet-600/30 transition-colors"
            >
              <QrCode size={13} /> Load QR Code
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Check-in Config'}
      </button>
    </div>
  );
}
