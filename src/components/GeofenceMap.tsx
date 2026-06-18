import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Circle, Marker, Polygon } from 'leaflet';

export type GeofenceMode = 'radius' | 'polygon';

export interface GeofenceConfig {
  mode: GeofenceMode;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  polygon: { lat: number; lng: number }[];
}

interface Props {
  value: GeofenceConfig;
  onChange: (v: GeofenceConfig) => void;
  polygonEnabled?: boolean;
}

export default function GeofenceMap({ value, onChange, polygonEnabled = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const polygonRef = useRef<Polygon | null>(null);
  const polygonMarkersRef = useRef<Marker[]>([]);
  const [mode, setMode] = useState<GeofenceMode>(value.mode);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import('leaflet').then((L) => {
      const map = L.map(containerRef.current!).setView(
        [value.center_lat || -6.2088, value.center_lng || 106.8456],
        14
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;

      // Click to place center / add polygon vertex
      map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const currentMode = (document.getElementById('geofence-mode-state') as HTMLInputElement)?.value as GeofenceMode ?? 'radius';
        if (currentMode === 'radius') {
          onChange({ ...value, mode: 'radius', center_lat: lat, center_lng: lng });
        } else {
          onChange({
            ...value,
            mode: 'polygon',
            polygon: [...(value.polygon || []), { lat, lng }],
          });
        }
      });

      renderOverlays(L, map, value);
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      renderOverlays(L, mapRef.current!, value);
    });
    setMode(value.mode);
  }, [value]);

  function renderOverlays(L: typeof import('leaflet'), map: LeafletMap, cfg: GeofenceConfig) {
    circleRef.current?.remove();
    markerRef.current?.remove();
    polygonRef.current?.remove();
    polygonMarkersRef.current.forEach((m) => m.remove());
    polygonMarkersRef.current = [];

    if (cfg.mode === 'radius' && cfg.center_lat && cfg.center_lng) {
      circleRef.current = L.circle([cfg.center_lat, cfg.center_lng], {
        radius: cfg.radius_m,
        color: '#8b5cf6',
        fillOpacity: 0.15,
      }).addTo(map);
      markerRef.current = L.marker([cfg.center_lat, cfg.center_lng]).addTo(map);
    } else if (cfg.mode === 'polygon' && cfg.polygon?.length) {
      const latlngs = cfg.polygon.map((p) => [p.lat, p.lng] as [number, number]);
      polygonRef.current = L.polygon(latlngs, {
        color: '#8b5cf6',
        fillOpacity: 0.15,
      }).addTo(map);
      latlngs.forEach((ll, i) => {
        const m = L.marker(ll, { draggable: true }).addTo(map);
        m.on('dragend', (e) => {
          const newLatLng = e.target.getLatLng();
          const updated = [...cfg.polygon];
          updated[i] = { lat: newLatLng.lat, lng: newLatLng.lng };
          onChange({ ...cfg, polygon: updated });
        });
        polygonMarkersRef.current.push(m);
      });
    }
  }

  return (
    <div className="space-y-3">
      {polygonEnabled && (
        <div className="flex gap-2">
          {(['radius', 'polygon'] as GeofenceMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mode: m })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {m === 'radius' ? 'Radius (circle)' : 'Polygon (custom shape)'}
            </button>
          ))}
        </div>
      )}
      {/* Hidden input to pass current mode to map click handler */}
      <input id="geofence-mode-state" type="hidden" value={mode} />
      <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden border border-slate-700/50" />
      {value.mode === 'radius' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400 shrink-0">Radius (m)</label>
          <input
            type="number"
            min={50}
            max={5000}
            value={value.radius_m}
            onChange={(e) => onChange({ ...value, radius_m: Number(e.target.value) })}
            className="w-28 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>
      )}
      {polygonEnabled && value.mode === 'polygon' && value.polygon?.length > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...value, polygon: [] })}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Clear polygon points ({value.polygon.length} points)
        </button>
      )}
      <p className="text-xs text-slate-500">
        {value.mode === 'radius'
          ? 'Click on map to set venue center.'
          : 'Click on map to add polygon vertices. Drag markers to adjust.'}
      </p>
    </div>
  );
}
