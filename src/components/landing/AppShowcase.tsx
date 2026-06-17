/* ── Montage cards ── */
export function GroupMCard() {
  return (
    <div style={{ background: '#18181B', borderRadius: 16, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Luminos Crew</span>
          <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', borderRadius: 100, padding: '5px 11px', fontSize: 11, fontWeight: 700 }}>Joined</span>
        </div>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 100, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Private
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            Bandung
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
            11/20
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: 999, background: '#EC4899', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>D</span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>Dimas</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>Creator</div>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: '#3B82F6', border: '2px solid #18181B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>A</span>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: '#10B981', border: '2px solid #18181B', marginLeft: -8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>N</span>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '2px solid #18181B', marginLeft: -8, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>+7</span>
        </div>
      </div>
    </div>
  );
}

function PostMCard() {
  return (
    <div style={{ background: '#0F0F12', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 32, height: 32, borderRadius: 999, background: '#7C5CFC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>S</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>samrmdhn</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>›</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Luminos Fest</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>6h</span>
        </div>
      </div>
      <p style={{ margin: '9px 0 10px', fontSize: 13, lineHeight: 1.45, color: '#fff' }}>front row tonight 🔥 who else is here??</p>
      <div style={{ height: 92, borderRadius: 10, background: 'linear-gradient(135deg, #3B1D6E 0%, #7C5CFC 55%, #EC4899 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.25), transparent 35%)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 11, color: 'rgba(255,255,255,0.55)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="1.6"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></svg>
          <span style={{ color: '#ef4444' }}>248</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
          31
        </span>
      </div>
    </div>
  );
}

export function EventMCard() {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: '#18181B', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ height: 104, background: 'linear-gradient(135deg, #1e3a8a 0%, #7C5CFC 100%)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 0%, rgba(255,255,255,0.25), transparent 55%)' }} />
        <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', gap: 6 }}>
          <span style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>UPCOMING</span>
          <span style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,140,0,0.4)', color: '#ffa94d', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>🔥 Trending</span>
        </div>
      </div>
      <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>Voltwave 2025</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          Jiexpo Kemayoran, Jakarta
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>
          Sep 6–7, 2025
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{ display: 'flex' }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, background: '#F59E0B', border: '1px solid #18181B' }} />
            <span style={{ width: 18, height: 18, borderRadius: 999, background: '#EC4899', border: '1px solid #18181B', marginLeft: -6 }} />
            <span style={{ width: 18, height: 18, borderRadius: 999, background: '#10B981', border: '1px solid #18181B', marginLeft: -6 }} />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>12.4k followers</span>
        </div>
      </div>
    </div>
  );
}

export function PassportMCard({ title = "Luminos Fest", date = "Jul 19, 2025", rank = "7" }: { title?: string; date?: string; rank?: string }) {
  return (
    <div style={{ background: '#7C5CFC', borderRadius: 5, padding: '9px 9px 13px', boxShadow: '0 18px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ height: 96, borderRadius: 2, overflow: 'hidden', background: 'linear-gradient(160deg, #12061f 0%, #4c1d95 60%, #db2777 120%)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.4), transparent 45%), radial-gradient(circle at 18% 80%, rgba(255,255,255,0.18), transparent 40%)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: 16, margin: '0 -9px' }}>
        <span style={{ width: 9, height: 16, borderTopRightRadius: 9, borderBottomRightRadius: 9, background: '#0B0B0B' }} />
        <span style={{ flex: 1, height: 1.5, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 5px, transparent 5px 11px)' }} />
        <span style={{ width: 9, height: 16, borderTopLeftRadius: 9, borderBottomLeftRadius: 9, background: '#0B0B0B' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 2px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3px' }}>{date}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>#{rank}</span>
      </div>
    </div>
  );
}

const CARDS = [
  { Card: GroupMCard, rot: -4, label: 'Groups' },
  { Card: PostMCard, rot: 3, label: 'Posts' },
  { Card: EventMCard, rot: -2, label: 'Events' },
  { Card: PassportMCard, rot: 4, label: 'Passport' },
] as const;

export default function AppShowcase() {
  return (
    <section style={{ background: '#0B0B0B', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'clamp(48px, 6vw, 88px) clamp(20px, 5vw, 56px)',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 5vw, 64px)' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(244,242,236,0.5)' }}>
            All in one app
          </span>
          <h3 style={{ margin: '12px 0 0', fontWeight: 900, fontSize: 'clamp(28px, 4.5vw, 56px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            Groups, posts, events &amp; a passport.
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'clamp(16px, 2vw, 24px)',
            alignItems: 'start',
          }}
        >
          {CARDS.map(({ Card, rot, label }, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{ transform: `rotate(${rot}deg)`, transition: 'transform 0.4s cubic-bezier(0.2,0.7,0.2,1)' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = `rotate(${rot}deg)`)}
              >
                <Card />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(244,242,236,0.35)' }}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
