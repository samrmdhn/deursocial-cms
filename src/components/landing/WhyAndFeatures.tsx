import { useState, useEffect } from 'react';
import { GroupMCard } from './AppShowcase';

const CHECK_STATES = [
  { label: 'Check in to venue', bg: '#F4F2EC', color: '#0B0B0B' },
  { label: 'Verifying location…', bg: '#F4F2EC', color: '#0B0B0B' },
  { label: "Checked in · You're #42", bg: '#4ade80', color: '#06281a' },
];

function ChatMessage({ text, isMine, isFirst }: { text: string; isMine: boolean; isFirst: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: isMine ? 'flex-end' : 'flex-start',
      opacity: 0, animation: 'chat-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      animationDelay: isFirst ? '0.2s' : '1.4s'
    }}>
      {!isMine && (
        <div style={{ width: 24, height: 24, borderRadius: 12, background: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>R</div>
      )}
      <div style={{ background: isMine ? '#3B82F6' : '#27272A', color: '#fff', padding: '10px 14px', borderRadius: 18, borderBottomRightRadius: isMine ? 4 : 18, borderBottomLeftRadius: !isMine ? 4 : 18, fontSize: 13, maxWidth: '85%', lineHeight: 1.4 }}>
        {text}
      </div>
    </div>
  );
}

function GroupAndChatVisual() {
  return (
    <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)', borderRadius: 16 }}><GroupMCard /></div>
      <div style={{ background: '#121214', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, height: 200, boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 600 }}>Today 18:42</div>
        <ChatMessage text="Kuy ketemu di pintu utama 10 menit lagi bro?" isMine={false} isFirst={true} />
        <ChatMessage text="Otw bentar lagi! Cariin spot dulu dong 🏃‍♂️" isMine={true} isFirst={false} />
      </div>
    </div>
  );
}

function MiniPolaroid({ title, date, rank, bg, photoGradient, photoHeight = 72 }: { title: string; date: string; rank: string; bg: string; photoGradient: string; photoHeight?: number }) {
  return (
    <div style={{ background: bg, borderRadius: 5, padding: '8px 8px 14px', boxShadow: '0 14px 36px rgba(0,0,0,0.55)' }}>
      <div style={{ height: photoHeight, borderRadius: 2, overflow: 'hidden', background: photoGradient, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.42), transparent 48%), radial-gradient(circle at 15% 80%, rgba(255,255,255,0.18), transparent 40%)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: 16, margin: '0 -9px' }}>
        <span style={{ width: 9, height: 16, borderTopRightRadius: 9, borderBottomRightRadius: 9, background: '#0B0B0B' }} />
        <span style={{ flex: 1, height: 1.5, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 5px, transparent 5px 11px)' }} />
        <span style={{ width: 9, height: 16, borderTopLeftRadius: 9, borderBottomLeftRadius: 9, background: '#0B0B0B' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 2px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3px' }}>{date}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}>#{rank}</span>
      </div>
    </div>
  );
}


function MapToPolaroidVisual({ ck }: { ck: number }) {
  const isSuccess = ck === 2;
  const cs = CHECK_STATES[ck];
  return (
    <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 330, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', background: '#EDE8DE', opacity: isSuccess ? 0 : 1, transform: isSuccess ? 'scale(0.97)' : 'scale(1)', transition: 'all 0.5s ease', pointerEvents: isSuccess ? 'none' : 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: '#C8DCA4' }} />
          <div style={{ position: 'absolute', top: '31%', left: '9%', width: '12%', height: '9%', background: '#C8DCA4', borderRadius: 3 }} />
          <div style={{ position: 'absolute', top: '31%', left: '48%', width: '9%', height: '7%', background: '#C8DCA4', borderRadius: 3 }} />
          <div style={{ position: 'absolute', top: '28%', left: 0, right: 0, height: 5, background: '#A8C8E0', opacity: 0.7 }} />
          <div style={{ position: 'absolute', top: '33%', left: '22%', width: '56%', height: '44%', background: '#D8CAAF', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', bottom: 0, width: 1.5, background: 'rgba(0,0,0,0.08)' }} />
            <div style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: 1.5, background: 'rgba(0,0,0,0.08)' }} />
            <div style={{ position: 'absolute', top: '68%', left: 0, right: '50%', height: 1.5, background: 'rgba(0,0,0,0.06)' }} />
            <span style={{ position: 'absolute', top: 7, left: 8, fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'NimbusSan,sans-serif' }}>Hall A–C</span>
            <span style={{ position: 'absolute', top: 7, right: 8, fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'NimbusSan,sans-serif' }}>Hall D–F</span>
          </div>
          <div style={{ position: 'absolute', top: '33%', bottom: '16%', left: '80%', right: '3%', background: '#DDD0BE', borderRadius: 2 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16%', background: '#D6CCBC' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '5%', width: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '79%', width: 10, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: '6%', width: 6, background: '#fff' }} />
          <div style={{ position: 'absolute', top: '29%', left: 0, right: 0, height: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '17%', left: 0, right: 0, height: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ position: 'absolute', top: '54%', left: '79%', right: '7%', height: 5, background: '#fff' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 126, height: 126, borderRadius: '50%', background: 'rgba(124,92,252,0.08)', border: '2px solid rgba(124,92,252,0.75)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ width: 126, height: 126, borderRadius: '50%', border: '2px solid rgba(124,92,252,0.3)', animation: 'ds-ring 2.8s ease-out infinite' }} />
          </div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, calc(-100% - 2px))', zIndex: 10, filter: 'drop-shadow(0 4px 10px rgba(124,92,252,0.7))' }}>
            <div style={{ width: 30, height: 30, background: '#7C5CFC', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%' }} />
            </div>
          </div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ width: 14, height: 14, background: 'rgba(124,92,252,0.4)', borderRadius: '50%', animation: 'ds-ring 2s ease-out infinite' }} />
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(11,11,11,0.72)', borderRadius: 99, padding: '5px 12px', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0, animation: 'dot-pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'NimbusSan,sans-serif', letterSpacing: '0.04em' }}>Jiexpo · Kemayoran, Jakarta</span>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', background: 'transparent', opacity: isSuccess ? 1 : 0, transform: isSuccess ? 'scale(1)' : 'scale(1.03)', transition: 'all 0.55s cubic-bezier(0.4,0,0.2,1)', pointerEvents: isSuccess ? 'auto' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
          <div style={{ width: '100%', transform: 'rotate(3deg)' }}>
            <MiniPolaroid title="Echova Fest" date="Mar 2, 2025" rank="42" bg="#1E40AF" photoGradient="linear-gradient(145deg,#0a0e2e 0%,#1e3a8a 60%,#3b82f6 110%)" photoHeight={110} />
          </div>
        </div>
      </div>
      <div style={{ width: '100%', borderRadius: 14, padding: 16, fontFamily: 'NimbusSan, sans-serif', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: cs.bg, color: cs.color, transition: 'all 0.3s ease', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', cursor: 'pointer' }}>
        {ck === 1 && <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 999, border: '2px solid rgba(11,11,11,0.3)', borderTopColor: '#0B0B0B', animation: 'ds-spin 0.7s linear infinite' }} />}
        {ck === 2 && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
        {cs.label}
      </div>
    </div>
  );
}

const PASSPORT_SHOWS = [
  { title: 'Echova Fest', date: 'Mar 2, 2025', rank: '7', bg: '#1E40AF', photoGradient: 'linear-gradient(145deg,#0a0e2e 0%,#1e3a8a 60%,#3b82f6 110%)' },
  { title: 'Luminos Fest', date: 'Jul 19, 2025', rank: '42', bg: '#6D28D9', photoGradient: 'linear-gradient(145deg,#12061f 0%,#4c1d95 60%,#db2777 110%)' },
  { title: 'Neonveil', date: 'Sep 20, 2025', rank: '128', bg: '#BE185D', photoGradient: 'linear-gradient(145deg,#1f0a10 0%,#9d174d 60%,#f43f5e 110%)' },
  { title: 'Emberfall Fest', date: 'Oct 4, 2025', rank: '89', bg: '#065F46', photoGradient: 'linear-gradient(145deg,#022c22 0%,#065f46 60%,#10b981 110%)' },
  { title: 'Resonara', date: 'Nov 2, 2025', rank: '31', bg: '#92400E', photoGradient: 'linear-gradient(145deg,#1c1005 0%,#78350f 60%,#f59e0b 110%)' },
  { title: 'Voltwave', date: 'Nov 15, 2025', rank: '12', bg: '#1E3A5F', photoGradient: 'linear-gradient(145deg,#0c1a2e 0%,#1e3a5f 60%,#60a5fa 110%)' },
];
const PASSPORT_ROTS = [-7, 4, -5, 8, -3, 6];
const PASSPORT_OFFSETS = [14, -6, 18, -8, 10, -14];

function HorizontalPolaroidsVisual() {
  const doubled = [...PASSPORT_SHOWS, ...PASSPORT_SHOWS];
  return (
    <div style={{ width: '100%', overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
      <div style={{ display: 'flex', gap: 18, animation: 'passport-scroll 22s linear infinite', width: 'max-content', padding: '36px 0', alignItems: 'flex-start' }}>
        {doubled.map((show, i) => (
          <div key={i} style={{ flexShrink: 0, width: 210, transform: `rotate(${PASSPORT_ROTS[i % PASSPORT_ROTS.length]}deg) translateY(${PASSPORT_OFFSETS[i % PASSPORT_OFFSETS.length]}px)` }}>
            <MiniPolaroid {...show} />
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { id: 0, title: 'Find your crew.', desc: 'Spin up a group for any show, invite your friends, and coordinate the meetup spot effortlessly. Never go alone again.', Visual: GroupAndChatVisual },
  { id: 1, title: 'Prove you were there.', desc: 'Hit check-in when you arrive. Our GPS engine confirms your exact location. No screenshots, no faking it. Pure authenticity.', Visual: MapToPolaroidVisual },
  { id: 2, title: 'Collect every show.', desc: 'Each verified check-in drops an exclusive polaroid into your passport. Build a permanent timeline of your history in the scene.', Visual: HorizontalPolaroidsVisual },
] as const;

const PHASES = [
  { tab: 0, ck: 0, duration: 4000 },
  { tab: 1, ck: 0, duration: 2500 },
  { tab: 1, ck: 1, duration: 2500 },
  { tab: 1, ck: 2, duration: 3200 },
  { tab: 2, ck: 0, duration: 4500 },
] as const;

export default function WhyAndFeatures() {
  const [activeTab, setActiveTab] = useState(0);
  const [ck, setCk] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const { tab, ck: nextCk, duration } = PHASES[phase];
    setActiveTab(tab);
    setCk(nextCk);
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), duration);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <section id="features" style={{ background: '#0B0B0B', color: '#F4F2EC', padding: 'clamp(80px, 10vw, 140px) clamp(20px, 5vw, 40px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(56px, 8vw, 88px)' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(244,242,236,0.5)' }}>What you get</span>
          <h2 style={{ margin: '16px 0 0', fontWeight: 900, fontSize: 'clamp(40px, 6vw, 76px)', lineHeight: 0.95, letterSpacing: '-0.04em' }}>
            Built for people<br />who live for live.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map((feat) => {
              const isActive = activeTab === feat.id;
              return (
                <div
                  key={feat.id}
                  onClick={() => { const idx = PHASES.findIndex((p) => p.tab === feat.id); setPhase(idx >= 0 ? idx : 0); }}
                  style={{ cursor: 'pointer', padding: '32px 32px', borderRadius: 24, background: isActive ? 'rgba(244,242,236,0.04)' : 'transparent', border: '1px solid', borderColor: isActive ? 'rgba(244,242,236,0.1)' : 'transparent', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isActive ? 16 : 0, transition: 'margin 0.3s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999, background: isActive ? '#F4F2EC' : 'rgba(244,242,236,0.1)', color: isActive ? '#0B0B0B' : 'rgba(244,242,236,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, transition: 'all 0.3s' }}>
                      {feat.id + 1}
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 32px)', letterSpacing: '-0.02em', color: isActive ? '#F4F2EC' : 'rgba(244,242,236,0.4)', transition: 'color 0.3s' }}>
                      {feat.title}
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateRows: isActive ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, paddingLeft: 48, fontSize: 16, lineHeight: 1.6, color: 'rgba(244,242,236,0.7)', paddingBottom: 8 }}>{feat.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#121214', border: '1px solid rgba(244,242,236,0.08)', borderRadius: 32, height: 'clamp(460px, 46vw, 560px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', borderRadius: '50%', background: activeTab === 0 ? 'rgba(59,130,246,0.06)' : activeTab === 1 ? 'rgba(236,72,153,0.06)' : 'rgba(244,242,236,0.04)', filter: 'blur(80px)', transition: 'background 0.5s ease' }} />
            {FEATURES.map((feat) => {
              const isActive = activeTab === feat.id;
              const Visual = feat.Visual;
              return (
                <div key={feat.id} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: isActive ? 'auto' : 'none' }}>
                  {isActive && <Visual ck={ck} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
