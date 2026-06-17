export default function DownloadCTA() {
  return (
    <section id="get" style={{ background: '#F4F2EC', color: '#0B0B0B' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'clamp(64px, 9vw, 130px) clamp(20px, 5vw, 56px)',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'clamp(20px, 2.5vw, 32px)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
          Free · iOS &amp; Android
        </span>
        <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(44px, 8vw, 116px)', lineHeight: 0.9, letterSpacing: '-0.045em', maxWidth: '16ch' }}>
          Never go to a festival alone again.
        </h2>
        <p style={{ margin: 0, fontSize: 'clamp(17px, 1.6vw, 21px)', fontWeight: 500, lineHeight: 1.4, maxWidth: '32ch' }}>
          Find your crew, check in at the venue, and collect a passport from every night you'll never forget.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const, justifyContent: 'center', marginTop: 6 }}>
          <a
            href="https://play.google.com/store/apps/details?id=com.deursocial.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', transition: 'transform 0.15s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img src="/googleplay.svg" alt="Get it on Google Play" style={{ height: 'clamp(52px, 5.5vw, 62px)', width: 'auto', display: 'block', borderRadius: 12 }} />
          </a>
          <a href="#" style={{ display: 'block', opacity: 0.4, cursor: 'not-allowed' }}>
            <img src="/appstore.svg" alt="Download on the App Store" style={{ height: 'clamp(52px, 5.5vw, 62px)', width: 'auto', display: 'block', borderRadius: 12 }} />
          </a>
        </div>
      </div>
    </section>
  );
}
