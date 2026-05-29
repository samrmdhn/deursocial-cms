import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, GripVertical } from 'lucide-react';

type CosmeticType = 'accent_color' | 'strip_pattern' | 'frame_style' | 'sticker_theme';

interface Cosmetic {
  id: number;
  type: CosmeticType;
  key: string;
  label: string;
  preview_color: string | null;
  preview_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
}

const TYPES: { value: CosmeticType; label: string }[] = [
  { value: 'accent_color',  label: 'Accent Color' },
  { value: 'strip_pattern', label: 'Strip Pattern' },
  { value: 'frame_style',   label: 'Frame Style' },
  { value: 'sticker_theme', label: 'Sticker Theme' },
];

const th: React.CSSProperties = { padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const inp: React.CSSProperties = { padding: '8px 10px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };

export default function AdminPassportCosmetics() {
  const qc = useQueryClient();
  const [activeType, setActiveType] = useState<CosmeticType>('accent_color');
  const [form, setForm] = useState({ key: '', label: '', preview_color: '', is_premium: false });
  const [adding, setAdding] = useState(false);

  const { data: rows = [], isLoading } = useQuery<Cosmetic[]>({
    queryKey: ['passport-cosmetics', activeType],
    queryFn: async () => {
      const { data } = await supabase
        .from('ir_passport_cosmetics')
        .select('*')
        .eq('type', activeType)
        .order('sort_order');
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.key.trim() || !form.label.trim()) throw new Error('Key and label required');
      const maxOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) : 0;
      const { error } = await supabase.from('ir_passport_cosmetics').insert({
        type: activeType,
        key: form.key.trim(),
        label: form.label.trim(),
        preview_color: form.preview_color || null,
        is_premium: form.is_premium,
        is_active: true,
        sort_order: maxOrder + 1,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passport-cosmetics', activeType] });
      setForm({ key: '', label: '', preview_color: '', is_premium: false });
      setAdding(false);
      toast.success('Added');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: any }) => {
      const { error } = await supabase.from('ir_passport_cosmetics').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passport-cosmetics', activeType] }),
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_passport_cosmetics').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport-cosmetics', activeType] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed'),
  });

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Passport Cosmetics</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Manage card customization options shown in the app</p>
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 1, background: '#080808', border: '1px solid #1a1a1a', borderRadius: 4, padding: 2, marginBottom: 16, width: 'fit-content' }}>
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveType(value)}
            style={{ padding: '5px 14px', borderRadius: 3, border: 'none', cursor: 'pointer', background: activeType === value ? '#161616' : 'transparent', color: activeType === value ? '#d0d0d0' : '#444', fontSize: 11, fontWeight: 500 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #111' }}>
              <th style={th}>Key</th>
              <th style={th}>Label</th>
              {activeType === 'accent_color' && <th style={th}>Color</th>}
              <th style={th}>Premium</th>
              <th style={th}>Active</th>
              <th style={th}>Order</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center' }}>
                <div style={{ width: 16, height: 16, border: '2px solid #1a1a1a', borderTopColor: '#444', borderRadius: '50%', margin: '0 auto' }} className="ds-spin" />
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12, color: '#333' }}>No options yet</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #0f0f0f' : 'none', opacity: row.is_active ? 1 : 0.4 }}>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{row.key}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#d0d0d0' }}>{row.label}</td>
                {activeType === 'accent_color' && (
                  <td style={{ padding: '10px 14px' }}>
                    {row.preview_color
                      ? <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: row.preview_color, border: '1px solid rgba(255,255,255,0.1)' }} />
                      : <span style={{ fontSize: 10, color: '#333' }}>—</span>}
                  </td>
                )}
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => toggleMutation.mutate({ id: row.id, field: 'is_premium', value: !row.is_premium })}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid', cursor: 'pointer', background: 'none', borderColor: row.is_premium ? '#a07830' : '#222', color: row.is_premium ? '#a07830' : '#444' }}
                  >
                    {row.is_premium ? 'Premium' : 'Free'}
                  </button>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => toggleMutation.mutate({ id: row.id, field: 'is_active', value: !row.is_active })}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid', cursor: 'pointer', background: 'none', borderColor: row.is_active ? '#22c55e' : '#333', color: row.is_active ? '#22c55e' : '#444' }}
                  >
                    {row.is_active ? 'Active' : 'Hidden'}
                  </button>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#555' }}>{row.sort_order}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => { if (confirm(`Delete "${row.label}"?`)) deleteMutation.mutate(row.id); }}
                    style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      {adding ? (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.5px' }}>New {TYPES.find(t => t.value === activeType)?.label}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Key</span>
              <input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="e.g. #6366f1 or stripes" style={{ ...inp, width: 160 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Label</span>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Indigo" style={{ ...inp, width: 140 }} />
            </div>
            {activeType === 'accent_color' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Color</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                    <input type="color" value={form.preview_color || '#ffffff'} onChange={(e) => setForm((f) => ({ ...f, preview_color: e.target.value, key: e.target.value }))} style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>{form.preview_color || '—'}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#666', cursor: 'pointer', paddingBottom: 8 }}>
                <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm((f) => ({ ...f, is_premium: e.target.checked }))} />
                Premium
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} style={{ padding: '7px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {addMutation.isPending ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => setAdding(false)} style={{ padding: '7px 14px', background: 'none', border: '1px solid #1e1e1e', borderRadius: 5, color: '#555', fontSize: 11, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'none', border: '1px solid #1e1e1e', borderRadius: 5, color: '#555', fontSize: 11, cursor: 'pointer' }}>
          <Plus size={11} /> Add Option
        </button>
      )}
    </div>
  );
}
