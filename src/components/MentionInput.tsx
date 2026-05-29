import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface MentionUser {
  username: string;
  display_name: string;
  image: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
}

const SUPABASE_PROFILE_IMAGES = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/`;

function resolveAvatar(photo: string | null): string | null {
  if (!photo) return null;
  if (photo.startsWith('http')) return photo;
  return `${SUPABASE_PROFILE_IMAGES}${photo.replace(/^\//, '')}`;
}

export default function MentionInput({ value, onChange, placeholder, rows = 4, style }: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (q: string) => {
    if (!q) { setSuggestions([]); return; }
    try {
      const res = await api.get('/search/people', { params: { search_text: q, page: 1 } });
      const users: MentionUser[] = (res.data?.data ?? []).map((u: any) => ({
        username: u.username,
        display_name: u.display_name,
        image: u.image ?? u.photo ?? null,
      }));
      setSuggestions(users.slice(0, 6));
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    onChange(text);

    // detect @ trigger
    const before = text.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionStart(cursor - match[0].length);
      const q = match[1];
      setMentionQuery(q);
      setSelectedIndex(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchUsers(q), 250);
    } else {
      setMentionStart(null);
      setSuggestions([]);
    }
  };

  const insertMention = (user: MentionUser) => {
    if (mentionStart === null) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart ?? value.length);
    // Store as @[Display Name](username) — readable format, MentionText renders it
    const mention = `@[${user.display_name}](${user.username})`;
    const newValue = `${before}${mention} ${after}`;
    onChange(newValue);
    setSuggestions([]);
    setMentionStart(null);
    // restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && suggestions.length) { e.preventDefault(); insertMention(suggestions[selectedIndex]); }
    if (e.key === 'Escape') { setSuggestions([]); setMentionStart(null); }
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const baseStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: '#080808',
    border: '1px solid #1e1e1e', borderRadius: 5, color: '#e0e0e0',
    fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box',
    ...style,
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={baseStyle}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
          background: '#111', border: '1px solid #222', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)', marginBottom: 4, overflow: 'hidden',
        }}>
          {suggestions.map((u, i) => {
            const avatar = resolveAvatar(u.image);
            return (
              <button
                key={u.username}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', background: i === selectedIndex ? '#1a1a1a' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {avatar
                  ? <img src={avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555' }}>{u.display_name[0]}</div>
                }
                <div>
                  <div style={{ fontSize: 12, color: '#d0d0d0', fontWeight: 500 }}>{u.display_name}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>@{u.username}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
