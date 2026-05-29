import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload } from 'lucide-react';

interface BgAsset { id: number; name: string; preview_url: string; asset_url: string; is_premium: boolean; price_idr: number; type: 'static' | 'gif'; }
interface NewAsset { name: string; is_premium: boolean; price_idr: number; }

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };

export default function AdminBackgrounds() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<NewAsset>({ name: '', is_premium: false, price_idr: 0 });
  const [uploading, setUploading] = useState(false);

  const { data: assets } = useQuery<BgAsset[]>({
    queryKey: ['backgrounds'],
    queryFn: async () => { const { data } = await supabase.from('ir_background_assets').select('*').order('id'); return data ?? []; },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('ir_background_assets').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backgrounds'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !form.name.trim()) { toast.error('Name and file required'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType: 'static' | 'gif' = ext === 'gif' ? 'gif' : 'static';
      const path = `backgrounds/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
      const assetUrl = urlData.publicUrl;
      const { error: insertErr } = await supabase.from('ir_background_assets').insert({
        name: form.name.trim(), preview_url: assetUrl, asset_url: assetUrl,
        is_premium: form.is_premium, price_idr: form.is_premium ? form.price_idr : 0,
        type: fileType, created_at: Math.floor(Date.now() / 1000),
      });
      if (insertErr) throw insertErr;
      toast.success('Background added');
      qc.invalidateQueries({ queryKey: ['backgrounds'] });
      setFile(null); setPreview(null);
      setForm({ name: '', is_premium: false, price_idr: 0 });
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Background Assets</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{(assets ?? []).length} backgrounds</p>
      </div>

      {/* Upload form */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 20, marginBottom: 20, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#444', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={11} /> Add Background
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>Background Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Background name" style={inp} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setForm((f) => ({ ...f, is_premium: !f.is_premium }))}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: form.is_premium ? '#e0e0e0' : '#1e1e1e', position: 'relative', transition: 'background 0.15s', border: '1px solid #333' }}>
              <div style={{ position: 'absolute', top: 2, left: form.is_premium ? 18 : 2, width: 14, height: 14, background: form.is_premium ? '#000' : '#555', borderRadius: '50%', transition: 'left 0.15s' }} />
            </div>
            <span style={{ fontSize: 11, color: '#888' }}>Premium</span>
          </div>
          {form.is_premium && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#555' }}>Rp</span>
              <input type="number" value={form.price_idr} onChange={(e) => setForm({ ...form, price_idr: Number(e.target.value) })}
                style={{ ...inp, width: 100 }} min={0} />
            </div>
          )}
        </div>
        {preview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#c0c0c0' }}>{file?.name}</div>
              <div style={{ fontSize: 10, color: '#555' }}>{file?.name.endsWith('.gif') ? 'GIF (animated)' : 'Static image'}</div>
              <button type="button" onClick={() => { setFile(null); setPreview(null); }}
                style={{ fontSize: 10, color: '#cc4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Remove</button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 40, background: '#080808', border: '1px dashed #1e1e1e', borderRadius: 5, cursor: 'pointer', color: '#444', fontSize: 11, paddingLeft: 12 }}>
            <Upload size={13} /> Upload JPG, PNG or GIF
            <input type="file" accept="image/*,.gif" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
        )}
        <button type="button" onClick={handleUpload} disabled={uploading || !file || !form.name.trim()}
          style={{ padding: '10px', background: (uploading || !file || !form.name.trim()) ? '#0d0d0d' : '#fff', border: 'none', borderRadius: 5, color: (uploading || !file || !form.name.trim()) ? '#333' : '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (uploading || !file || !form.name.trim()) ? 0.5 : 1 }}>
          {uploading ? 'Uploading…' : 'Add Background'}
        </button>
      </div>

      {/* Asset grid */}
      {(assets ?? []).length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: 12, color: '#333' }}>No backgrounds yet. Add the first one above.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {(assets ?? []).map((a) => (
            <div key={a.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <img src={a.asset_url} alt={a.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', background: '#080808' }} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#d0d0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: a.is_premium ? '#1a1400' : '#0e0e0e', color: a.is_premium ? '#b08020' : '#555', letterSpacing: '0.5px' }}>
                    {a.is_premium ? `Rp ${a.price_idr.toLocaleString('id-ID')}` : 'FREE'}
                  </span>
                  <span style={{ fontSize: 9, color: '#484848', letterSpacing: '0.5px' }}>{a.type.toUpperCase()}</span>
                </div>
              </div>
              <button type="button" onClick={() => deleteMutation.mutate(a.id)}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 3, color: '#cc4444', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
