import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, ListMusic, ChevronDown, ChevronRight, Calendar, Eye, EyeOff } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PROFILE_IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images`;
const POST_IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/`;
const resolveEventImg = (img: string) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  if (img.startsWith('/images/') || img.startsWith('images/')) return `${PROFILE_IMG_BASE}/${img.replace(/^\//, '')}`;
  return `${POST_IMG_BASE}${img}`;
};
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#080808', border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0', fontSize: 13, outline: 'none' };

function formatDate(epoch: number | null) {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SortableEventRow({ event, isDraggable, lineupId }: { event: any; isDraggable?: boolean; lineupId: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id });
  const queryClient = useQueryClient();
  const listed = event.is_listed !== 0;

  const toggleMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: number }) => {
      const { error } = await supabase.from('ir_content_details')
        .update({ [field]: value })
        .eq('id', event.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'lineup-events', lineupId] }),
    onError: () => toast.error('Failed'),
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : (!listed ? 0.4 : 1), display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#080808', border: `1px solid ${!listed ? '#2a1e00' : '#141414'}`, borderRadius: 5 }}>
      {isDraggable && (
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#2a2a2a', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 12, height: 1.5, background: '#2a2a2a', borderRadius: 1 }} />)}
          </div>
        </div>
      )}
      {event.image ? (
        <img src={resolveEventImg(event.image)!} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 28, height: 28, borderRadius: 4, background: '#111', border: '1px solid #1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Calendar size={11} style={{ color: '#333' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: listed ? '#c0c0c0' : '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div style={{ fontSize: 10, color: '#555' }}>{formatDate(event.date_start)}</div>
      </div>
      <span style={{ fontSize: 10, color: event.status === 1 ? '#22c55e' : event.status === 0 ? '#555' : '#f59e0b', fontWeight: 600, flexShrink: 0 }}>
        {event.status === 1 ? 'Live' : event.status === 0 ? 'Ended' : 'Upcoming'}
      </span>
      <button
        onClick={() => toggleMutation.mutate({ field: 'is_listed', value: listed ? 0 : 1 })}
        title={listed ? 'Remove from lineup' : 'Add to lineup'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', color: listed ? '#555' : '#2a2a2a', flexShrink: 0 }}
      >
        {listed ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </div>
  );
}

function SortableLineupCard({ lineup, onEdit, onDelete, onToggleVisibility }: {
  lineup: { id: number; title: string; slug: string; position: number; is_visible?: number };
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lineup.id });
  const queryClient = useQueryClient();
  const visible = lineup.is_visible !== 0;

  const { data: events } = useQuery({
    queryKey: ['admin', 'lineup-events', lineup.id],
    queryFn: async () => {
      const { data } = await supabase.from('ir_content_details')
        .select('id, title, date_start, status, image, created_at, is_visible, is_listed')
        .eq('contents_id', lineup.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: expanded,
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const reorderEventMutation = useMutation({
    mutationFn: async ({ items }: { items: { id: number }[] }) => {
      const now = Math.floor(Date.now() / 1000);
      const updates = items.map((item, i) =>
        supabase.from('ir_content_details').update({ created_at: now + i, updated_at: now }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'lineup-events', lineup.id] }),
    onError: () => toast.error('Failed to reorder events'),
  });

  const handleEventDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !events) return;
    const oldIdx = events.findIndex((e) => e.id === active.id);
    const newIdx = events.findIndex((e) => e.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...events];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    reorderEventMutation.mutate({ items: reordered.map((e) => ({ id: e.id })) });
  };

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : (visible ? 1 : 0.45), background: '#0a0a0a', border: `1px solid ${visible ? '#1a1a1a' : '#111'}`, borderRadius: 6 }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#333', padding: '2px 4px', display: 'flex', alignItems: 'center', flexShrink: 0 }} title="Drag to reorder">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 2, background: '#333', borderRadius: 1 }} />)}
            </div>
          </div>
          <div style={{ width: 36, height: 36, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}>
            <ListMusic size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: visible ? '#d8d8d8' : '#444', lineHeight: 1.2 }}>{lineup.title}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>/{lineup.slug}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={onToggleVisibility} title={visible ? 'Hide lineup' : 'Show lineup'} style={{ background: 'none', border: 'none', color: visible ? '#555' : '#2a2a2a', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#4a1a1a', cursor: 'pointer', padding: '4px 5px', display: 'flex', borderRadius: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #111', padding: '10px 16px 12px 60px' }}>
          {!events ? (
            <div style={{ fontSize: 11, color: '#333', padding: '8px 0' }}>Loading…</div>
          ) : events.length === 0 ? (
            <div style={{ fontSize: 11, color: '#333', padding: '8px 0' }}>No events in this lineup</div>
          ) : (
            <>
              <div style={{ fontSize: 10, color: '#333', marginBottom: 6 }}>Drag to reorder events</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEventDragEnd}>
                <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {events.map((ev) => <SortableEventRow key={ev.id} event={ev} isDraggable lineupId={lineup.id} />)}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLineups() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: lineups, isLoading } = useQuery({
    queryKey: ['admin', 'lineups'],
    queryFn: async () => {
      const { data } = await supabase.from('ir_contents').select('id, title, slug, status, is_visible, created_at, updated_at').order('updated_at', { ascending: true, nullsFirst: true });
      return (data || []).map((l, i) => ({ ...l, position: i }));
    },
  });

  const toggleLineupVisibilityMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: number; is_visible: number }) => {
      const { error } = await supabase.from('ir_contents').update({ is_visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] }),
    onError: () => toast.error('Failed'),
  });

  const createMutation = useMutation({
    mutationFn: async (lineupTitle: string) => {
      const slug = lineupTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Date.now() / 1000);
      const now = Math.floor(Date.now() / 1000);
      const { error } = await supabase.from('ir_contents').insert({ title: lineupTitle, slug, status: 1, display_types_id: 1, created_at: now, updated_at: now });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] }); toast.success('Lineup created'); setShowModal(false); setTitle(''); },
    onError: () => toast.error('Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const { error } = await supabase.from('ir_contents').update({ title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] }); toast.success('Updated'); setEditItem(null); setShowModal(false); setTitle(''); },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('ir_contents').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed (check no events depend on it)'),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ items }: { items: { id: number }[] }) => {
      const now = Math.floor(Date.now() / 1000);
      // Write sequential updated_at values (1s apart) to preserve order
      const updates = items.map((item, i) =>
        supabase.from('ir_contents').update({ updated_at: now + i }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'lineups'] }),
    onError: () => toast.error('Failed to reorder'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !lineups) return;
    const oldIdx = lineups.findIndex((l) => l.id === active.id);
    const newIdx = lineups.findIndex((l) => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // Reorder array
    const reordered = [...lineups];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    reorderMutation.mutate({ items: reordered });
  };

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: '#ececec', letterSpacing: '-0.3px', lineHeight: 1 }}>Lineups</h1>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{lineups?.length ?? 0} lineups · drag to reorder</p>
        </div>
        <button onClick={() => { setEditItem(null); setTitle(''); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={12} /> Add Lineup
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#333', fontSize: 12 }}>Loading…</div>
      ) : lineups?.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#333', fontSize: 12 }}>No lineups yet</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lineups?.map((l) => l.id) || []} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lineups?.map((lineup) => (
                <SortableLineupCard
                  key={lineup.id}
                  lineup={lineup}
                  onEdit={() => { setEditItem({ id: lineup.id, title: lineup.title }); setTitle(lineup.title); setShowModal(true); }}
                  onDelete={() => { if (confirm('Delete this lineup?')) deleteMutation.mutate(lineup.id); }}
                  onToggleVisibility={() => toggleLineupVisibilityMutation.mutate({ id: lineup.id, is_visible: lineup.is_visible === 0 ? 1 : 0 })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} className="ds-fade">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0' }}>{editItem ? 'Edit Lineup' : 'Add Lineup'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editItem ? updateMutation.mutate({ id: editItem.id, title }) : createMutation.mutate(title); }}
              style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>Lineup Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={inp} required autoFocus />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#fff', border: 'none', borderRadius: 5, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {editItem ? 'Save Changes' : 'Create Lineup'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
