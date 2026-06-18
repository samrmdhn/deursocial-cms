import { useState } from 'react';

const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.deursocial.app';

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

export default function MobileAppBanner() {
  const [dismissed, setDismissed] = useState(false);

  const android = isAndroid();
  const ios = isIOS();

  if (dismissed || (!android && !ios)) return null;

  const comingSoon = ios;

  return (
    <div
      style={{
        background: '#141414',
        borderBottom: '1px solid rgba(244,242,236,0.12)',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        gap: 12,
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Close banner"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(244,242,236,0.5)',
          fontSize: 22,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 4px',
          flexShrink: 0,
        }}
      >
        ×
      </button>

      <img
        src="/icon.png"
        alt="deursocial"
        style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#F4F2EC', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
          deursocial
        </div>
        <div style={{ color: 'rgba(244,242,236,0.5)', fontSize: 12, marginTop: 2 }}>
          {comingSoon ? 'Coming soon on App Store' : 'Free on Google Play'}
        </div>
      </div>

      {comingSoon ? (
        <span
          style={{
            color: 'rgba(244,242,236,0.3)',
            fontWeight: 700,
            fontSize: 13,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Coming Soon
        </span>
      ) : (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#F4F2EC',
            color: '#0B0B0B',
            fontWeight: 700,
            fontSize: 13,
            padding: '8px 16px',
            borderRadius: 999,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Download
        </a>
      )}
    </div>
  );
}
