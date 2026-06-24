import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Styles ──────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px',
};
const panelTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 16,
};
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px',
  textTransform: 'uppercase', marginBottom: 10, marginTop: 28,
};
const th: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 500,
  color: '#444', letterSpacing: '0.7px', textTransform: 'uppercase',
  borderBottom: '1px solid #111',
};
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 11, color: '#888', borderBottom: '1px solid #0a0a0a' };

const CHART_COLORS = {
  male: '#4a9eff',
  female: '#ff6b9d',
  unknown: '#333',
  ios: '#a8d4ff',
  android: '#a8ffb0',
  bar: '#e8e8e8',
  line: '#4a9eff',
  green: '#4caf50',
};

const SOURCE_COLORS: Record<string, string> = {
  events:  '#4a9eff',
  search:  '#4caf50',
  share:   '#e8e8e8',
  post:    '#a78bfa',
  moment:  '#f472b6',
  lineup:  '#f0a500',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ h = 60, w = '100%' }: { h?: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w, background: '#0f0f0f', borderRadius: 4,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, badge }: { label: string; value: string | number; sub?: string; badge?: string }) {
  return (
    <div style={panel}>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: '#ececec', letterSpacing: '-1px', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>{sub}</div>}
      {badge && <div style={{ display: 'inline-block', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#0d1f0d', color: '#4caf50', marginTop: 6 }}>{badge}</div>}
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function HourHeatmap({ data }: { data: { hour: number; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i);
    return { hour: i, count: found?.count ?? 0 };
  });

  const getColor = (count: number) => {
    const pct = count / maxCount;
    if (pct === 0) return '#111';
    if (pct < 0.25) return '#1a2e1a';
    if (pct < 0.5) return '#2d4d2d';
    if (pct < 0.75) return 'rgba(76,175,80,0.5)';
    return 'rgba(76,175,80,0.9)';
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
        {hours.map(h => (
          <div
            key={h.hour}
            title={`${h.hour}:00 — ${h.count} check-ins`}
            style={{ aspectRatio: '1', borderRadius: 2, background: getColor(h.count), cursor: 'default' }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, marginTop: 3 }}>
        {hours.map(h => (
          <div key={h.hour} style={{ fontSize: 7, color: '#333', textAlign: 'center' }}>
            {h.hour % 6 === 0 ? h.hour : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#ccc' }}>
      <div style={{ color: '#555', fontSize: 10, marginBottom: 2 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i}>{p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
}

// ─── Mini toggle chart (Day / Month) ─────────────────────────────────────────

function MiniToggleChart({ title, color, dayData, monthData, loading }: {
  title: string;
  color: string;
  dayData: { date: string; count: number }[];
  monthData: { month: string; count: number }[];
  loading: boolean;
}) {
  const [mode, setMode] = useState<'day' | 'month'>('day');
  const data = mode === 'day'
    ? dayData.map(d => ({ label: d.date, count: d.count }))
    : monthData.map(d => ({ label: d.month, count: d.count }));
  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={panelTitle}>{title}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['day', 'month'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3,
              border: `1px solid ${mode === m ? '#333' : '#1a1a1a'}`,
              background: 'transparent', color: mode === m ? '#e8e8e8' : '#555', cursor: 'pointer',
            }}>{m === 'day' ? 'Day' : 'Month'}</button>
          ))}
        </div>
      </div>
      {loading ? <Skeleton h={80} /> : (
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={data} barCategoryGap="30%">
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#444' }} axisLine={false} tickLine={false}
              tickFormatter={d => mode === 'day' ? d?.slice(5) : d?.slice(2)} />
            <YAxis hide />
            <Tooltip content={<DarkTooltip />} />
            <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} opacity={0.7} />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── City Bubble Map (Leaflet) ───────────────────────────────────────────────

type CheckinUser = { id: number; name: string; username: string; avatar: string | null };
type CityPoint = { city_name: string; lat: number; lng: number; count: number; users?: CheckinUser[] };
type VenueLocation = { lat: number; lng: number; city_name: string; venue_name: string } | null;

function CityArcMap({
  checkinCities, venueLocation, maxCheckin,
}: {
  checkinCities: CityPoint[];
  venueLocation: VenueLocation;
  maxCheckin: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; city: CityPoint } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(containerRef.current!, {
        center: [-2.5, 118],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      // Auto-fit bounds: venue ↔ target city
      // Target = highest count; if tie, pick closest to venue
      if (venueLocation && checkinCities.length > 0) {
        const maxCount = checkinCities[0].count;
        const tied = checkinCities.filter(c => c.count === maxCount);
        const haversine = (a: CityPoint, b: { lat: number; lng: number }) => {
          const R = 6371;
          const dLat = (b.lat - a.lat) * Math.PI / 180;
          const dLng = (b.lng - a.lng) * Math.PI / 180;
          const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
        };
        const targetCity = tied.length === 1
          ? tied[0]
          : tied.reduce((closest, c) =>
              haversine(c, venueLocation) < haversine(closest, venueLocation) ? c : closest
          );
        const bounds = L.latLngBounds(
          [venueLocation.lat, venueLocation.lng],
          [targetCity.lat, targetCity.lng],
        );
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
      }

      // Zoom buttons overlay
      const zoomWrap = document.createElement('div');
      zoomWrap.style.cssText = 'position:absolute;bottom:12px;right:12px;z-index:500;display:flex;flex-direction:column;gap:4px';
      const mkBtn = (label: string, onClick: () => void) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'width:28px;height:28px;background:#111;border:1px solid #222;color:#aaa;font-size:16px;line-height:1;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center';
        b.addEventListener('click', onClick);
        b.addEventListener('mouseenter', () => { b.style.background = '#1a1a1a'; b.style.color = '#fff'; });
        b.addEventListener('mouseleave', () => { b.style.background = '#111'; b.style.color = '#aaa'; });
        return b;
      };
      zoomWrap.appendChild(mkBtn('+', () => map.zoomIn()));
      zoomWrap.appendChild(mkBtn('−', () => map.zoomOut()));
      map.getContainer().appendChild(zoomWrap);

      if (!venueLocation) {
        const bubblePts: [number, number][] = [];
        checkinCities.forEach((c) => {
          const radius = 5000 + (c.count / (maxCheckin || 1)) * 35000;
          L.circle([c.lat, c.lng], {
            radius, color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.4, weight: 1, opacity: 0.7,
          }).addTo(map)
            .bindTooltip(`<b>${c.city_name}</b><br/>${c.count} check-in${c.count !== 1 ? 's' : ''}`, { direction: 'top' });
          bubblePts.push([c.lat, c.lng]);
        });
        if (bubblePts.length > 0) {
          map.fitBounds(L.latLngBounds(bubblePts), { padding: [40, 40], maxZoom: 10 });
        }
        mapRef.current = map;
        return;
      }

      const venuePt = L.latLng(venueLocation.lat, venueLocation.lng);

      // Inject keyframe animation into document once
      const styleId = 'arc-map-anim';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes arcDash { to { stroke-dashoffset: 0; } }
          @keyframes arcPulse { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.5);opacity:1} }
          @keyframes arcRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
        `;
        document.head.appendChild(style);
      }

      const mapContainer = map.getContainer();
      mapContainer.style.position = 'relative';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:400;overflow:visible';
      mapContainer.appendChild(svg);
      svgRef.current = svg;

      // Defs for gradient
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);

      const getControlPt = (ox: number, oy: number, dx: number, dy: number) => {
        const mx = (ox + dx) / 2;
        const my = (oy + dy) / 2;
        const vx = dx - ox; const vy = dy - oy;
        const dist = Math.sqrt(vx * vx + vy * vy) || 1;
        const lift = Math.max(40, dist * 0.4);
        const px = -vy / dist; const py = vx / dist;
        const sign = py > 0 ? -1 : 1;
        return { cx: mx + px * lift * sign, cy: my + py * lift * sign, dist };
      };

      const drawArcs = () => {
        // Remove all children except defs
        while (svg.lastChild && svg.lastChild !== defs) svg.removeChild(svg.lastChild);

        const destPx = map.latLngToContainerPoint(venuePt);

        checkinCities.forEach((city, i) => {
          const origPx = map.latLngToContainerPoint(L.latLng(city.lat, city.lng));
          const ratio = city.count / (maxCheckin || 1);
          const { cx, cy, dist } = getControlPt(origPx.x, origPx.y, destPx.x, destPx.y);

          // Origin is same city as venue — render expanding ring around venue dot
          if (dist < 20) {
            const sameRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            sameRing.setAttribute('cx', String(origPx.x));
            sameRing.setAttribute('cy', String(origPx.y));
            sameRing.setAttribute('r', '6');
            sameRing.setAttribute('fill', 'none');
            sameRing.setAttribute('stroke', '#60a5fa');
            sameRing.setAttribute('stroke-width', '1.5');
            sameRing.style.pointerEvents = 'all';
            sameRing.style.cursor = 'pointer';
            const srAnimR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            srAnimR.setAttribute('attributeName', 'r'); srAnimR.setAttribute('from', '6'); srAnimR.setAttribute('to', '22');
            srAnimR.setAttribute('dur', '1.8s'); srAnimR.setAttribute('repeatCount', 'indefinite');
            const srAnimO = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            srAnimO.setAttribute('attributeName', 'stroke-opacity'); srAnimO.setAttribute('from', '0.7'); srAnimO.setAttribute('to', '0');
            srAnimO.setAttribute('dur', '1.8s'); srAnimO.setAttribute('repeatCount', 'indefinite');
            sameRing.appendChild(srAnimR); sameRing.appendChild(srAnimO);
            sameRing.addEventListener('mouseenter', (e) => {
              const rect = wrapRef.current!.getBoundingClientRect();
              setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, city });
            });
            sameRing.addEventListener('mouseleave', () => setTooltip(null));
            svg.appendChild(sameRing);
            return;
          }

          const pathD = `M${origPx.x},${origPx.y} Q${cx},${cy} ${destPx.x},${destPx.y}`;

          // Gradient id per arc
          const gradId = `arcGrad${i}`;
          const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          grad.setAttribute('id', gradId);
          grad.setAttribute('gradientUnits', 'userSpaceOnUse');
          grad.setAttribute('x1', String(origPx.x)); grad.setAttribute('y1', String(origPx.y));
          grad.setAttribute('x2', String(destPx.x)); grad.setAttribute('y2', String(destPx.y));
          const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#60a5fa'); s1.setAttribute('stop-opacity', '0.3');
          const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#60a5fa'); s2.setAttribute('stop-opacity', '0.85');
          grad.appendChild(s1); grad.appendChild(s2);
          defs.appendChild(grad);

          // Invisible fat hit area (pointer-events enabled)
          const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          hit.setAttribute('d', pathD);
          hit.setAttribute('fill', 'none');
          hit.setAttribute('stroke', 'transparent');
          hit.setAttribute('stroke-width', '18');
          hit.style.pointerEvents = 'stroke';
          hit.style.cursor = 'pointer';
          hit.addEventListener('mouseenter', (e) => {
            const rect = wrapRef.current!.getBoundingClientRect();
            setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, city });
          });
          hit.addEventListener('mouseleave', () => setTooltip(null));
          svg.appendChild(hit);

          // Visible thin arc with dash animation — all same speed
          const dashLen = Math.max(300, Math.round(dist * 3));
          const animDur = '2.0';
          const delayMs = i * 80;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', `url(#${gradId})`);
          path.setAttribute('stroke-width', String(0.8 + ratio * 1.2));
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-dasharray', String(dashLen));
          path.setAttribute('stroke-dashoffset', String(dashLen));
          path.style.animation = `arcDash ${animDur}s ease-out ${delayMs}ms forwards`;
          svg.appendChild(path);

          // Flowing dot along the arc (animateMotion)
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('r', '2.5');
          dot.setAttribute('fill', '#60a5fa');
          dot.setAttribute('fill-opacity', '0.9');
          const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
          motion.setAttribute('dur', `${animDur}s`);
          motion.setAttribute('repeatCount', 'indefinite');
          motion.setAttribute('begin', `${delayMs}ms`);
          const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
          // animateMotion needs inline path
          motion.setAttribute('path', pathD);
          dot.appendChild(motion);
          svg.appendChild(dot);

          // Origin dot (small)
          const orig = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          orig.setAttribute('cx', String(origPx.x));
          orig.setAttribute('cy', String(origPx.y));
          orig.setAttribute('r', String(2 + ratio * 2));
          orig.setAttribute('fill', '#60a5fa');
          orig.setAttribute('fill-opacity', '0.7');
          svg.appendChild(orig);
        });

        // Venue pulsing dot
        const vx = destPx.x; const vy = destPx.y;

        // Expanding ring (SMIL animate)
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', String(vx)); ring.setAttribute('cy', String(vy));
        ring.setAttribute('r', '5'); ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#fff'); ring.setAttribute('stroke-width', '1');
        ring.setAttribute('stroke-opacity', '0.6');
        const animR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animR.setAttribute('attributeName', 'r'); animR.setAttribute('from', '5'); animR.setAttribute('to', '18');
        animR.setAttribute('dur', '2s'); animR.setAttribute('repeatCount', 'indefinite');
        const animO = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animO.setAttribute('attributeName', 'stroke-opacity'); animO.setAttribute('from', '0.6'); animO.setAttribute('to', '0');
        animO.setAttribute('dur', '2s'); animO.setAttribute('repeatCount', 'indefinite');
        ring.appendChild(animR); ring.appendChild(animO);
        svg.appendChild(ring);

        // Solid venue dot
        const vCenter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        vCenter.setAttribute('cx', String(vx)); vCenter.setAttribute('cy', String(vy));
        vCenter.setAttribute('r', '4'); vCenter.setAttribute('fill', '#fff');
        vCenter.setAttribute('fill-opacity', '0.95');
        svg.appendChild(vCenter);
      };

      drawArcs();
      map.on('moveend zoomend move zoom', drawArcs);
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      svgRef.current = null;
    };
  }, [checkinCities, venueLocation, maxCheckin]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height: 340, borderRadius: 8, overflow: 'hidden' }} />

      {/* Hover tooltip with user list */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 8,
          background: '#111',
          border: '1px solid #222',
          borderRadius: 8,
          padding: '10px 12px',
          zIndex: 9999,
          minWidth: 180,
          maxWidth: 240,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8', marginBottom: 4 }}>
            {tooltip.city.city_name}
          </div>
          <div style={{ fontSize: 10, color: '#60a5fa', marginBottom: 8 }}>
            {tooltip.city.count} check-in{tooltip.city.count !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto' }}>
            {(tooltip.city.users ?? []).map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: '#222', overflow: 'hidden', border: '1px solid #333',
                }}>
                  {u.avatar ? (
                    <img
                      src={u.avatar.startsWith('http') ? u.avatar : `${supabaseUrl}/storage/v1/object/public/profile-images/${u.avatar}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : null}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#e8e8e8', fontWeight: 500, lineHeight: 1.2 }}>{u.name || u.username}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>@{u.username}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 10, color: '#555' }}>
        {venueLocation ? (
          <>
            <span><span style={{ color: '#60a5fa' }}>●</span> {venueLocation.venue_name}</span>
            <span>Hover arc → see attendees</span>
          </>
        ) : (
          <span><span style={{ color: '#60a5fa' }}>●</span> Check-in cities · select an event for arc view</span>
        )}
      </div>
    </div>
  );
}

// ─── Follower Bubble Map ─────────────────────────────────────────────────────

function FollowerBubbleMap({ cities, maxCount }: { cities: { city_name: string; lat: number; lng: number; count: number }[]; maxCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(containerRef.current!, {
        center: [-2.5, 118], zoom: 5,
        zoomControl: false, attributionControl: false, scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      // inject tooltip style once
      const styleId = 'follower-map-style';
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `.fmap-label{background:transparent!important;border:none!important;box-shadow:none!important;font-size:9px;color:#e2e8f0;font-weight:600;white-space:nowrap;text-shadow:0 1px 3px #000}`;
        document.head.appendChild(s);
      }

      const pts: [number, number][] = [];
      cities.forEach(c => {
        const ratio = c.count / (maxCount || 1);
        // color: low = dim purple, high = bright indigo
        const r = Math.round(99  + (1 - ratio) * 60);
        const g = Math.round(102 + (1 - ratio) * 30);
        const b2 = Math.round(241);
        const fillColor = `rgb(${r},${g},${b2})`;
        const fillOpacity = 0.25 + ratio * 0.65;
        const radius = 8 + ratio * 14; // px, fixed screen size

        const marker = L.circleMarker([c.lat, c.lng], {
          radius,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.6,
          fillColor,
          fillOpacity,
        }).addTo(map);

        marker.bindTooltip(
          `<b style="color:#c7d2fe">${c.city_name}</b><br/><span style="color:#94a3b8">${c.count.toLocaleString()} followers</span>`,
          { direction: 'top', className: 'leaflet-dark-tooltip' }
        );

        // count label as divIcon
        L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: 'fmap-label',
            html: `<span>${c.count >= 1000 ? `${(c.count/1000).toFixed(1)}k` : c.count}</span>`,
            iconAnchor: [20, -radius - 2],
          }),
          interactive: false,
        }).addTo(map);

        pts.push([c.lat, c.lng]);
      });

      if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 9 });

      const zoomWrap = document.createElement('div');
      zoomWrap.style.cssText = 'position:absolute;bottom:12px;right:12px;z-index:500;display:flex;flex-direction:column;gap:4px';
      const mkBtn = (label: string, fn: () => void) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'width:28px;height:28px;background:#111;border:1px solid #222;color:#aaa;font-size:16px;line-height:1;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center';
        b.addEventListener('click', fn);
        return b;
      };
      zoomWrap.appendChild(mkBtn('+', () => map.zoomIn()));
      zoomWrap.appendChild(mkBtn('−', () => map.zoomOut()));
      map.getContainer().appendChild(zoomWrap);
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [cities, maxCount]);

  return <div ref={containerRef} style={{ height: 340, borderRadius: 4, overflow: 'hidden' }} />;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function EOAnalytics() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const [selectedSlug, setSelectedSlug] = useState<string | null | undefined>(undefined); // undefined = not yet defaulted
  const [exporting, setExporting] = useState(false);
  const [mapMode, setMapMode] = useState<'checkins' | 'followers'>('checkins');

  const exportPDF = () => {
    if (!analytics) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = 18;
      const CW = pageW - M * 2;

      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const eventLabel = effectiveSlug
        ? (events?.find(e => e.slug === effectiveSlug)?.title ?? effectiveSlug)
        : 'All Events';

      // Editorial dark palette — clean, professional, not AI-gradient
      const WHITE: [number,number,number]   = [255, 255, 255];
      const OFFWHITE: [number,number,number]= [230, 230, 230];
      const SLATE: [number,number,number]   = [30,  30,  30];
      const BORDER: [number,number,number]  = [50,  50,  50];
      const BODY: [number,number,number]    = [200, 200, 200];
      const MUTED: [number,number,number]   = [110, 110, 110];
      const BG: [number,number,number]      = [15,  15,  15];
      const BG2: [number,number,number]     = [22,  22,  22];
      const INDIGO: [number,number,number]  = [255, 255, 255]; // use white as accent on dark bg
      const INDIGO_L: [number,number,number]= [30,  30,  30];
      const GREEN: [number,number,number]   = [100, 200, 120];
      const GREEN_L: [number,number,number] = [20,  40,  25];
      const ORANGE: [number,number,number]  = [230, 160, 60];
      const ORANGE_L: [number,number,number]= [40,  30,  10];
      const BLUE: [number,number,number]    = [100, 160, 230];
      const BLUE_L: [number,number,number]  = [20,  30,  50];
      const PINK: [number,number,number]    = [220, 100, 140];
      const ACCENT: [number,number,number]  = [255, 255, 255];

      let y = 0;
      const fillBg = () => { doc.setFillColor(...BG); doc.rect(0, 0, pageW, pageH, 'F'); };
      const newPage = () => { doc.addPage(); fillBg(); y = M; };
      const checkPage = (need: number) => { if (y + need > pageH - 14) newPage(); };

      // ── Drawing primitives ──

      const rule = (color: [number,number,number] = BORDER, lw = 0.2) => {
        doc.setDrawColor(...color); doc.setLineWidth(lw);
        doc.line(M, y, M + CW, y); y += 4;
      };

      const label = (text: string, color: [number,number,number] = MUTED, size = 6.5, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size); doc.setTextColor(...color);
        doc.text(text, M, y); y += size * 0.45 + 2;
      };

      const desc = (text: string) => {
        checkPage(8);
        doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
        const lines = doc.splitTextToSize(text, CW);
        doc.text(lines, M, y); y += lines.length * 3.5 + 3;
      };

      // Section heading — minimal: caps text + hairline below
      const heading = (text: string) => {
        checkPage(14);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.setTextColor(...WHITE);
        doc.text(text.toUpperCase(), M, y); y += 3;
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
        doc.line(M, y, M + CW, y); y += 5;
      };

      // KPI row — 4 minimal cards, number big, label small below
      const kpiRow = (items: { label: string; value: string; color: [number,number,number]; sub?: string }[]) => {
        checkPage(28);
        const cols = items.length;
        const gap = 4;
        const cardW = (CW - gap * (cols - 1)) / cols;
        items.forEach((item, i) => {
          const x = M + i * (cardW + gap);
          doc.setFillColor(...BG2); doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
          doc.roundedRect(x, y, cardW, 24, 1.5, 1.5, 'FD');
          // colored left bar
          doc.setFillColor(...item.color);
          doc.rect(x, y, 2, 24, 'F');
          // value
          doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...item.color);
          doc.text(item.value, x + cardW / 2, y + 12, { align: 'center' });
          // label
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
          doc.text(item.label, x + cardW / 2, y + 18, { align: 'center' });
          if (item.sub) { doc.setFontSize(5); doc.text(item.sub, x + cardW / 2, y + 22, { align: 'center' }); }
        });
        y += 29;
      };

      // Horizontal bar — slim, always shows count at right
      const hBar = (data: { label: string; value: number }[], color: [number,number,number]) => {
        const max = Math.max(...data.map(d => d.value), 1);
        const LW = 28; const VALW = 16;
        const barW = CW - LW - VALW - 3;
        data.forEach(d => {
          checkPage(7);
          const bw = (d.value / max) * barW;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
          doc.text(d.label, M, y + 3, { maxWidth: LW - 1 });
          doc.setFillColor(...SLATE); doc.rect(M + LW, y + 0.5, barW, 4, 'F');
          if (bw > 0) { doc.setFillColor(...color); doc.rect(M + LW, y + 0.5, bw, 4, 'F'); }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...BODY);
          doc.text(d.value.toLocaleString(), M + LW + barW + 2, y + 3);
          y += 7;
        });
        y += 2;
      };

      // Combo chart: bars + line overlay, count always shown above each bar
      const barLineChart = (data: { label: string; value: number }[], barColor: [number,number,number], h = 32, title?: string) => {
        if (title) { checkPage(h + 22); label(title, MUTED, 6.5); } else checkPage(h + 18);
        const max = Math.max(...data.map(d => d.value), 1);
        const n = data.length;
        if (n === 0) { y += 4; return; }
        const gap = CW / n;
        const barW = Math.max(1.5, gap * 0.6);
        const baseY = y + h;
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
        doc.line(M, baseY, M + CW, baseY);

        const pts: [number, number][] = [];
        data.forEach((d, i) => {
          const bh = (d.value / max) * h;
          const bx = M + i * gap + (gap - barW) / 2;
          const cx = bx + barW / 2;
          doc.setFillColor(...SLATE); doc.rect(bx, y, barW, h, 'F');
          if (bh > 0) { doc.setFillColor(...barColor); doc.rect(bx, baseY - bh, barW, bh, 'F'); }
          pts.push([cx, baseY - bh]);
          // count above bar
          if (d.value > 0) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(4.5); doc.setTextColor(...BODY);
            doc.text(d.value.toLocaleString(), cx, baseY - bh - 1.5, { align: 'center' });
          }
          // x-axis label every nth
          const labelEvery = Math.ceil(n / 14);
          if (i % labelEvery === 0 || i === n - 1) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(...MUTED);
            doc.text(d.label?.slice(-5) ?? '', cx, baseY + 3.5, { align: 'center' });
          }
        });
        // smooth line overlay via catmull-rom → cubic bezier
        if (pts.length > 1) {
          doc.setDrawColor(...WHITE); doc.setLineWidth(0.5);
          const tension = 0.4;
          const segments: number[][] = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];
            const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 2;
            const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 2;
            const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 2;
            const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 2;
            segments.push([cp1x - p1[0], cp1y - p1[1], cp2x - p1[0], cp2y - p1[1], p2[0] - p1[0], p2[1] - p1[1]]);
          }
          (doc as any).lines(segments, pts[0][0], pts[0][1], [1, 1], 'S');
          pts.forEach(p => { doc.setFillColor(...WHITE); doc.circle(p[0], p[1], 0.6, 'F'); });
        }
        y += h + 9;
      };

      // Twin combo charts side by side
      const twinBar = (
        leftData: { label: string; value: number }[], leftColor: [number,number,number], leftTitle: string,
        rightData: { label: string; value: number }[], rightColor: [number,number,number], rightTitle: string,
        h = 30,
      ) => {
        checkPage(h + 22);
        const half = (CW - 6) / 2;
        const drawSide = (data: { label: string; value: number }[], color: [number,number,number], title: string, ox: number) => {
          const max = Math.max(...data.map(d => d.value), 1);
          const n = data.length;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
          doc.text(title, ox, y - 2);
          const baseY = y + h;
          doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
          doc.line(ox, baseY, ox + half, baseY);
          if (n === 0) return;
          const gap = half / n;
          const barW = Math.max(1, gap * 0.6);
          const pts: [number, number][] = [];
          data.forEach((d, i) => {
            const bh = (d.value / max) * h;
            const bx = ox + i * gap + (gap - barW) / 2;
            const cx = bx + barW / 2;
            doc.setFillColor(...SLATE); doc.rect(bx, y, barW, h, 'F');
            if (bh > 0) { doc.setFillColor(...color); doc.rect(bx, baseY - bh, barW, bh, 'F'); }
            pts.push([cx, baseY - bh]);
            if (d.value > 0) {
              doc.setFont('helvetica', 'bold'); doc.setFontSize(4); doc.setTextColor(...BODY);
              doc.text(d.value.toLocaleString(), cx, baseY - bh - 1.5, { align: 'center' });
            }
            const labelEvery = Math.ceil(n / 8);
            if (i % labelEvery === 0 || i === n - 1) {
              doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(...MUTED);
              doc.text(d.label?.slice(-5) ?? '', cx, baseY + 3.5, { align: 'center' });
            }
          });
          if (pts.length > 1) {
            doc.setDrawColor(...WHITE); doc.setLineWidth(0.4);
            const tension = 0.4;
            const segs: number[][] = [];
            for (let i = 0; i < pts.length - 1; i++) {
              const p0 = pts[Math.max(i - 1, 0)];
              const p1 = pts[i];
              const p2 = pts[i + 1];
              const p3 = pts[Math.min(i + 2, pts.length - 1)];
              const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 2;
              const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 2;
              const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 2;
              const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 2;
              segs.push([cp1x - p1[0], cp1y - p1[1], cp2x - p1[0], cp2y - p1[1], p2[0] - p1[0], p2[1] - p1[1]]);
            }
            (doc as any).lines(segs, pts[0][0], pts[0][1], [1, 1], 'S');
            pts.forEach(p => { doc.setFillColor(...WHITE); doc.circle(p[0], p[1], 0.5, 'F'); });
          }
        };
        drawSide(leftData, leftColor, leftTitle, M);
        drawSide(rightData, rightColor, rightTitle, M + half + 6);
        y += h + 14;
      };

      const lineChart = barLineChart;

      // Pie donut
      const pieDonut = (slices: { label: string; value: number; color: [number,number,number] }[], ox: number, oy: number, r = 15) => {
        const total = slices.reduce((s, d) => s + d.value, 0) || 1;
        let angle = -Math.PI / 2;
        slices.forEach(sl => {
          const sweep = (sl.value / total) * 2 * Math.PI;
          if (sweep < 0.01) { angle += sweep; return; }
          const steps = Math.max(4, Math.round(sweep * 16));
          const xs: number[] = [ox]; const ys2: number[] = [oy];
          for (let s = 0; s <= steps; s++) {
            const a = angle + (sweep * s) / steps;
            xs.push(ox + r * Math.cos(a)); ys2.push(oy + r * Math.sin(a));
          }
          doc.setFillColor(...sl.color); (doc as any).polygon?.(xs, ys2, 'F');
          angle += sweep;
        });
        doc.setFillColor(...BG);
        const hxs: number[] = []; const hys: number[] = [];
        for (let s = 0; s < 32; s++) {
          const a = (2 * Math.PI * s) / 32;
          hxs.push(ox + r * 0.5 * Math.cos(a)); hys.push(oy + r * 0.5 * Math.sin(a));
        }
        (doc as any).polygon?.(hxs, hys, 'F');
      };

      // Two pies side by side
      const twoPies = (
        ls: { label: string; value: number; color: [number,number,number] }[], lt: string,
        rs: { label: string; value: number; color: [number,number,number] }[], rt: string,
      ) => {
        checkPage(46);
        const r = 15; const half = CW / 2;
        const render = (slices: { label: string; value: number; color: [number,number,number] }[], title: string, ox: number) => {
          const total = slices.reduce((s, d) => s + d.value, 0) || 1;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
          doc.text(title, ox, y);
          pieDonut(slices, ox + r + 1, y + r + 4, r);
          const lx = ox + r * 2 + 8;
          slices.forEach((sl, i) => {
            const pct = Math.round((sl.value / total) * 100);
            const ly = y + 6 + i * 10;
            doc.setFillColor(...sl.color); doc.rect(lx, ly, 3.5, 3.5, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...BODY);
            doc.text(`${pct}%`, lx + 6, ly + 3);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
            doc.text(`${sl.label} · ${sl.value.toLocaleString()}`, lx + 16, ly + 3);
          });
        };
        render(ls, lt, M); render(rs, rt, M + half);
        y += r * 2 + 10;
      };

      // Page header — ultra-minimal: thin top rule + meta
      const pageHeader = (topic: string) => {
        doc.setFillColor(...BG); doc.rect(0, 0, pageW, 10, 'F');
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
        doc.line(0, 10, pageW, 10);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
        doc.text('DEURSOCIAL', M, 7);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
        doc.text(topic.toUpperCase(), M + 28, 7);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
        doc.text(eventLabel, pageW - M, 7, { align: 'right' });
      };

      // ══════════════════════════════════════════════════════════
      // COVER — editorial dark, no gradient gimmicks
      // ══════════════════════════════════════════════════════════
      fillBg();

      // top rule
      doc.setFillColor(...BORDER); doc.rect(0, 0, pageW, 0.5, 'F');

      // wordmark top-left
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE);
      doc.text('DEURSOCIAL', M, 22);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
      doc.text('Event Intelligence Platform', M, 29);

      // horizontal divider
      doc.setFillColor(...BORDER); doc.rect(M, 34, CW, 0.3, 'F');

      // large title
      doc.setFont('helvetica', 'bold'); doc.setFontSize(32); doc.setTextColor(...WHITE);
      doc.text('Analytics', M, 60);
      doc.text('Report', M, 76);

      // event label below title
      doc.setFillColor(...WHITE); doc.rect(M, 82, 18, 0.5, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...BODY);
      const titleLines = doc.splitTextToSize(eventLabel, CW);
      doc.text(titleLines, M, 92);

      doc.setFontSize(6.5); doc.setTextColor(...MUTED);
      doc.text(`Generated ${now}`, M, 105);
      doc.text('Confidential & Proprietary', M, 110);

      // KPI row on cover
      y = 128;
      const coverKPIs = [
        { label: 'Followers', value: (analytics.followers ?? 0).toLocaleString(), color: WHITE },
        { label: 'Check-ins', value: (analytics.checkins ?? 0).toLocaleString(), color: GREEN },
        { label: 'Conversion', value: `${analytics.conversion_rate ?? 0}%`, color: ORANGE },
        { label: 'Total Views', value: (analytics.total_impressions ?? 0).toLocaleString(), color: BLUE },
      ];
      const kpiGap = 4; const kpiW = (CW - kpiGap * 3) / 4;
      coverKPIs.forEach((k, i) => {
        const kx = M + i * (kpiW + kpiGap);
        doc.setFillColor(...BG2); doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
        doc.roundedRect(kx, y, kpiW, 28, 1, 1, 'FD');
        doc.setFillColor(...k.color); doc.rect(kx, y, kpiW, 1.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...k.color);
        doc.text(k.value, kx + kpiW / 2, y + 14, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
        doc.text(k.label, kx + kpiW / 2, y + 22, { align: 'center' });
      });
      y += 34;

      // index / table of contents
      doc.setFillColor(...BORDER); doc.rect(M, y, CW, 0.3, 'F'); y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...MUTED);
      doc.text('CONTENTS', M, y); y += 5;
      const topics = ['Activity', 'Audience', 'Acquisition', 'Geography'];
      topics.forEach((t, i) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...BODY);
        doc.text(`0${i+2}`, M, y);
        doc.setTextColor(...WHITE);
        doc.text(t, M + 10, y);
        y += 7;
      });

      // ══════════════════════════════════════════════════════════
      // PAGE 02 — Activity
      // ══════════════════════════════════════════════════════════
      newPage(); pageHeader('Activity'); y = 16;

      // Views last 7 days — top section
      const last7Views = (analytics.impressions_per_day ?? []).slice(-7) as { date: string; count: number }[];
      const last7Sum = last7Views.reduce((s: number, d: any) => s + d.count, 0);
      const prev7Views = (analytics.impressions_per_day ?? []).slice(-14, -7) as { date: string; count: number }[];
      const prev7Sum = prev7Views.reduce((s: number, d: any) => s + d.count, 0);
      const viewsDelta = prev7Sum > 0 ? Math.round(((last7Sum - prev7Sum) / prev7Sum) * 100) : 0;

      heading('Event Views — Last 7 Days');
      desc(`${last7Sum.toLocaleString()} total views in the past 7 days${viewsDelta !== 0 ? ` (${viewsDelta > 0 ? '+' : ''}${viewsDelta}% vs prior 7 days)` : ''}.`);
      lineChart(
        last7Views.map((d: any) => ({ label: d.date?.slice(5) ?? '', value: d.count })),
        BLUE, 30,
      );

      rule();

      heading('Follower Growth');
      desc('Cumulative follower count. A steepening slope signals viral momentum or successful campaigns.');
      lineChart(
        (analytics.follower_growth ?? []).map((d: any) => ({ label: d.date, value: d.cumulative_count })),
        INDIGO, 32,
      );

      rule();

      heading('Monthly Trends');
      desc('Followers and views grouped by month — useful for identifying seasonal patterns.');
      const followersMonthlyRaw = (analytics.followers_per_month ?? []);
      const viewsMonthlyRaw = (analytics.impressions_per_month ?? []);
      const followersMonthlyData = followersMonthlyRaw.length >= 2
        ? followersMonthlyRaw.map((d: any) => ({ label: d.month, value: d.count }))
        : (analytics.followers_per_day ?? []).map((d: any) => ({ label: d.date?.slice(5) ?? '', value: d.count }));
      const viewsMonthlyData = viewsMonthlyRaw.length >= 2
        ? viewsMonthlyRaw.map((d: any) => ({ label: d.month, value: d.count }))
        : (analytics.impressions_per_day ?? []).map((d: any) => ({ label: d.date?.slice(5) ?? '', value: d.count }));
      twinBar(
        followersMonthlyData, BLUE, followersMonthlyRaw.length >= 2 ? 'Followers / month' : 'Followers / day',
        viewsMonthlyData, GREEN, viewsMonthlyRaw.length >= 2 ? 'Views / month' : 'Views / day',
        28,
      );

      rule();

      heading('Check-in Activity');
      desc('Physical attendance at venue per day and month. Spikes mark live event days.');
      const checkinsDay = (analytics.checkins_per_day ?? []).map((d: any) => ({ label: d.date?.slice(5) ?? '', value: d.count }));
      const checkinsMonth = (analytics.checkins_per_month ?? []);
      const checkinsMonthData = checkinsMonth.length >= 2
        ? checkinsMonth.map((d: any) => ({ label: d.month, value: d.count }))
        : checkinsDay;
      twinBar(
        checkinsDay, GREEN, 'Check-ins / day',
        checkinsMonthData, ORANGE, checkinsMonth.length >= 2 ? 'Check-ins / month' : 'Check-ins (daily)',
        28,
      );

      // ══════════════════════════════════════════════════════════
      // PAGE 03 — Audience
      // ══════════════════════════════════════════════════════════
      newPage(); pageHeader('Audience'); y = 16;

      heading('Key Metrics');
      kpiRow([
        { label: 'Total Followers', value: (analytics.followers ?? 0).toLocaleString(), color: INDIGO },
        { label: 'Unique Check-ins', value: (analytics.checkins ?? 0).toLocaleString(), color: GREEN },
        { label: 'Conversion Rate', value: `${analytics.conversion_rate ?? 0}%`, color: ORANGE, sub: 'avg ~20%' },
        { label: 'Total Views', value: (analytics.total_impressions ?? 0).toLocaleString(), color: BLUE },
      ]);

      rule();

      const gender = analytics.demographics?.gender ?? {};
      const age = analytics.demographics?.age_brackets ?? {};
      const ios = analytics.platform_split?.ios ?? 0;
      const android = analytics.platform_split?.android ?? 0;

      heading('Demographics');
      desc('Gender and platform split of your follower base — critical for sponsor audience alignment.');
      twoPies(
        [
          { label: 'Male', value: gender.male ?? 0, color: INDIGO },
          { label: 'Female', value: gender.female ?? 0, color: PINK },
          { label: 'Unknown', value: gender.unknown ?? 0, color: MUTED },
        ], 'Gender',
        [
          { label: 'iOS', value: ios, color: BLUE },
          { label: 'Android', value: android, color: GREEN },
        ], 'Platform',
      );

      rule();

      heading('Age Distribution');
      desc('Age brackets of your audience. Dominant bracket defines sponsor demographic fit.');
      hBar([
        { label: 'Under 18', value: age.under_18 ?? 0 },
        { label: '18–24', value: age['18_24'] ?? 0 },
        { label: '25–34', value: age['25_34'] ?? 0 },
        { label: '35+', value: age['35_plus'] ?? 0 },
      ], INDIGO);

      // ══════════════════════════════════════════════════════════
      // PAGE 04 — Acquisition
      // ══════════════════════════════════════════════════════════
      newPage(); pageHeader('Acquisition'); y = 16;

      heading('Traffic Sources');
      desc('How users discovered your event — informs which channels to double down on for future events.');
      hBar(
        [
          { label: 'Events',  value: (analytics.traffic_sources?.events  ?? 0) + (analytics.traffic_sources?.homepage ?? 0) },
          { label: 'Search',  value:  analytics.traffic_sources?.search  ?? 0 },
          { label: 'Share',   value:  analytics.traffic_sources?.share   ?? 0 },
          { label: 'Post',    value:  analytics.traffic_sources?.post    ?? 0 },
          { label: 'Moment',  value:  analytics.traffic_sources?.moment  ?? 0 },
          { label: 'Lineup',  value: (analytics.traffic_sources?.lineup  ?? 0) + (analytics.traffic_sources?.trending ?? 0) },
        ],
        BLUE,
      );

      rule();

      heading('Daily Follower Acquisition');
      desc('New followers per day. Correlate spikes with content posts, trending slots, or paid promotions.');
      lineChart(
        (analytics.followers_per_day ?? []).map((d: any) => ({ label: d.date, value: d.count })),
        INDIGO, 34,
      );

      // ══════════════════════════════════════════════════════════
      // PAGE 05 — Geography
      // ══════════════════════════════════════════════════════════
      const topCitiesChart: any[] = analytics.demographics?.top_cities ?? [];
      const checkinCitiesChart: any[] = analytics.demographics?.checkin_cities ?? [];
      const groups: any[] = analytics.groups ?? [];

      if (topCitiesChart.length > 0 || checkinCitiesChart.length > 0 || groups.length > 0) {
        newPage(); pageHeader('Geography'); y = 16;

        heading('Geographic Reach');
        desc('Cities ranked by follower count (left) and check-in attendance (right). Shows your event\'s real-world draw for sponsors.');

        if (topCitiesChart.length > 0 && checkinCitiesChart.length > 0) {
          const half = (CW - 6) / 2;
          const maxF = topCitiesChart[0]?.count || 1;
          const maxC = checkinCitiesChart[0]?.count || 1;
          const rows = Math.max(topCitiesChart.length, checkinCitiesChart.length);

          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...MUTED);
          doc.text('Follower Cities', M, y); doc.text('Check-in Cities', M + half + 6, y); y += 5;

          for (let i = 0; i < Math.min(rows, 8); i++) {
            checkPage(8);
            const fc = topCitiesChart[i]; const cc = checkinCitiesChart[i];
            const LW2 = 28; const bMax = half - LW2 - 14;
            if (fc) {
              const bw = (fc.count / maxF) * bMax;
              doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BODY);
              doc.text(`${i+1}. ${fc.city_name}`, M, y + 2.5, { maxWidth: LW2 - 1 });
              doc.setFillColor(...SLATE); doc.rect(M + LW2, y + 0.5, bMax, 4, 'F');
              if (bw > 0) { doc.setFillColor(...ORANGE); doc.rect(M + LW2, y + 0.5, bw, 4, 'F'); }
              doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...OFFWHITE);
              doc.text(fc.count.toLocaleString(), M + LW2 + bMax + 2, y + 2.5);
            }
            if (cc) {
              const ox = M + half + 6;
              const bw = (cc.count / maxC) * bMax;
              doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BODY);
              doc.text(`${i+1}. ${cc.city_name}`, ox, y + 2.5, { maxWidth: LW2 - 1 });
              doc.setFillColor(...SLATE); doc.rect(ox + LW2, y + 0.5, bMax, 4, 'F');
              if (bw > 0) { doc.setFillColor(...GREEN); doc.rect(ox + LW2, y + 0.5, bw, 4, 'F'); }
              doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...OFFWHITE);
              doc.text(cc.count.toLocaleString(), ox + LW2 + bMax + 2, y + 2.5);
            }
            y += 8;
          }
          y += 4;
        } else {
          const cityData = topCitiesChart.length > 0 ? topCitiesChart : checkinCitiesChart;
          const cityColor = topCitiesChart.length > 0 ? ORANGE : GREEN;
          hBar(cityData.slice(0, 8).map((c: any) => ({ label: c.city_name, value: c.count })), cityColor);
        }

        if (groups.length > 0) {
          rule();
          heading('Event Groups');
          desc('Community groups formed around your events. Member count signals organic community depth — a compelling metric for community-focused sponsors.');
          checkPage(groups.length * 7 + 14);
          autoTable(doc, {
            startY: y,
            head: [['Group Name', 'City', 'Members', 'Capacity']],
            body: groups.slice(0, 12).map((g: any) => [
              g.title ?? g.name ?? '—',
              g.city_name ?? '—',
              (g.member_count ?? 0).toLocaleString(),
              g.max_members ? g.max_members.toLocaleString() : '∞',
            ]),
            styles: { fontSize: 7, cellPadding: [2, 4], textColor: BODY, fillColor: BG2, lineColor: BORDER, lineWidth: 0.1 },
            headStyles: { fillColor: SLATE, textColor: WHITE, fontStyle: 'bold', fontSize: 7, cellPadding: [2.5, 4] },
            alternateRowStyles: { fillColor: [14, 15, 20] as [number, number, number] },
            margin: { left: M, right: M },
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      // ══════════════════════════════════════════════════════════
      // FOOTER — every page
      // ══════════════════════════════════════════════════════════
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
        doc.line(0, pageH - 8, pageW, pageH - 8);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(...MUTED);
        doc.text('Deursocial · Confidential', M, pageH - 4);
        doc.text(`Page ${i} of ${totalPages}`, pageW - M, pageH - 4, { align: 'right' });
      }

      const slug = eventLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      doc.save(`deursocial-analytics-${slug}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  // Fetch EO events for selector chips
  const { data: events } = useQuery<{ id: any; title: any; slug: any }[]>({
    queryKey: ['eo', 'events-list', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!eoId,
  });

  useEffect(() => {
    if (!events) return;
    if (selectedSlug === undefined && events.length > 0) {
      setSelectedSlug(events[0].slug);
    } else if (selectedSlug === undefined) {
      setSelectedSlug(null);
    }
  }, [events]);

  // Effective slug: wait until defaulting is done
  const effectiveSlug = selectedSlug === undefined ? null : selectedSlug;

  // Fetch analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['eo', 'analytics', eoId, effectiveSlug],
    queryFn: async () => {
      const url = effectiveSlug ? `/api/eo/analytics/${effectiveSlug}` : '/api/eo/analytics';
      const res = await api.get(url);
      return res.data?.data ?? null;
    },
    enabled: !!eoId && selectedSlug !== undefined,
  });

  // Gender pie data
  const genderData = [
    { name: 'Male', value: analytics?.demographics?.gender?.male ?? 0, color: CHART_COLORS.male },
    { name: 'Female', value: analytics?.demographics?.gender?.female ?? 0, color: CHART_COLORS.female },
    { name: 'Unknown', value: analytics?.demographics?.gender?.unknown ?? 0, color: CHART_COLORS.unknown },
  ].filter(d => d.value > 0);

  // Age bar data
  const ageData = [
    { name: '<18', value: analytics?.demographics?.age_brackets?.under_18 ?? 0 },
    { name: '18–24', value: analytics?.demographics?.age_brackets?.['18_24'] ?? 0 },
    { name: '25–34', value: analytics?.demographics?.age_brackets?.['25_34'] ?? 0 },
    { name: '35+', value: analytics?.demographics?.age_brackets?.['35_plus'] ?? 0 },
  ];

  // Traffic sources bar data
  const ts = analytics?.traffic_sources ?? {};
  const sourceData = [
    { name: 'events',  value: (ts.events  ?? 0) + (ts.homepage ?? 0) },
    { name: 'search',  value:  ts.search  ?? 0 },
    { name: 'share',   value:  ts.share   ?? 0 },
    { name: 'post',    value:  ts.post    ?? 0 },
    { name: 'moment',  value:  ts.moment  ?? 0 },
    { name: 'lineup',  value: (ts.lineup  ?? 0) + (ts.trending ?? 0) },
  ];

  // Platform totals
  const iosCount = analytics?.platform_split?.ios ?? 0;
  const androidCount = analytics?.platform_split?.android ?? 0;
  const platformTotal = iosCount + androidCount || 1;

  // Stacked chart builder — pivots [{date, <key>, cnt}] into [{date, key1: n, key2: n, ...}]
  function buildStacked(rows: any[], dateKey: string, catKey: string, cats: string[]) {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const d = r[dateKey];
      if (!dateMap[d]) dateMap[d] = {};
      const cat = String(r[catKey] ?? 'unknown');
      dateMap[d][cat] = (dateMap[d][cat] ?? 0) + Number(r.cnt ?? r.count ?? 0);
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const entry: Record<string, any> = { date };
        cats.forEach(c => { entry[c] = vals[c] ?? 0; });
        return entry;
      });
  }

  // Followers per day — stacked by platform and source
  const followersDayByPlatformData = buildStacked(
    analytics?.followers_per_day_by_platform ?? [], 'date', 'platform', ['ios', 'android', 'unknown']
  );
  const followersDayBySourceData = buildStacked(
    analytics?.followers_per_day_by_source ?? [], 'date', 'source', ['events', 'search', 'share', 'post', 'moment', 'lineup']
  );

  // Views per day — stacked
  const impressionsDayByPlatformData = buildStacked(
    analytics?.impressions_per_day_by_platform ?? [], 'date', 'platform', ['ios', 'android', 'unknown']
  );
  const impressionsDayBySourceData = buildStacked(
    analytics?.impressions_per_day_by_source ?? [], 'date', 'source', ['events', 'search', 'share', 'post', 'moment', 'lineup']
  );

  // Monthly series
  const viewsMonthData: { month: string; count: number }[] = analytics?.impressions_per_month ?? [];
  const followersMonthData: { month: string; count: number }[] = analytics?.followers_per_month ?? [];
  const checkinsMonthData: { month: string; count: number }[] = analytics?.checkins_per_month ?? [];

  // Cities
  const topCities: { city_name: string; province_name: string; lat: number | null; lng: number | null; count: number }[] = analytics?.demographics?.top_cities ?? [];
  const maxCityCount = topCities[0]?.count || 1;

  const citiesWithCoords = topCities.filter((c): c is { city_name: string; province_name: string; lat: number; lng: number; count: number } => c.lat != null && c.lng != null);
  const checkinCitiesRaw: { city_name: string; province_name: string; lat: number | null; lng: number | null; count: number; users?: CheckinUser[] }[] = analytics?.demographics?.checkin_cities ?? [];
  const checkinCitiesWithCoords = checkinCitiesRaw.filter(c => c.lat != null && c.lng != null);
  const maxCheckinCount = checkinCitiesRaw[0]?.count || 1;
  const venueLocation: VenueLocation = analytics?.venue_location ?? null;

  // Content
  const imgBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

  return (
    <div style={{ padding: '24px 28px 64px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Event Analytics</h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Sponsor-ready metrics · internal data</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting || isLoading || !analytics}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 6, border: '1px solid #2a2a2a',
            background: exporting ? '#111' : '#161616', color: exporting ? '#555' : '#ccc',
            fontSize: 12, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exporting ? 'Exporting…' : 'Download PDF'}
        </button>
      </div>

      {/* Event selector chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          onClick={() => setSelectedSlug(null)}
          style={{
            padding: '5px 12px', borderRadius: 4, border: `1px solid ${!effectiveSlug ? '#e8e8e8' : '#1e1e1e'}`,
            background: !effectiveSlug ? '#111' : '#0a0a0a', color: !effectiveSlug ? '#e8e8e8' : '#666',
            fontSize: 11, cursor: 'pointer',
          }}
        >
          All Events
        </button>
        {events?.map(e => (
          <button
            key={e.slug}
            onClick={() => setSelectedSlug(e.slug)}
            style={{
              padding: '5px 12px', borderRadius: 4, border: `1px solid ${effectiveSlug === e.slug ? '#e8e8e8' : '#1e1e1e'}`,
              background: effectiveSlug === e.slug ? '#111' : '#0a0a0a', color: effectiveSlug === e.slug ? '#e8e8e8' : '#666',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {e.title}
          </button>
        ))}
      </div>

      {/* ── Audience Overview ── */}
      <div style={sectionLabel as any}>Audience Overview</div>
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} h={90} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <StatCard label="Total Followers" value={analytics?.followers ?? 0} badge={analytics?.followers > 0 ? 'followers' : undefined} />
          <StatCard label="Unique Check-ins" value={analytics?.checkins ?? 0} sub={`across ${effectiveSlug ? '1 event' : `${events?.length ?? 0} events`}`} />
          <StatCard label="Follow → Checkin" value={`${analytics?.conversion_rate ?? 0}%`} sub="industry avg ~20%" />
          <StatCard label="Event Detail Views" value={analytics?.total_impressions ?? 0} sub="unique impressions" />
        </div>
      )}

      {/* ── Traffic Sources + Platform ── */}
      <div style={sectionLabel as any}>Traffic Sources & Platform</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Traffic Sources */}
        <div style={panel}>
          <div style={panelTitle}>Where users find your events</div>
          {isLoading ? <Skeleton h={120} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sourceData.map(s => {
                const total = sourceData.reduce((a, b) => a + b.value, 0) || 1;
                const pct = Math.round((s.value / total) * 100);
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 70, fontSize: 10, color: '#666', textAlign: 'right', textTransform: 'capitalize' }}>{s.name}</div>
                    <div style={{ flex: 1, background: '#111', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: SOURCE_COLORS[s.name] ?? '#555', width: `${pct}%` }} />
                    </div>
                    <div style={{ width: 80, fontSize: 10, color: '#555', textAlign: 'right', whiteSpace: 'nowrap' }}>{s.value.toLocaleString()} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform + timeline */}
        <div style={panel}>
          <div style={panelTitle}>Platform split</div>
          {isLoading ? <Skeleton h={60} /> : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'iOS', count: iosCount, color: CHART_COLORS.ios },
                  { label: 'Android', count: androidCount, color: CHART_COLORS.android },
                ].map(p => (
                  <div key={p.label} style={{ flex: 1, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 6, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', color: p.color }}>
                      {Math.round((p.count / platformTotal) * 100)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{p.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: '12px 14px', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', color: '#e8e8e8', lineHeight: 1 }}>
                  {(analytics?.total_impressions ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
                  Total event detail views. Each view = a user opened your event page.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Demographics ── */}
      <div style={sectionLabel as any}>Audience Demographics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>

        {/* Gender donut */}
        <div style={panel}>
          <div style={panelTitle}>Gender split (followers)</div>
          {isLoading ? <Skeleton h={100} /> : genderData.length > 0 ? (() => {
            const total = genderData.reduce((a, b) => a + b.value, 0);
            const dominant = genderData.reduce((a, b) => a.value > b.value ? a : b);
            const dominantPct = Math.round((dominant.value / total) * 100);
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
                  <PieChart width={90} height={90}>
                    <Pie data={genderData} cx={40} cy={40} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                      {genderData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {genderData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#888' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        {d.name} · {d.value.toLocaleString()} ({Math.round((d.value / total) * 100)}%)
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5 }}>
                  Audience is {dominantPct}% {dominant.name.toLowerCase()} out of {total.toLocaleString()} followers with known gender.
                </div>
              </div>
            );
          })() : (
            <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No data yet</div>
          )}
        </div>

        {/* Age brackets */}
        <div style={panel}>
          <div style={panelTitle}>Age distribution (followers)</div>
          {isLoading ? <Skeleton h={100} /> : (() => {
            const totalAge = ageData.reduce((a, b) => a + b.value, 0);
            const dominant = ageData.reduce((a, b) => a.value > b.value ? a : b);
            const dominantPct = totalAge > 0 ? Math.round((dominant.value / totalAge) * 100) : 0;
            return (
              <div>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={ageData} barCategoryGap="20%">
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="value" fill={CHART_COLORS.bar} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {totalAge > 0 && (
                  <div style={{ fontSize: 10, color: '#555', marginTop: 8, lineHeight: 1.5 }}>
                    Largest bracket: {dominant.name} with {dominant.value.toLocaleString()} followers ({dominantPct}% of {totalAge.toLocaleString()} total).
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Top cities */}
        <div style={panel}>
          <div style={panelTitle}>Top cities (followers)</div>
          {isLoading ? <Skeleton h={100} /> : topCities.length > 0 ? (
            <div>
              {topCities.slice(0, 6).map(c => (
                <div key={c.city_name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #0f0f0f' }}>
                  <div style={{ fontSize: 11, color: '#888', flex: 1 }}>{c.city_name}</div>
                  <div style={{ width: 70, height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: CHART_COLORS.line, width: `${Math.round((c.count / maxCityCount) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#e8e8e8', fontWeight: 500, width: 36, textAlign: 'right' }}>{c.count.toLocaleString()}</div>
                </div>
              ))}
              {topCities.length === 0 && (
                <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No location data yet</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No location data yet</div>
          )}
        </div>
      </div>

      {/* ── Geographic Distribution ── */}
      <div style={sectionLabel as any}>Geographic Distribution</div>
      <div style={{ ...panel, padding: 16 }}>
        {/* Toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['checkins', 'followers'] as const).map(m => (
            <button key={m} onClick={() => setMapMode(m)} style={{
              fontSize: 10, padding: '4px 12px', borderRadius: 4,
              border: `1px solid ${mapMode === m ? '#4a9eff' : '#1e1e1e'}`,
              background: mapMode === m ? 'rgba(74,158,255,0.08)' : 'transparent',
              color: mapMode === m ? '#4a9eff' : '#555', cursor: 'pointer',
            }}>
              {m === 'checkins' ? 'Check-in arcs' : 'Follower cities'}
            </button>
          ))}
        </div>
        {isLoading ? <Skeleton h={340} /> : mapMode === 'checkins' ? (
          checkinCitiesWithCoords.length === 0 ? (
            <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>
              No check-in location data yet
            </div>
          ) : (
            <CityArcMap
              checkinCities={checkinCitiesWithCoords as CityPoint[]}
              venueLocation={venueLocation}
              maxCheckin={maxCheckinCount}
            />
          )
        ) : (
          citiesWithCoords.length === 0 ? (
            <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>
              No follower location data yet
            </div>
          ) : (
            <FollowerBubbleMap cities={citiesWithCoords} maxCount={maxCityCount} />
          )
        )}
      </div>

      {/* ── Check-in Timeline ── */}
      <div style={sectionLabel as any}>Check-in Timeline</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        <MiniToggleChart
          title="Check-ins"
          color={CHART_COLORS.green}
          dayData={(analytics?.checkins_per_day ?? []).map((d: any) => ({ date: d.date, count: d.count }))}
          monthData={checkinsMonthData}
          loading={isLoading}
        />

        <div style={panel}>
          <div style={panelTitle}>Peak hours (0–23h)</div>
          {isLoading ? <Skeleton h={50} /> : (
            <HourHeatmap data={analytics?.checkins_per_hour ?? []} />
          )}
        </div>
      </div>

      {/* ── Followers & Views ── */}
      <div style={sectionLabel as any}>Followers & Views</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        <MiniToggleChart
          title="Followers (last 7 days)"
          color={CHART_COLORS.bar}
          dayData={(analytics?.followers_per_day ?? []).slice(-7).map((d: any) => ({ date: d.date, count: d.count }))}
          monthData={followersMonthData}
          loading={isLoading}
        />

        <MiniToggleChart
          title="Event Views (last 7 days)"
          color={CHART_COLORS.line}
          dayData={(analytics?.impressions_per_day ?? []).slice(-7).map((d: any) => ({ date: d.date, count: d.count }))}
          monthData={viewsMonthData}
          loading={isLoading}
        />
      </div>

      {/* ── Content Engagement ── */}
      <div style={sectionLabel as any}>Content Engagement</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Top moments grid */}
        <div style={panel}>
          <div style={panelTitle}>Top moments (likes + comments)</div>
          {isLoading ? <Skeleton h={160} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {(analytics?.top_moments ?? []).map((m: any) => {
                const img = m.images?.[0]?.image;
                const url = img ? `${imgBase}${img}` : null;
                return (
                  <div key={m.slug} style={{ aspectRatio: '1', borderRadius: 4, overflow: 'hidden', position: 'relative', background: '#111' }}>
                    {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent,rgba(0,0,0,0.8))' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 9, color: '#ccc' }}>♥ {Number(m.total_likes).toLocaleString()}</span>
                        <span style={{ fontSize: 9, color: '#ccc' }}>💬 {Number(m.total_comments).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!analytics?.top_moments || analytics.top_moments.length === 0) && (
                <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No moments yet</div>
              )}
            </div>
          )}
        </div>

        {/* Top posts table */}
        <div style={panel}>
          <div style={panelTitle}>Top posts (likes + comments)</div>
          {isLoading ? <Skeleton h={160} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Caption</th>
                  <th style={{ ...th, textAlign: 'right' }}>Likes</th>
                  <th style={{ ...th, textAlign: 'right' }}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.top_posts ?? []).map((p: any, i: number) => (
                  <tr key={p.slug}>
                    <td style={{ ...td, color: '#444' }}>{i + 1}</td>
                    <td style={{ ...td, color: '#ccc', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.caption ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{Number(p.total_likes).toLocaleString()}</td>
                    <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{Number(p.total_comments).toLocaleString()}</td>
                  </tr>
                ))}
                {(!analytics?.top_posts || analytics.top_posts.length === 0) && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#333' }}>No posts yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Groups ── */}
      <div style={sectionLabel as any}>Groups</div>
      <div style={panel}>
        <div style={panelTitle}>Groups per event</div>
        {isLoading ? <Skeleton h={80} /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Group</th>
                <th style={th}>City</th>
                <th style={{ ...th, textAlign: 'right' }}>Members</th>
                <th style={{ ...th, textAlign: 'right' }}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.groups ?? []).map((g: any, i: number) => (
                <tr key={g.slug}>
                  <td style={{ ...td, color: '#ccc' }}>{g.title}</td>
                  <td style={td}>{g.city_name ?? '—'}</td>
                  <td style={{ ...td, color: '#e8e8e8', fontWeight: 500, textAlign: 'right' }}>{g.member_count}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{g.max_members ?? '∞'}</td>
                </tr>
              ))}
              {(!analytics?.groups || analytics.groups.length === 0) && (
                <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#333' }}>No groups yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
