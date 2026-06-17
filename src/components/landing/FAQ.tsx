import { useState } from 'react';

const FAQ_DATA = [
  { q: 'What exactly is deursocial?', a: 'It\'s the ultimate companion app for concert-goers. Find groups for upcoming shows, coordinate meetups, check in to prove you were there, and build a permanent digital passport of every gig you attend.' },
  { q: 'How does the GPS check-in work?', a: 'When you arrive at a venue, open the app and scan the event QR code. We verify your GPS coordinates to ensure you are physically there. If you\'re not at the venue, it won\'t count.' },
  { q: 'Can I create my own groups?', a: 'Yes. Anyone can spin up a group for any upcoming show or festival. You can set it to public so anyone can join, or keep it invite-only for your existing crew.' },
  { q: 'What happens to my passport badges?', a: 'Every successful check-in drops a numbered, verifiable badge into your digital passport. They stay there forever as proof of your concert history, and you can show them off on your profile.' },
  { q: 'Is deursocial free to use?', a: 'Yes, the core app, groups, check-ins, and digital passport are entirely free for all concert fans.' },
];

export default function FAQ() {
  const [open, setOpen] = useState(-1);
  const toggle = (i: number) => setOpen((prev) => (prev === i ? -1 : i));

  return (
    <section id="faq" style={{ background: '#0B0B0B', color: '#F4F2EC' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(58px, 7vw, 110px) clamp(20px, 5vw, 56px)', width: '100%' }}>
        <div style={{ marginBottom: 'clamp(40px, 5vw, 64px)', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(244,242,236,0.5)' }}>Got questions?</span>
          <h2 style={{ margin: '16px 0 0', fontWeight: 900, fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 0.95, letterSpacing: '-0.04em' }}>
            Frequently Asked<br />Questions.
          </h2>
        </div>

        <div style={{ borderTop: '1px solid rgba(244,242,236,0.15)' }}>
          {FAQ_DATA.map((item, idx) => (
            <div key={idx} onClick={() => toggle(idx)} style={{ borderBottom: '1px solid rgba(244,242,236,0.15)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: 'clamp(20px, 2.4vw, 30px) 0' }}>
                <span style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', color: open === idx ? '#F4F2EC' : 'rgba(244,242,236,0.8)', transition: 'color 0.3s ease' }}>
                  {item.q}
                </span>
                <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(244,242,236,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300, lineHeight: 1, transform: open === idx ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease, background 0.3s ease', background: open === idx ? '#F4F2EC' : 'transparent', color: open === idx ? '#0B0B0B' : '#F4F2EC' }}>
                  +
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateRows: open === idx ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '0 0 clamp(22px, 2.6vw, 32px) 0', fontSize: 'clamp(16px, 1.5vw, 18px)', fontWeight: 400, lineHeight: 1.6, maxWidth: '70ch', color: 'rgba(244,242,236,0.6)' }}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
