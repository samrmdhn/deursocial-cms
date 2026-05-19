import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload } from 'lucide-react';

interface BgAsset {
  id: number;
  name: string;
  preview_url: string;
  asset_url: string;
  is_premium: boolean;
  price_idr: number;
  type: 'static' | 'gif';
}

interface NewAsset {
  name: string;
  is_premium: boolean;
  price_idr: number;
}

export default function AdminBackgrounds() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<NewAsset>({ name: '', is_premium: false, price_idr: 0 });
  const [uploading, setUploading] = useState(false);

  const { data: assets } = useQuery<BgAsset[]>({
    queryKey: ['backgrounds'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_background_assets').select('*').order('id');
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_background_assets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backgrounds'] }); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Auto-detect type from extension
    const ext = f.name.split('.').pop()?.toLowerCase();
    // Store detected type in form context (passed to upload)
  };

  const handleUpload = async () => {
    if (!file || !form.name.trim()) {
      toast.error('Name and file required');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType: 'static' | 'gif' = ext === 'gif' ? 'gif' : 'static';
      const path = `backgrounds/${Date.now()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from('post-images')
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
      const assetUrl = urlData.publicUrl;

      const { error: insertErr } = await supabase.from('ir_background_assets').insert({
        name: form.name.trim(),
        preview_url: assetUrl,
        asset_url: assetUrl,
        is_premium: form.is_premium,
        price_idr: form.is_premium ? form.price_idr : 0,
        type: fileType,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (insertErr) throw insertErr;

      toast.success('Background added');
      qc.invalidateQueries({ queryKey: ['backgrounds'] });
      setFile(null);
      setPreview(null);
      setForm({ name: '', is_premium: false, price_idr: 0 });
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        Background Assets
      </h1>

      {/* Upload form */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-4">
        <p className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Plus size={15} /> Add Background</p>

        <div className="grid grid-cols-1 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Background name"
            className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setForm((f) => ({ ...f, is_premium: !f.is_premium }))}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.is_premium ? 'bg-violet-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.is_premium ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300">Premium</span>
            </label>
            {form.is_premium && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Rp</span>
                <input
                  type="number"
                  value={form.price_idr}
                  onChange={(e) => setForm({ ...form, price_idr: Number(e.target.value) })}
                  className="w-28 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  min={0}
                />
              </div>
            )}
          </div>

          {/* File upload */}
          {preview ? (
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700/50">
                {file?.name.endsWith('.gif') ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-300">{file?.name}</p>
                <p className="text-xs text-slate-500">{file?.name.endsWith('.gif') ? 'GIF (animated)' : 'Static image'}</p>
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="text-xs text-red-400 mt-1">Remove</button>
              </div>
            </div>
          ) : (
            <label className="flex items-center gap-2 w-full h-12 px-3 bg-slate-900/50 border border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <Upload size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">Upload JPG, PNG or GIF</span>
              <input type="file" accept="image/*,.gif" className="hidden" onChange={handleFileChange} />
            </label>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file || !form.name.trim()}
            className="py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Add Background'}
          </button>
        </div>
      </div>

      {/* Asset list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(assets ?? []).map((a) => (
          <div key={a.id} className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/50 group relative">
            <div className="w-full h-32 bg-slate-900">
              <img src={a.asset_url} alt={a.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-white truncate">{a.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${a.is_premium ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>
                  {a.is_premium ? `Rp ${a.price_idr.toLocaleString('id-ID')}` : 'Free'}
                </span>
                <span className="text-xs text-slate-500">{a.type.toUpperCase()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(a.id)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {(assets ?? []).length === 0 && (
        <p className="text-slate-500 text-sm text-center py-12">No backgrounds yet. Add the first one above.</p>
      )}
    </div>
  );
}
