const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/deursocial',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com/deursocial',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.738-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Threads',
    href: 'https://www.threads.net/@deursocial',
    icon: (
      <svg width="17" height="17" viewBox="0 0 192 192" fill="currentColor" aria-hidden="true">
        <path d="M141.537 88.988c-.88-.415-1.78-.815-2.7-1.197-1.578-27.38-16.423-43.028-41.5-43.19h-.276c-14.985 0-27.45 6.396-35.12 18.036l13.78 9.453c5.731-8.695 14.724-10.549 21.347-10.549h.083c8.25.053 14.474 2.451 18.504 7.129 2.932 3.405 4.893 8.11 5.864 14.049-7.314-1.243-15.224-1.625-23.68-1.141-23.82 1.373-39.134 15.265-38.105 34.569.52 9.792 5.398 18.216 13.733 23.719 7.048 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.9-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.131 9.635 4.372 25.468-8.547 38.376-11.319 11.308-24.925 16.2-45.487 16.351-22.81-.169-40.06-7.484-51.276-21.742C29.823 135.966 24.395 116.682 24.192 92c.203-24.682 5.631-43.966 16.136-57.317C51.544 20.425 68.794 13.11 91.603 12.94c23.16.171 40.71 7.521 52.355 21.847 5.71 7.026 10.015 15.861 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C142.809 5.443 121.084-3.968 93.05-4.164L92.938-4.162l-.028.001c-28.075.195-49.665 9.643-64.168 28.08C15.766 40.489 9.108 63.318 8.885 92l-.002.006.002.006c.223 28.682 6.881 51.511 19.793 67.918C43.178 178.325 64.768 187.773 92.843 187.968h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-19.045-20.61-19.52z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@deursocial',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.87a8.18 8.18 0 0 0 4.78 1.52v-3.38a4.85 4.85 0 0 1-1-.32z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer style={{ background: '#0B0B0B', color: '#F4F2EC' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(46px, 5vw, 76px) clamp(20px, 5vw, 56px) clamp(34px, 4vw, 52px)', width: '100%' }}>
        <img src="/deursocial-logo.png" alt="deursocial" style={{ height: 30, width: 'auto', display: 'block', filter: 'brightness(0) invert(1)', maxWidth: '100%' }} />

        <p style={{ marginTop: 'clamp(12px, 2vw, 20px)', fontSize: 'clamp(13px, 1.2vw, 16px)', fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(244,242,236,0.45)' }}>
          A Place for Music Community Scene
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 20, marginTop: 'clamp(14px, 2vw, 22px)' }}>
          <a href="tel:08988887229" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'rgba(244,242,236,0.55)', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F2EC')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,242,236,0.55)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.14-1.14a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            0898-8887-229
          </a>
          <a href="mailto:mindeursocial@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'rgba(244,242,236,0.55)', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F2EC')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,242,236,0.55)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            mindeursocial@gmail.com
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'clamp(24px, 3vw, 40px)', flexWrap: 'wrap' as const }}>
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} @deursocial`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(244,242,236,0.12)', color: 'rgba(244,242,236,0.55)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'all 0.18s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F4F2EC'; e.currentTarget.style.borderColor = 'rgba(244,242,236,0.35)'; e.currentTarget.style.background = 'rgba(244,242,236,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(244,242,236,0.55)'; e.currentTarget.style.borderColor = 'rgba(244,242,236,0.12)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {s.icon}
              @deursocial
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' as const, marginTop: 'clamp(30px, 4vw, 52px)', paddingTop: 24, borderTop: '1px solid rgba(244,242,236,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(244,242,236,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>PT ANUGERAH CIPTA LOKAL</span>
            <span style={{ fontSize: 12, color: 'rgba(244,242,236,0.3)' }}>© {new Date().getFullYear()} deursocial</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(244,242,236,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Jakarta, Indonesia</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13 }}>
            <a href="/privacy-policy" style={{ color: 'rgba(244,242,236,0.45)', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F2EC')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,242,236,0.45)')}>Privacy &amp; Policy</a>
            <a href="/terms-condition" style={{ color: 'rgba(244,242,236,0.45)', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F2EC')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,242,236,0.45)')}>Terms and Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
