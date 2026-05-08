import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Image as ImageIcon, Upload, X } from 'lucide-react';
import { uploadImageToBucket } from '@/lib/upload';

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
      const { data } = await supabase
        .from('ir_content_details')
        .select('id, title, slug')
        .eq('event_organizers_id', eoId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!eoId,
  });

  const { data: groups } = useQuery({
    queryKey: ['eo', 'event-groups', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data } = await supabase
        .from('ir_groups')
        .select('id, title, slug, max_members')
        .eq('content_details_id', Number(selectedEvent))
        .eq('status', 1);
      return data || [];
    },
    enabled: !!selectedEvent,
  });

  const blastMutation = useMutation({
    mutationFn: async () => {
      if (!groups || groups.length === 0) throw new Error('No groups');
      if (!user?.id) throw new Error('Not logged in');
      const now = Math.floor(Date.now() / 1000);

      // Fetch EO details for the chat message avatar and name
      const { data: eoData } = await supabase
        .from('ir_event_organizers')
        .select('name, image')
        .eq('id', eoId)
        .single();
      const eoName = eoData?.name || "Official Organizer";
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

      // ALSO insert into chat group `messages` table so it shows up in the chat history!
      // Using `eo_blast_` prefix in username to flag it as an official blast in the mobile app UI
      const chatMessages = groups.map(g => ({
        group_slug: g.slug,
        user_id: `eo_${eoId}`,
        display_name: eoName,
        user_image: eoImage,
        username: messageCategory === 'ads' ? "eo_official_ad" : "eo_official_statement",
        message: (blastType === 'text' || blastType === 'both') ? message : "📸 Image",
        message_type: finalImageUrl ? "image" : "text",
        image_url: finalImageUrl
      }));
      
      const { error: chatError } = await supabase.from('messages').insert(chatMessages);
      if (chatError) console.error("Failed to insert into group chats:", chatError);
    },
    onSuccess: () => {
      toast.success(`Blast sent to ${groups?.length} groups!`);
      setMessage('');
      removeImage();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to send blast. Check if messages table exists.');
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Blast Messages</h1>
        <p className="text-slate-400 mt-1">Send promotional messages to event chat groups</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 space-y-5">
        {/* Event Selection */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Select Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">Select event...</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {/* Groups Info */}
        {selectedEvent && (
          <div className="bg-slate-800/30 rounded-xl p-4">
            <p className="text-sm text-slate-300">
              <MessageSquare size={14} className="inline mr-1.5 text-violet-400" />
              {groups?.length || 0} groups will receive this blast
            </p>
            {groups && groups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.map((g) => (
                  <span key={g.id} className="text-xs px-2 py-1 bg-slate-700/50 rounded-lg text-slate-300">
                    {g.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Message Category */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Blast Category</label>
          <div className="flex gap-3">
            {(['statement', 'ads'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setMessageCategory(cat)}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  messageCategory === cat
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                {cat === 'statement' ? 'Official Statement' : 'Advertisement'}
              </button>
            ))}
          </div>
        </div>

        {/* Blast Type */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Message Type</label>
          <div className="flex gap-3">
            {([
              { key: 'text', label: 'Text Only' },
              { key: 'image', label: 'Image Only' },
              { key: 'both', label: 'Image + Text' },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setBlastType(t.key)}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  blastType === t.key
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        {(blastType === 'image' || blastType === 'both') && (
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Attach Image</label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-700/50">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-800/50 border border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                <Upload className="text-slate-400 mb-2" size={20} />
                <span className="text-sm text-slate-400">Click to upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        )}

        {/* Message */}
        {(blastType === 'text' || blastType === 'both') && (
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your blast message..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 h-28 resize-none"
            />
          </div>
        )}

        {/* Send */}
        <button
          onClick={() => blastMutation.mutate()}
          disabled={!selectedEvent || (!message && !imageFile) || blastMutation.isPending}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {blastMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              Send Blast to {groups?.length || 0} Groups
            </>
          )}
        </button>
      </div>
    </div>
  );
}
