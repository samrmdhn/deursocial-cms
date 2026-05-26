import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  src: string;
  aspect?: number; // 0 = original (no crop), else w/h ratio like 1, 0.8, 1.777
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const FRAME_W = 560;

/**
 * Pan-to-reposition cropper matching the RN CropEditorModal pattern.
 * User drags the image within a fixed frame. On Done, canvas crops
 * the visible region and returns a Blob.
 */
export default function ImageCropper({ src, aspect = 0, onCropComplete, onCancel }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Natural image dimensions
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);

  // Derived layout (recomputed when natural dims known)
  const frameH = aspect > 0 ? Math.round(FRAME_W / aspect) : FRAME_W;

  // We'll store the current translate as a ref for perf, and sync to state for re-render
  const offsetX = useRef(0);
  const offsetY = useRef(0);
  const [, forceRender] = useState(0);

  const displayW = useRef(0);
  const displayH = useRef(0);
  const maxOffsetX = useRef(0);
  const maxOffsetY = useRef(0);

  const clampOffset = useCallback((ox: number, oy: number) => ({
    x: Math.min(0, Math.max(-maxOffsetX.current, ox)),
    y: Math.min(0, Math.max(-maxOffsetY.current, oy)),
  }), []);

  function computeLayout(nw: number, nh: number) {
    if (!nw || !nh) return;
    const targetRatio = aspect > 0 ? aspect : nw / nh;
    const imageRatio = nw / nh;

    let cropW: number, cropH: number;
    if (imageRatio > targetRatio) {
      cropH = nh;
      cropW = Math.round(nh * targetRatio);
    } else {
      cropW = nw;
      cropH = Math.round(nw / targetRatio);
    }

    const scale = FRAME_W / cropW;
    displayW.current = nw * scale;
    displayH.current = nh * scale;
    maxOffsetX.current = Math.max(0, displayW.current - FRAME_W);
    maxOffsetY.current = Math.max(0, displayH.current - frameH);

    // Center on reset
    const c = clampOffset(-maxOffsetX.current * 0.5, -maxOffsetY.current * 0.5);
    offsetX.current = c.x;
    offsetY.current = c.y;
    forceRender(n => n + 1);
  }

  function onImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
    computeLayout(img.naturalWidth, img.naturalHeight);
  }

  // Recompute layout when aspect changes (after image already loaded)
  useEffect(() => {
    if (naturalW && naturalH) computeLayout(naturalW, naturalH);
  }, [aspect]);

  // ── Pan gesture ──────────────────────────────────────────────
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX.current, oy: offsetY.current };
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const c = clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy);
      offsetX.current = c.x;
      offsetY.current = c.y;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate(${offsetX.current}px, ${offsetY.current}px)`;
      }
    }
    function onMouseUp() { dragging.current = false; }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clampOffset]);

  // ── Touch support ────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragging.current = true;
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offsetX.current, oy: offsetY.current };
  }

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.x;
      const dy = t.clientY - dragStart.current.y;
      const c = clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy);
      offsetX.current = c.x;
      offsetY.current = c.y;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate(${offsetX.current}px, ${offsetY.current}px)`;
      }
    }
    function onTouchEnd() { dragging.current = false; }

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [clampOffset]);

  // ── Done: canvas crop ────────────────────────────────────────
  function handleDone() {
    const img = imgRef.current;
    if (!img || !naturalW || !naturalH) return;

    const scaleToNatural = naturalW / displayW.current;

    // What region of the natural image is visible in the frame?
    const srcX = Math.round(-offsetX.current * scaleToNatural);
    const srcY = Math.round(-offsetY.current * scaleToNatural);
    const srcW = Math.round(FRAME_W * scaleToNatural);
    const srcH = Math.round(frameH * scaleToNatural);

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    canvas.toBlob((blob) => { if (blob) onCropComplete(blob); }, 'image/jpeg', 0.9);
  }

  const fH = aspect > 0 ? Math.round(FRAME_W / aspect) : FRAME_W;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.9)' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 16, width: '100%', maxWidth: 640, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#d0d0d0', fontSize: 13, fontWeight: 600 }}>Adjust crop</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Frame */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            ref={frameRef}
            style={{
              width: FRAME_W,
              maxWidth: '100%',
              height: fH,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'grab',
              borderRadius: 4,
              background: '#000',
              border: '2px solid #fff',
              userSelect: 'none',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              alt="Crop"
              draggable={false}
              style={{
                width: displayW.current || '100%',
                height: displayH.current || 'auto',
                transform: `translate(${offsetX.current}px, ${offsetY.current}px)`,
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
            {/* Grid overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, background: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Drag to reposition</span>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: '10px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleDone}
              style={{ flex: 1, padding: '10px', background: '#fff', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
