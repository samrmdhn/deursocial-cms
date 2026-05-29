import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Flag, MessageSquare, X, Send } from 'lucide-react';

const th: React.CSSProperties = { padding: '9px 18px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none', resize: 'none' };

export default function AdminReports() {
  const [selectedReport, setSelectedReport] = useState<{
    id: number; description: string; type: number; users_id: number; source_id: number; reports_id: number;
    user_name?: string; user_username?: string; report_title?: string;
  } | null>(null);
  const [feedback, setFeedback] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const { data: reportedUsers } = await supabase
        .from('ir_reported_users')
        .select('id, description, type, users_id, source_id, reports_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reportedUsers || reportedUsers.length === 0) return [];

      const userIds = [...new Set(reportedUsers.map((r) => r.users_id))];
      const { data: users } = await supabase.from('ir_users').select('id, display_name, username').in('id', userIds);
      const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

      const reportIds = [...new Set(reportedUsers.map((r) => r.reports_id))];
      const { data: reportTypes } = await supabase.from('ir_reports').select('id, title').in('id', reportIds);
      const reportMap = Object.fromEntries((reportTypes || []).map((r) => [r.id, r.title]));

      return reportedUsers.map((r) => ({
        ...r,
        user_name: userMap[r.users_id]?.display_name || '-',
        user_username: userMap[r.users_id]?.username || '-',
        report_title: reportMap[r.reports_id] || '-',
      }));
    },
  });

  const formatDate = (epoch: number) =>
    new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Reports</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{reports?.length ?? 0} reports</p>
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                {['Reporter', 'Reason', 'Type', 'Description', 'Date', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '48px 18px', textAlign: 'center' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
                </td></tr>
              ) : reports?.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#333' }}>No reports</td></tr>
              ) : reports?.map((report, i) => (
                <tr key={report.id} style={{ borderBottom: i < reports.length - 1 ? '1px solid #0f0f0f' : 'none' }}>
                  <td style={{ padding: '10px 18px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0' }}>{report.user_name}</div>
                    <div style={{ fontSize: 10, color: '#484848' }}>@{report.user_username}</div>
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#1e0e00', color: '#e08040', border: '1px solid #2e1800' }}>
                      <Flag size={9} />
                      {report.report_title}
                    </span>
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555' }}>
                    {report.type === 1 ? 'Post/Moment' : 'Comment'}
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#555', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {report.description || '—'}
                  </td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: '#484848', whiteSpace: 'nowrap' }}>
                    {report.created_at ? formatDate(report.created_at) : '—'}
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    <button onClick={() => { setSelectedReport(report); setFeedback(''); }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }} title="Review">
                      <MessageSquare size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>Review Report</span>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}><X size={14} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#555', width: 80, flexShrink: 0 }}>Reporter</span>
                  <span style={{ color: '#c0c0c0' }}>{selectedReport.user_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#555', width: 80, flexShrink: 0 }}>Reason</span>
                  <span style={{ color: '#c0c0c0' }}>{selectedReport.report_title}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#555', width: 80, flexShrink: 0 }}>Type</span>
                  <span style={{ color: '#c0c0c0' }}>{selectedReport.type === 1 ? 'Post/Moment' : 'Comment'}</span>
                </div>
                {selectedReport.description && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#555', width: 80, flexShrink: 0 }}>Description</span>
                    <span style={{ color: '#c0c0c0' }}>{selectedReport.description}</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>Admin Feedback</label>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Write feedback..." style={inp} />
              </div>
              <button
                onClick={() => { toast.success('Feedback submitted'); setSelectedReport(null); setFeedback(''); }}
                style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Send size={12} /> Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
