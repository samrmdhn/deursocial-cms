import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Globe, Upload, X } from 'lucide-react';

export interface EventFormData {
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  schedule_start: string;
  schedule_end: string;
  vanues_id: string;
  contents_id: string;
  instagram_url: string;
  website_url: string;
  status: number;
  event_organizers_id?: string;
}

interface EventFormProps {
  form: EventFormData;
  onChange: (form: EventFormData) => void;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  showEOSelector?: boolean;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#080808',
  border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 13, outline: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6,
};

export default function EventForm({ form, onChange, imagePreview, onImageChange, onImageRemove, showEOSelector }: EventFormProps) {
  const set = (patch: Partial<EventFormData>) => onChange({ ...form, ...patch });

  const { data: venues } = useQuery({
    queryKey: ['venues-select'],
    queryFn: async () => { const { data } = await supabase.from('ir_vanues').select('id, title').order('title'); return data || []; },
  });
  const { data: contents } = useQuery({
    queryKey: ['contents-select'],
    queryFn: async () => { const { data } = await supabase.from('ir_contents').select('id, title').eq('status', 1).order('title'); return data || []; },
  });
  const { data: eos } = useQuery({
    queryKey: ['eos-select'],
    queryFn: async () => { const { data } = await supabase.from('ir_event_organizers').select('id, name').order('name'); return data || []; },
    enabled: !!showEOSelector,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={lbl}>Event Name</label>
        <input value={form.title} onChange={(e) => set({ title: e.target.value })} style={inp} required />
      </div>

      <div>
        <label style={lbl}>Description</label>
        <textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
          rows={4} style={{ ...inp, resize: 'none' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Start Date</label>
          <input type="date" value={form.date_start} onChange={(e) => set({ date_start: e.target.value })} style={inp} required />
        </div>
        <div>
          <label style={lbl}>End Date</label>
          <input type="date" value={form.date_end} onChange={(e) => set({ date_end: e.target.value })} style={inp} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Start Time</label>
          <input type="time" value={form.schedule_start} onChange={(e) => set({ schedule_start: e.target.value })} style={inp} />
        </div>
        <div>
          <label style={lbl}>End Time</label>
          <input type="time" value={form.schedule_end} onChange={(e) => set({ schedule_end: e.target.value })} style={inp} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Venue</label>
          <select value={form.vanues_id} onChange={(e) => set({ vanues_id: e.target.value })} style={inp} required>
            <option value="">Select venue…</option>
            {venues?.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Lineup</label>
          <select value={form.contents_id} onChange={(e) => set({ contents_id: e.target.value })} style={inp} required>
            <option value="">Select lineup…</option>
            {contents?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      {showEOSelector && (
        <div>
          <label style={lbl}>Event Organizer</label>
          <select value={form.event_organizers_id || ''} onChange={(e) => set({ event_organizers_id: e.target.value })} style={inp} required>
            <option value="">Select EO…</option>
            {eos?.map((eo) => <option key={eo.id} value={eo.id}>{eo.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label style={lbl}>Status</label>
        <select value={form.status} onChange={(e) => set({ status: Number(e.target.value) })} style={inp}>
          <option value={2}>Upcoming</option>
          <option value={1}>Ongoing</option>
          <option value={0}>Ended</option>
        </select>
        <p style={{ fontSize: 10, color: '#444', marginTop: 4 }}>Cron otomatis update status berdasarkan tanggal event.</p>
      </div>

      <div>
        <label style={lbl}>Event Image</label>
        {imagePreview ? (
          <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <button type="button" onClick={onImageRemove}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, color: '#ccc', cursor: 'pointer', padding: '5px', display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 100, background: '#080808', border: '1px dashed #1e1e1e', borderRadius: 5, cursor: 'pointer', color: '#666', gap: 6, fontSize: 11 }}>
            <Upload size={18} /> Click to upload image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageChange} />
          </label>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ ...lbl, marginBottom: 0 }}>Social Media</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#666', fontWeight: 600 }}>@</span>
          <input value={form.instagram_url} onChange={(e) => set({ instagram_url: e.target.value })}
            placeholder="Instagram handle or URL" style={{ ...inp, paddingLeft: 24 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Globe size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
          <input value={form.website_url} onChange={(e) => set({ website_url: e.target.value })}
            placeholder="Website URL" style={{ ...inp, paddingLeft: 26 }} />
        </div>
      </div>
    </div>
  );
}
