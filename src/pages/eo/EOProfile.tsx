import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Save, Users, AtSign, Camera, BadgeCheck } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';

const IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };

export default function EOProfile() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: eoInfo } = useQuery({
    queryKey: ['eo', 'profile', eoId],
    queryFn: async () => {
      if (!eoId) return null;
      const { data } = await supabase.from('ir_event_organizers').select('*').eq('id', eoId).single();
      return data;
    },
    enabled: !!eoId,
  });

  const { data: userInfo } = useQuery({
    queryKey: ['eo', 'user-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('ir_users').select('id, username, display_name').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: followerCount } = useQuery({
    queryKey: ['eo', 'followers', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase.from('ir_following_users').select('*', { count: 'exact', head: true }).eq('users_id', user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');

  if (eoInfo && !name) setName(eoInfo.name || '');
  if (eoInfo && !detail) setDetail(eoInfo.detail || '');

  const resolveImage = (img: string | null) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${IMG_BASE}${img}`;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eoId) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImageToBucket(file, 'post-images', 'eo-profiles');
      if (!url) throw new Error('Upload failed');
      // Extract relative path from full URL
      const path = url.includes('/post-images/') ? url.split('/post-images/')[1] : url;
      const { error } = await supabase.from('ir_event_organizers').update({ image: path, updated_at: Math.floor(Date.now() / 1000) }).eq('id', eoId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['eo', 'profile'] });
      toast.success('Photo updated');
    } catch {
      toast.error('Failed to update photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!eoId || !user?.id) return;
      const { error } = await supabase.from('ir_event_organizers').update({ name, detail, updated_at: Math.floor(Date.now() / 1000) }).eq('id', eoId);
      if (error) throw error;
      // sync display_name on ir_users too
      await supabase.from('ir_users').update({ display_name: name }).eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo', 'profile'] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed'),
  });

  const avatarUrl = resolveImage(eoInfo?.image ?? null);

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 560 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>EO Profile</h1>
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
        {/* Profile header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar with change button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', border: '1px solid #1e1e1e' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 6, background: '#0e0e0e', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#444' }}>
                {eoInfo?.name?.charAt(0)?.toUpperCase() || 'E'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{ position: 'absolute', bottom: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '2px solid #0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              {uploadingPhoto
                ? <div style={{ width: 10, height: 10, border: '1.5px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                : <Camera size={10} color="#000" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d8' }}>{eoInfo?.name || 'EO'}</div>
              {eoInfo?.is_partner === 1 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>
                  <BadgeCheck size={13} /> Official Partner
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#484848' }}>
                <AtSign size={11} /> {userInfo?.username || '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#484848' }}>
                <Users size={11} /> {followerCount} followers
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>EO Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>
              Username <span style={{ color: '#333', fontSize: 10 }}>(cannot be changed here)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#333', fontSize: 12, pointerEvents: 'none' }}>@</span>
              <input value={userInfo?.username || ''} readOnly
                style={{ ...inp, paddingLeft: 26, color: '#444', cursor: 'not-allowed', background: '#060606' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>Description</label>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4}
              style={{ ...inp, resize: 'none' }} />
          </div>
          <button type="submit" disabled={updateMutation.isPending}
            style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: updateMutation.isPending ? 0.5 : 1 }}>
            <Save size={12} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
