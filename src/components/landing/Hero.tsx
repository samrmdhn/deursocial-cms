import { useState, useEffect } from 'react';

const WORDS = ['Music Community', 'Festival Friends', 'Concert Passports', 'Badge Collection'];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const wordShift = `-${(wordIndex * 100) / WORDS.length}%`;

  return (
    <section style={{ background: 'transparent', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 56px)',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ padding: 'clamp(16px, 3vh, 40px) 0 clamp(14px, 2.5vh, 32px)' }}>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 'clamp(22px, 3.2vw, 44px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'rgba(244,242,236,0.5)',
            }}
          >
            A Place for
          </p>
          <div
            style={{
              height: '1.22em',
              overflow: 'hidden',
              fontWeight: 900,
              fontSize: 'clamp(44px, 9vw, 120px)',
              lineHeight: 1.22,
              letterSpacing: '-0.05em',
              clipPath: 'inset(3px 0 0 0)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(${wordShift})`,
                transition: 'transform 0.7s cubic-bezier(0.7, 0, 0.2, 1)',
                willChange: 'transform',
              }}
            >
              {WORDS.map((w) => (
                <span key={w} style={{ display: 'block', height: '1.22em', lineHeight: 1.22, whiteSpace: 'nowrap', color: '#F4F2EC' }}>
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 28,
              flexWrap: 'wrap' as const,
              marginTop: 'clamp(20px, 2.5vh, 36px)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(17px, 1.6vw, 21px)',
                fontWeight: 500,
                lineHeight: 1.4,
                maxWidth: '38ch',
                color: 'rgba(244,242,236,0.85)',
              }}
            >
              Build your concert crew, check in at the venue, and collect a passport from every concert
              you go to.
            </p>
            <a
              href="#get"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 30px',
                border: '1.5px solid #F4F2EC',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                color: '#F4F2EC',
                background: 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0B0B0B';
                e.currentTarget.style.background = '#F4F2EC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#F4F2EC';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Get the app →
            </a>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap' as const,
            padding: 'clamp(48px, 6vh, 72px) 0 clamp(14px, 2vh, 22px)',
          }}
        >
          <a href="https://play.google.com/store/apps/details?id=com.deursocial.app" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', transition: 'transform 0.15s ease', borderRadius: 11 }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
            <img src="/googleplay.svg" alt="Get it on Google Play"
              style={{ height: 'clamp(48px, 5vw, 58px)', width: 'auto', display: 'block', borderRadius: 11 }} />
          </a>
          <a href="#" style={{ display: 'block', transition: 'transform 0.15s ease', opacity: 0.4, cursor: 'not-allowed', borderRadius: 11 }}>
            <img src="/appstore.svg" alt="Download on the App Store"
              style={{ height: 'clamp(48px, 5vw, 58px)', width: 'auto', display: 'block', borderRadius: 11 }} />
          </a>
        </div>
      </div>
    </section>
  );
}
