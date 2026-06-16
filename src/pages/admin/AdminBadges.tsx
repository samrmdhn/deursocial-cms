import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Award, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';

interface Badge {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: number;
}

interface NewBadge { slug: string; name: string; description: string; }

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: '#080808', border: '1px solid #1e1e1e',
  borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none',
};

const STORAGE_BUCKET = 'post-images';

export default function AdminBadges() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<NewBadge>({ slug: '', name: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const { data: badges } = useQuery<Badge[]>({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ir_badges').select('*').order('id');
      if (error) throw error;
      return data ?? [];
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      const { error } = await supabase.from('ir_badges').update({
        name: name.trim(),
        description: description.trim() || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-badges'] }); setEditingId(null); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ir_badges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-badges'] }); toast.success('Badge deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { error } = await supabase.from('ir_badges').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-badges'] }); },
    onError: () => toast.error('Failed to update'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleCreate = async () => {
    if (!form.slug.trim() || !form.name.trim()) { toast.error('Slug and name are required'); return; }
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const path = `badges/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from('ir_badges').insert({
        slug: form.slug.toLowerCase().trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: imageUrl,
        is_active: true,
        created_at: Math.floor(Date.now() / 1000),
      });
      if (error) {
        if (error.code === '23505') { toast.error('Slug already exists'); return; }
        throw error;
      }
      toast.success('Badge created');
      qc.invalidateQueries({ queryKey: ['admin-badges'] });
      setForm({ slug: '', name: '', description: '' });
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Award size={16} style={{ color: '#888' }} />
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ccc', letterSpacing: '-0.2px' }}>Badge Catalog</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#444' }}>{badges?.length ?? 0} badge{badges?.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Create form */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444' }}>
            New Badge
          </div>

          {/* Image upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#444' }}>Icon / Image</div>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 120, border: '1px dashed #222', borderRadius: 6,
              cursor: 'pointer', overflow: 'hidden', background: '#060606',
            }}>
              {preview
                ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#333' }}>
                    <Upload size={20} />
                    <span style={{ fontSize: 10 }}>Upload image</span>
                  </div>
              }
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#444' }}>Slug</label>
            <input style={inp} placeholder="e.g. open_beta" value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#444' }}>Name</label>
            <input style={inp} placeholder="e.g. Open Beta" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#444' }}>Description</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
              placeholder="Optional description…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <button
            onClick={handleCreate}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
              background: uploading ? '#111' : '#1a2a1a', color: uploading ? '#333' : '#22c55e',
              fontSize: 11, fontWeight: 600,
            }}
          >
            <Plus size={13} /> {uploading ? 'Creating…' : 'Create Badge'}
          </button>
        </div>

        {/* Badge list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!badges?.length && (
            <div style={{ color: '#333', fontSize: 12, padding: '32px 0', textAlign: 'center' }}>No badges yet.</div>
          )}
          {badges?.map(badge => (
            <div key={badge.id} style={{
              background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Image */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                  background: '#111', border: '1px solid #1e1e1e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {badge.image_url
                    ? <img src={badge.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <Award size={20} style={{ color: '#333' }} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#d8d8d8' }}>{badge.name}</span>
                    <span style={{ fontSize: 10, color: '#333', background: '#111', border: '1px solid #1e1e1e', borderRadius: 3, padding: '1px 6px' }}>
                      {badge.slug}
                    </span>
                  </div>
                  {badge.description && (
                    <div style={{ fontSize: 11, color: '#484848', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {badge.description}
                    </div>
                  )}
                </div>

                {/* Edit button */}
                <button
                  onClick={() => { setEditingId(badge.id); setEditForm({ name: badge.name, description: badge.description ?? '' }); }}
                  title="Edit"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', display: 'flex', padding: 4 }}
                >
                  <Pencil size={13} />
                </button>

                {/* Active toggle */}
                <button
                  onClick={() => toggleMutation.mutate({ id: badge.id, is_active: !badge.is_active })}
                  title={badge.is_active ? 'Deactivate' : 'Activate'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: badge.is_active ? '#22c55e' : '#333', display: 'flex' }}
                >
                  {badge.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>

                <button
                  onClick={() => { if (confirm(`Delete "${badge.name}"?`)) deleteMutation.mutate(badge.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', display: 'flex', padding: 4 }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Inline edit form */}
              {editingId === badge.id && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    style={inp}
                    placeholder="Name"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <textarea
                    style={{ ...inp, resize: 'vertical', minHeight: 52, fontFamily: 'inherit' }}
                    placeholder="Description (optional)"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => editMutation.mutate({ id: badge.id, name: editForm.name, description: editForm.description })}
                      disabled={!editForm.name.trim() || editMutation.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#1a2a1a', color: '#22c55e', fontSize: 11, fontWeight: 600 }}
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 4, border: '1px solid #222', cursor: 'pointer', background: 'none', color: '#555', fontSize: 11 }}
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
