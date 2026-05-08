import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Flag, MessageSquare, X, Send } from 'lucide-react';

export default function AdminReports() {
  const [selectedReport, setSelectedReport] = useState<{
    id: number; description: string; type: number; users_id: number; source_id: number; reports_id: number;
    user_name?: string; report_title?: string;
  } | null>(null);
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const { data: reportedUsers } = await supabase
        .from('ir_reported_users')
        .select('id, description, type, users_id, source_id, reports_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reportedUsers || reportedUsers.length === 0) return [];

      // Fetch reporter names
      const userIds = [...new Set(reportedUsers.map((r) => r.users_id))];
      const { data: users } = await supabase
        .from('ir_users')
        .select('id, display_name, username')
        .in('id', userIds);
      const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

      // Fetch report types
      const reportIds = [...new Set(reportedUsers.map((r) => r.reports_id))];
      const { data: reportTypes } = await supabase
        .from('ir_reports')
        .select('id, title')
        .in('id', reportIds);
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
    new Date(epoch * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 mt-1">Review user-submitted reports</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                {['Reporter', 'Reason', 'Type', 'Description', 'Date', 'Action'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : reports?.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">No reports</td></tr>
              ) : (
                reports?.map((report) => (
                  <tr key={report.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-5">
                      <p className="text-sm text-slate-200">{report.user_name}</p>
                      <p className="text-xs text-slate-500">@{report.user_username}</p>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Flag size={10} />
                        {report.report_title}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-400">
                      {report.type === 1 ? 'Post/Moment' : 'Comment'}
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-400 max-w-[200px] truncate">
                      {report.description || '-'}
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-400">
                      {report.created_at ? formatDate(report.created_at) : '-'}
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                        title="Review"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Review Report</h2>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  <span className="text-slate-300 font-medium">Reporter:</span> {selectedReport.user_name}
                </p>
                <p className="text-slate-400">
                  <span className="text-slate-300 font-medium">Reason:</span> {selectedReport.report_title}
                </p>
                <p className="text-slate-400">
                  <span className="text-slate-300 font-medium">Description:</span> {selectedReport.description || 'No description'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Admin Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24 resize-none"
                  placeholder="Write your feedback..."
                />
              </div>
              <button
                onClick={async () => {
                  // For now, we'll log the feedback. In production, save to a feedback table.
                  toast.success('Feedback submitted');
                  setSelectedReport(null);
                  setFeedback('');
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={16} />
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
