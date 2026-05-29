import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>('admin');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/login', { username: email, password });
      if (res.data.error === 1) { toast.error(res.data.message || 'Login failed'); return; }
      const token = res.data.data?.access_token;
      if (!token) { toast.error('Invalid response from server'); return; }

      const meRes = await api.get('/api/cms/me', { headers: { Authorization: `Bearer ${token}` } });
      if (meRes.data.error === 1) { toast.error('You do not have CMS access'); return; }
      const me = meRes.data.data;
      const role: UserRole = me.role;
      if (activeTab !== role) {
        toast.error(`This account is for ${role === 'admin' ? 'Admin' : 'Event Organizer'} access`);
        return;
      }
      login({ id: me.id, username: me.username, display_name: me.display_name, photo: me.photo, role, eo_id: me.eo_id ?? undefined }, token);
      toast.success(`Welcome, ${me.display_name || 'User'}!`);
      navigate({ to: role === 'admin' ? '/admin' : '/eo' });
    } catch (err) {
      console.error(err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: '#060606',
    border: '1px solid #161616', borderRadius: 4, color: '#c0c0c0',
    fontSize: 12, outline: 'none', transition: 'border-color .15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="ds-fade">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 9, letterSpacing: '4px', color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>
            Content Management System
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '3px', color: '#d8d8d8' }}>
            DEURSOCIAL
          </h1>
        </div>

        {/* Card */}
        <div style={{ background: '#0a0a0a', border: '1px solid #181818', borderRadius: 6, padding: '28px 30px' }}>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: 1, background: '#060606', border: '1px solid #141414', borderRadius: 4, padding: 3, marginBottom: 26 }}>
            {(['admin', 'eo'] as UserRole[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 3, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 500,
                  background: activeTab === t ? '#161616' : 'transparent',
                  color: activeTab === t ? '#d8d8d8' : '#555',
                  transition: 'all .15s',
                }}
              >
                {t === 'admin' ? 'Admin' : 'Organizer'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'admin' ? 'admin' : 'eo_username'}
                style={inp}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  style={{ ...inp, paddingRight: 38 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#282828', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6, padding: '10px 20px',
                background: loading ? '#0d0d0d' : '#ffffff',
                border: loading ? '1px solid #141414' : '1px solid transparent',
                borderRadius: 4, color: loading ? '#2e2e2e' : '#000000',
                fontSize: 11, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'all .15s', width: '100%',
              }}
            >
              {loading
                ? <div style={{ width: 13, height: 13, border: '2px solid #222', borderTopColor: '#555', borderRadius: '50%' }} className="ds-spin" />
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#383838', fontSize: 10, marginTop: 22 }}>
          © {new Date().getFullYear()} DEURSOCIAL
        </p>
      </div>
    </div>
  );
}
