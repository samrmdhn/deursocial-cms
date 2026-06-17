import NavBar from '@/components/landing/NavBar';
import Footer from '@/components/landing/Footer';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By accessing or using deursocial, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the app.' },
  { title: '2. About deursocial', body: 'deursocial is a social platform for discovering and connecting with others around concerts, events, and live entertainment in Indonesia. Users can join groups, share posts and moments, follow events, and chat with other attendees.' },
  { title: '3. User Accounts', body: 'You must register with accurate information and keep your credentials secure. You are responsible for all activity under your account. Accounts found to be impersonating others or providing false information may be suspended.' },
  { title: '4. User Content', body: 'You retain ownership of content you post (photos, captions, comments). By posting, you grant deursocial a non-exclusive license to display and distribute your content within the app. You must not post content that is illegal, offensive, sexually explicit, or violates third-party rights.' },
  { title: '5. Community Rules', body: 'Users must treat others respectfully. Harassment, hate speech, spam, and doxxing are strictly prohibited. Violating community rules may result in content removal or account suspension without notice.' },
  { title: '6. Groups & Events', body: 'Groups are created around specific events. Group admins are responsible for maintaining a safe environment within their group. deursocial reserves the right to remove groups or posts that violate these terms.' },
  { title: '7. Privacy', body: 'We collect information you provide during registration and usage (name, email, gender, profile photo, location for shared location features). This data is used to operate and improve the app. We do not sell your personal data to third parties. Location data is only shared when you explicitly use the location sharing feature in chat.' },
  { title: '8. Moments & Posts', body: 'Moments and posts shared within event groups are visible to all members of that group. Do not share content you do not have the right to post. Reported content will be reviewed and may be removed.' },
  { title: '9. Prohibited Activities', body: 'You may not use deursocial to distribute malware, scrape data, reverse-engineer the app, conduct unauthorized advertising, or engage in any activity that disrupts the service or harms other users.' },
  { title: '10. Intellectual Property', body: 'All trademarks, logos, and app design are the property of deursocial. You may not reproduce or use them without written permission.' },
  { title: '11. Limitation of Liability', body: 'deursocial is provided as-is. We are not liable for any loss or damage arising from your use of the app, including but not limited to missed events, incorrect event information, or disputes between users.' },
  { title: '12. Changes to Terms', body: 'We may update these terms at any time. Continued use of the app after changes means you accept the updated terms. We will notify users of significant changes through the app.' },
  { title: '13. Contact', body: 'For questions or concerns about these terms, contact us at support@deursocial.com.' },
];

export default function TermsConditionPage() {
  return (
    <div style={{ background: '#0B0B0B', color: '#F4F2EC', minHeight: '100vh', fontFamily: 'NimbusSan, sans-serif' }}>
      <NavBar />
      <main style={{ maxWidth: 740, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 40px) 80px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,242,236,0.4)', marginBottom: 16 }}>Legal</p>
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Terms and Conditions</h1>
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
