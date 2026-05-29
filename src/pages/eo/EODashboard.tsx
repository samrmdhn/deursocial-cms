import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Calendar } from 'lucide-react';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;

export default function EODashboard() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const { data: eventCount } = useQuery({
    queryKey: ['eo', 'event-count', eoId],
    queryFn: async () => {
      if (!eoId) return 0;
      const { count } = await supabase.from('ir_content_details').select('*', { count: 'exact', head: true }).eq('event_organizers_id', eoId);
      return count || 0;
    },
    enabled: !!eoId,
  });

  const { data: eoInfo } = useQuery({
    queryKey: ['eo', 'info', eoId],
    queryFn: async () => {
      if (!eoId) return null;
      const { data } = await supabase.from('ir_event_organizers').select('*').eq('id', eoId).single();
      return data;
    },
    enabled: !!eoId,
  });

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>
          {eoInfo?.name || user?.display_name || 'Dashboard'}
        </h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Event Organizer</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#444' }}>My Events</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1, color: '#ececec' }}>{eventCount ?? '…'}</div>
        </div>
      </div>

      {eoInfo && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #111' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444' }}>EO Profile</span>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {eoInfo.image ? (
              <img src={`${IMG_BASE}${eoInfo.image}`} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', border: '1px solid #1e1e1e' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 6, background: '#0e0e0e', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#444' }}>
                {eoInfo.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d8' }}>{eoInfo.name}</div>
              {eoInfo.detail && <div style={{ fontSize: 11, color: '#555', marginTop: 3, maxWidth: 380 }}>{eoInfo.detail}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
