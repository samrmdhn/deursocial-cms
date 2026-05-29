import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Upload, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 12, outline: 'none' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 };

export default function EOBlast() {
  const user = useAuthStore((s) => s.user);
  const eoId = user?.eo_id;

  const [selectedEvent, setSelectedEvent] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [blastType, setBlastType] = useState<'text' | 'image' | 'both'>('text');
  const [messageCategory, setMessageCategory] = useState<'ads' | 'statement'>('statement');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const { data: events } = useQuery({
    queryKey: ['eo', 'events-for-blast', eoId],
    queryFn: async () => {
      if (!eoId) return [];
      const { data } = await supabase.from('ir_content_details').select('id, title, slug').eq('event_organizers_id', eoId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!eoId,
  });

  const { data: groups } = useQuery({
    queryKey: ['eo', 'event-groups', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data } = await supabase.from('ir_groups').select('id, title, slug, max_members').eq('content_details_id', Number(selectedEvent)).eq('status', 1);
      return data || [];
    },
    enabled: !!selectedEvent,
  });

  const blastMutation = useMutation({
    mutationFn: async () => {
      if (!groups || groups.length === 0) throw new Error('No groups');
      if (!user?.id) throw new Error('Not logged in');
      const now = Math.floor(Date.now() / 1000);
      const { data: eoData } = await supabase.from('ir_event_organizers').select('name, image').eq('id', eoId).single();
      const eoName = eoData?.name || 'Official Organizer';
      const eoImage = eoData?.image || null;

      let finalImageUrl = null;
      if (imageFile && (blastType === 'image' || blastType === 'both')) {
        const uploadedUrl = await uploadImageToBucket(imageFile, 'post-images', 'blasts');
        if (!uploadedUrl) throw new Error('Failed to upload image');
        finalImageUrl = uploadedUrl;
      }

      const { error } = await supabase.from('ir_blast_messages').insert({
        eo_id: eoId,
        group_ids: groups.map(g => g.id),
        content: (blastType === 'text' || blastType === 'both') ? message : null,
        image_url: finalImageUrl,
        created_at: now,
      });
      if (error) throw error;

      const chatMessages = groups.map(g => ({
        group_slug: g.slug,
        user_id: `eo_${eoId}`,
        display_name: eoName,
        user_image: eoImage,
        username: messageCategory === 'ads' ? 'eo_official_ad' : 'eo_official_statement',
        message: (blastType === 'text' || blastType === 'both') ? message : '📸 Image',
        message_type: finalImageUrl ? 'image' : 'text',
        image_url: finalImageUrl,
      }));
      const { error: chatError } = await supabase.from('messages').insert(chatMessages);
      if (chatError) console.error('Failed to insert into group chats:', chatError);
    },
    onSuccess: () => {
      toast.success(`Blast sent to ${groups?.length} groups!`);
      setMessage('');
      removeImage();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to send blast.');
    },
  });

  const canSend = !!selectedEvent && (blastType === 'image' ? !!imageFile : !!message.trim()) && !blastMutation.isPending;

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 560 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Blast Messages</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Send promotional messages to event chat groups</p>
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Event */}
        <div>
          <label style={lbl}>Select Event</label>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} style={inp}>
            <option value="">Select event…</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {/* Groups info */}
        {selectedEvent && (
          <div style={{ background: '#060606', border: '1px solid #141414', borderRadius: 5, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
              <MessageSquare size={12} style={{ color: '#555' }} />
              {groups?.length || 0} groups will receive this blast
            </div>
            {groups && groups.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {groups.map((g) => (
                  <span key={g.id} style={{ fontSize: 10, padding: '3px 8px', background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 3, color: '#888' }}>{g.title}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category */}
        <div>
          <label style={lbl}>Blast Category</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['statement', 'ads'] as const).map((cat) => (
              <button key={cat} type="button" onClick={() => setMessageCategory(cat)}
                style={{ flex: 1, padding: '8px', borderRadius: 5, border: `1px solid ${messageCategory === cat ? '#333' : '#1e1e1e'}`, cursor: 'pointer', background: messageCategory === cat ? '#111' : '#080808', color: messageCategory === cat ? '#d0d0d0' : '#555', fontSize: 11, fontWeight: 500 }}>
                {cat === 'statement' ? 'Official Statement' : 'Advertisement'}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label style={lbl}>Message Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { key: 'text', label: 'Text Only' },
              { key: 'image', label: 'Image Only' },
              { key: 'both', label: 'Image + Text' },
            ] as const).map((t) => (
              <button key={t.key} type="button" onClick={() => setBlastType(t.key)}
                style={{ flex: 1, padding: '8px', borderRadius: 5, border: `1px solid ${blastType === t.key ? '#333' : '#1e1e1e'}`, cursor: 'pointer', background: blastType === t.key ? '#111' : '#080808', color: blastType === t.key ? '#d0d0d0' : '#555', fontSize: 11, fontWeight: 500 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image upload */}
        {(blastType === 'image' || blastType === 'both') && (
          <div>
            <label style={lbl}>Attach Image</label>
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={removeImage}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 70, background: '#080808', border: '1px dashed #1e1e1e', borderRadius: 5, cursor: 'pointer', gap: 5 }}>
                <Upload size={15} style={{ color: '#444' }} />
                <span style={{ fontSize: 11, color: '#444' }}>Click to upload image</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>
            )}
          </div>
        )}

        {/* Message */}
        {(blastType === 'text' || blastType === 'both') && (
          <div>
            <label style={lbl}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your blast message…" rows={4}
              style={{ ...inp, resize: 'none' }} />
          </div>
        )}

        <button onClick={() => blastMutation.mutate()} disabled={!canSend}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: canSend ? '#fff' : '#0d0d0d', border: 'none', borderRadius: 5, color: canSend ? '#000' : '#333', fontSize: 12, fontWeight: 600, cursor: canSend ? 'pointer' : 'default' }}>
          {blastMutation.isPending
            ? <><div style={{ width: 14, height: 14, border: '2px solid #444', borderTopColor: '#888', borderRadius: '50%' }} className="ds-spin" /> Sending…</>
            : <><Send size={13} /> Send Blast to {groups?.length || 0} Groups</>
          }
        </button>
      </div>
    </div>
  );
}
