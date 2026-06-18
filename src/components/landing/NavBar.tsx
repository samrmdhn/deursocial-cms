function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iPad|iPhone|iPod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
}

export default function NavBar() {
  const mobile = isMobile();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(11,11,11,0.78)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(244,242,236,0.12)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '16px clamp(20px, 5vw, 56px)',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img
            src="/deursocial-logo.png"
            alt="deursocial"
            style={{ height: 30, width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
          />
        </div>
        {!mobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2.4vw, 30px)' }}>
            <a
              href="#get"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: '#0B0B0B',
                background: '#F4F2EC',
                textDecoration: 'none',
                padding: '9px 18px',
                borderRadius: 999,
                whiteSpace: 'nowrap' as const,
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.background = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#F4F2EC';
              }}
            >
              Get the app
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
