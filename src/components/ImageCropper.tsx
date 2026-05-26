import { useRef, useEffect, useCallback } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  src: string;
  /** Natural pixel dimensions of the source image */
  naturalW: number;
  naturalH: number;
  /** Crop aspect ratio [w, h] — e.g. [16, 9]. Must be non-null when this modal opens. */
  cropAspect: [number, number];
  /** Current origin fraction (null = center) */
  initialOrigin?: { x: number; y: number } | null;
  onConfirm: (origin: { x: number; y: number }) => void;
  onCancel: () => void;
}

const FRAME_W = 560;

/**
 * Pan-to-reposition cropper — exact port of RN CropEditorModal.
 * User drags the image within a fixed aspect-ratio frame.
 * On confirm, returns origin fraction {x, y} (0=top/left, 1=bottom/right).
 * No pixel manipulation — matches RN pattern exactly.
 */
export default function ImageCropper({
  src,
  naturalW,
  naturalH,
  cropAspect,
  initialOrigin,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const frameH = Math.round(FRAME_W * (cropAspect[1] / cropAspect[0]));

  // Scale: make image fill frame so cropW pixels == FRAME_W
  const targetRatio = cropAspect[0] / cropAspect[1];
  const imageRatio = naturalW / naturalH;

  let cropW: number, cropH: number;
  if (imageRatio > targetRatio) {
    cropH = naturalH;
    cropW = Math.round(naturalH * targetRatio);
  } else {
    cropW = naturalW;
    cropH = Math.round(naturalW / targetRatio);
  }

  const scale = FRAME_W / cropW;
  const displayW = naturalW * scale;
  const displayH = naturalH * scale;
  const maxOffsetX = Math.max(0, displayW - FRAME_W);
  const maxOffsetY = Math.max(0, displayH - frameH);

  const fractionToOffset = useCallback((fx: number, fy: number) => ({
    x: -Math.max(0, Math.min(fx * maxOffsetX, maxOffsetX)),
    y: -Math.max(0, Math.min(fy * maxOffsetY, maxOffsetY)),
  }), [maxOffsetX, maxOffsetY]);

  const offsetToFraction = (ox: number, oy: number) => ({
    x: maxOffsetX > 0 ? Math.max(0, Math.min(-ox / maxOffsetX, 1)) : 0.5,
    y: maxOffsetY > 0 ? Math.max(0, Math.min(-oy / maxOffsetY, 1)) : 0.5,
  });

  const initial = fractionToOffset(initialOrigin?.x ?? 0.5, initialOrigin?.y ?? 0.5);
  const offset = useRef({ x: initial.x, y: initial.y });
  const imgEl = useRef<HTMLImageElement>(null);

  function applyTransform() {
    if (imgEl.current) {
      imgEl.current.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px)`;
    }
  }

  useEffect(() => {
    const o = fractionToOffset(initialOrigin?.x ?? 0.5, initialOrigin?.y ?? 0.5);
    offset.current = o;
    applyTransform();
  }, [src]);

  // ── Mouse drag ───────────────────────────────────────────────
  const drag = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.current.x, oy: offset.current.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      offset.current = {
        x: Math.min(0, Math.max(-maxOffsetX, drag.current.ox + dx)),
        y: Math.min(0, Math.max(-maxOffsetY, drag.current.oy + dy)),
      };
      applyTransform();
    }
    function onUp() { drag.current.active = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [maxOffsetX, maxOffsetY]);

  // ── Touch drag ───────────────────────────────────────────────
  const touch = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { active: true, startX: t.clientX, startY: t.clientY, ox: offset.current.x, oy: offset.current.y };
  }

  useEffect(() => {
    function onMove(e: TouchEvent) {
      if (!touch.current.active) return;
      const t = e.touches[0];
      offset.current = {
        x: Math.min(0, Math.max(-maxOffsetX, touch.current.ox + t.clientX - touch.current.startX)),
        y: Math.min(0, Math.max(-maxOffsetY, touch.current.oy + t.clientY - touch.current.startY)),
      };
      applyTransform();
    }
    function onEnd() { touch.current.active = false; }
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, [maxOffsetX, maxOffsetY]);

  function handleConfirm() {
    onConfirm(offsetToFraction(offset.current.x, offset.current.y));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.92)' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 16, width: '100%', maxWidth: 640, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#d0d0d0', fontSize: 13, fontWeight: 600 }}>Adjust crop</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Frame */}
          <div
            style={{
              width: FRAME_W,
              maxWidth: '100%',
              height: frameH,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'grab',
              borderRadius: 4,
              background: '#000',
              border: '2px solid rgba(255,255,255,0.8)',
              userSelect: 'none',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <img
              ref={imgEl}
              src={src}
              alt=""
              draggable={false}
              style={{
                width: displayW,
                height: displayH,
                transform: `translate(${initial.x}px, ${initial.y}px)`,
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            />
            {/* Grid */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, background: 'rgba(255,255,255,0.25)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, background: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Drag to reposition</span>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: '10px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleConfirm}
              style={{ flex: 1, padding: '10px', background: '#fff', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
