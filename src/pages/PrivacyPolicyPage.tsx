import NavBar from '@/components/landing/NavBar';
import Footer from '@/components/landing/Footer';

const SECTIONS = [
  { title: 'Introduction', body: 'Deursocial ("we", "our", or "us") is a social platform for discovering and engaging with events. This Privacy Policy explains how we collect, use, and protect your personal information when you use our mobile application.' },
  { title: 'Information We Collect', body: '• Account Information: name, username, email address, profile photo, and gender when you register.\n\n• Profile Content: posts, moments, comments, and group activity you create on the platform.\n\n• Device Information: device type, operating system, and app version for technical support.\n\n• Usage Data: interactions with events, groups, and other users to personalise your feed.\n\n• Location Data: city-level location when you create or join a group (not precise GPS tracking).' },
  { title: 'How We Use Your Information', body: '• To provide and operate the Deursocial platform and its features.\n\n• To personalise your feed and recommend relevant events and groups.\n\n• To send notifications about activity related to your account.\n\n• To enforce community guidelines and maintain platform safety.\n\n• To improve the app based on aggregated, anonymised usage analytics.' },
  { title: 'Information Sharing', body: 'We do not sell your personal information to third parties.\n\n• Public profile information (username, display name, posts) is visible to other users.\n\n• Group membership and event follows are visible within the relevant communities.\n\n• We may share data with service providers (hosting, analytics) who are contractually bound to protect it.\n\n• We may disclose information if required by law or to protect the safety of users.' },
  { title: 'Data Retention', body: 'We retain your data for as long as your account is active. When you delete your account, your personal information is anonymised within 30 days. Content you created may remain in anonymised form for community integrity.' },
  { title: 'Your Rights', body: '• Access: request a copy of the personal data we hold about you.\n\n• Correction: update inaccurate information via your profile settings.\n\n• Deletion: delete your account at any time from Settings → Delete Account.\n\n• Objection: contact us to object to specific uses of your data.' },
  { title: 'Security', body: 'We use industry-standard measures including encrypted data transmission (HTTPS) and access controls to protect your information. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.' },
  { title: "Children's Privacy", body: 'Deursocial is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us.' },
  { title: 'Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or by email. Continued use of the app after changes constitutes acceptance of the updated policy.' },
  { title: 'Contact Us', body: 'If you have questions about this Privacy Policy or how we handle your data, please contact us:\n\nPhone: 0898-8887-229\nEmail: mindeursocial@gmail.com' },
];

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: '#0B0B0B', color: '#F4F2EC', minHeight: '100vh', fontFamily: 'NimbusSan, sans-serif' }}>
      <NavBar />
      <main style={{ maxWidth: 740, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 40px) 80px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,242,236,0.4)', marginBottom: 16 }}>Legal</p>
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Privacy &amp; Policy</h1>
        <p style={{ margin: '0 0 56px', fontSize: 14, color: 'rgba(244,242,236,0.35)' }}>Last updated: May 2025</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {SECTIONS.map((s) => (
            <div key={s.title} style={{ borderTop: '1px solid rgba(244,242,236,0.08)', paddingTop: 32 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.title}</h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: 'rgba(244,242,236,0.6)', whiteSpace: 'pre-line' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
