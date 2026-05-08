import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Shield, PartyPopper } from 'lucide-react';

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
      // Use existing backend login endpoint
      const res = await api.post('/api/login', {
        username: email,
        password: password,
      });

      if (res.data.error === 1) {
        toast.error(res.data.message || 'Login failed');
        return;
      }

      const token = res.data.data?.access_token;
      if (!token) {
        toast.error('Invalid response from server');
        return;
      }

      // Decode JWT to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.tod;

      // Check user role from users_admin table via Supabase
      const { data: adminData } = await supabase
        .from('ir_users_admin')
        .select('id, roles_id, event_organizers_id, users_id')
        .eq('users_id', userId)
        .single();

      if (!adminData) {
        toast.error('You do not have CMS access');
        return;
      }

      // roles_id: 1 = admin, 2 = eo
      const role: UserRole = adminData.roles_id === 1 ? 'admin' : 'eo';

      if (activeTab !== role) {
        toast.error(`This account is for ${role === 'admin' ? 'Admin' : 'Event Organizer'} access`);
        return;
      }

      // Get user details
      const { data: userData } = await supabase
        .from('ir_users')
        .select('id, display_name, username, photo')
        .eq('id', userId)
        .single();

      login(
        {
          id: userId,
          username: userData?.username || '',
          display_name: userData?.display_name || '',
          photo: userData?.photo || null,
          role,
          eo_id: adminData.event_organizers_id || undefined,
        },
        token
      );

      toast.success(`Welcome, ${userData?.display_name || 'User'}!`);
      navigate({ to: role === 'admin' ? '/admin' : '/eo' });
    } catch (err: unknown) {
      console.error(err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            DeurSocial
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Content Management System</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-indigo-500/5 p-8">
          {/* Role Tabs */}
          <div className="flex rounded-xl bg-slate-800/50 p-1 mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield size={16} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('eo')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeTab === 'eo'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PartyPopper size={16} />
              Event Organizer
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {activeTab === 'admin' ? 'Email or Username' : 'Username'}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'admin' ? 'admin@deursocial.com' : 'eo_username'}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25'
                  : 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In as {activeTab === 'admin' ? 'Admin' : 'Event Organizer'}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} DeurSocial. All rights reserved.
        </p>
      </div>
    </div>
  );
}
