import { useEffect, useState } from 'react';

const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL ?? 'https://play.google.com/store/apps/details?id=com.deursocial.app';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export default function DeepLinkRedirect({ deepLink }: { deepLink: string }) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let iframeEl: HTMLIFrameElement | null = null;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (isIOS()) {
      iframeEl = document.createElement('iframe');
      iframeEl.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
      iframeEl.src = deepLink;
      document.body.appendChild(iframeEl);
    } else {
      window.location.href = deepLink;
    }

    timer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setShowFallback(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (iframeEl && document.body.contains(iframeEl)) {
        document.body.removeChild(iframeEl);
      }
    };
  }, [deepLink]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
      <img src="/icon.png" alt="deursocial" width={80} height={80} style={{ borderRadius: 18 }} />

      {!showFallback ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>Opening deursocial…</p>
          <Spinner />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 320 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', margin: 0 }}>App not installed?</p>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', color: '#000', fontWeight: 700, borderRadius: 14, padding: '14px 20px', textDecoration: 'none', fontSize: 15 }}
          >
            <GooglePlayIcon />
            Get it on Google Play
          </a>

          <button
            disabled
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, borderRadius: 14, padding: '14px 20px', border: 'none', cursor: 'not-allowed', fontSize: 15 }}
          >
            <AppleIcon />
            App Store — Coming Soon
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'ds-spin 0.7s linear infinite' }} />
  );
}

function GooglePlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-11.96L13 8.37 3.18 23.76zm17.16-10.98L17.5 11.2l-3.64 3.5 3.64 3.48 2.86-1.62a1.74 1.74 0 0 0 0-3.02v.04zM3 1.24C2.7 1.55 2.5 2 2.5 2.6v18.8c0 .6.2 1.05.5 1.36L13 12 3 1.24zm10.82 10.76L4.17.24C3.82.2 3.48.27 3.18.44L13.82 12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.04 1.19-2.02 3.56.03 2.81 2.47 3.74 2.5 3.75-.03.07-.39 1.37-1.23 2.31zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
