import { useState } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import logoImg from '@/assets/logo.png';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  Flag,
  Megaphone,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PartyPopper,
  FileText,
  Image,
  MessageSquare,
  UserCircle,
  Star,
  ListMusic,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  children?: { label: string; to: string }[];
  badge?: number;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={15} /> },
  {
    label: 'Events',
    icon: <Calendar size={15} />,
    children: [
      { label: 'All Events', to: '/admin/events' },
      { label: 'Lineups', to: '/admin/lineups' },
      { label: 'Featured Ads', to: '/admin/featured-ads' },
      { label: 'EO Ads', to: '/admin/ads' },
    ],
  },
  {
    label: 'Management',
    icon: <Users size={15} />,
    children: [
      { label: 'Users', to: '/admin/users' },
      { label: 'EO Accounts', to: '/admin/eo-accounts' },
      { label: 'Venues', to: '/admin/venues' },
    ],
  },
  {
    label: 'Content',
    icon: <Image size={15} />,
    children: [
      { label: 'Moments', to: '/admin/moments' },
      { label: 'Posts', to: '/admin/posts' },
    ],
  },
  {
    label: 'Analytics',
    icon: <TrendingUp size={15} />,
    children: [
      { label: 'Trending', to: '/admin/trending' },
      { label: 'Reports', to: '/admin/reports' },
    ],
  },
  {
    label: 'Passport',
    icon: <Star size={15} />,
    children: [
      { label: 'Cosmetics', to: '/admin/passport-cosmetics' },
      { label: 'Badges', to: '/admin/badges' },
    ],
  },
];

const eoNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/eo', icon: <LayoutDashboard size={15} /> },
  {
    label: 'My Events',
    icon: <Calendar size={15} />,
    children: [
      { label: 'Events', to: '/eo/events' },
      { label: 'Create Event', to: '/eo/events/create' },
      { label: 'Analytics', to: '/eo/analytics' },
    ],
  },
  {
    label: 'Content',
    icon: <Image size={15} />,
    children: [
      { label: 'Posts', to: '/eo/posts' },
      { label: 'Moments', to: '/eo/moments' },
      { label: 'Blast Messages', to: '/eo/blast' },
    ],
  },
  {
    label: 'Ads',
    icon: <Megaphone size={15} />,
    children: [
      { label: 'My Ads', to: '/eo/ads' },
    ],
  },
  {
    label: 'Account',
    icon: <UserCircle size={15} />,
    children: [
      { label: 'Profile', to: '/eo/profile' },
    ],
  },
];

const S = {
  sidebar: (collapsed: boolean): React.CSSProperties => ({
    width: collapsed ? 56 : 230,
    minWidth: collapsed ? 56 : 230,
    height: '100vh',
    background: '#000',
    borderRight: '1px solid #111',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width .2s ease, min-width .2s ease',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
  }),
};

export default function CMSLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const navItems = user?.role === 'admin' ? adminNavItems : eoNavItems;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const isActive = (to?: string) => {
    if (!to) return false;
    if (to === '/admin' || to === '/eo') return currentPath === to;
    return currentPath.startsWith(to);
  };

  const isGroupActive = (item: NavItem) => {
    if (item.to && isActive(item.to)) return true;
    if (item.children) return item.children.some((c) => isActive(c.to));
    return false;
  };

  const toggleExpand = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#050505' }}>
      {/* Sidebar */}
      <aside style={S.sidebar(isCollapsed)}>
        {/* Logo */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: isCollapsed ? '0 14px' : '0 16px',
          borderBottom: '1px solid #111', flexShrink: 0,
        }}>
          {!isCollapsed && (
            <img src={logoImg} alt="Deursocial" style={{ height: 28, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <button
            onClick={toggleSidebar}
            style={{
              background: 'none', border: 'none', color: '#444', cursor: 'pointer',
              padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, marginLeft: isCollapsed ? 'auto' : 0, marginRight: isCollapsed ? 'auto' : 0,
            }}
            className="ds-icon-btn-sidebar"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Role chip */}
        <div style={{
          padding: isCollapsed ? '10px 0' : '8px 12px 4px',
          display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
            background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 3,
            fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
            color: '#444', whiteSpace: 'nowrap',
          }}>
            {isCollapsed ? (user?.role === 'admin' ? 'A' : 'EO') : (user?.role === 'admin' ? 'Admin' : 'Organizer')}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map((item) => {
            const hasChildren = !!item.children;
            const groupActive = isGroupActive(item);
            const isExpanded = expandedMenus[item.label] ?? groupActive;

            if (!hasChildren) {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to!}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: isCollapsed ? '9px 0' : '8px 10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: active ? '#111' : 'transparent',
                    borderLeft: active ? '2px solid #ccc' : '2px solid transparent',
                    borderRadius: active ? '0 4px 4px 0' : 4,
                    color: active ? '#e8e8e8' : '#555',
                    fontSize: 12, fontWeight: active ? 500 : 400,
                    textDecoration: 'none', transition: 'all .12s',
                    border: 'none',
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                  {!isCollapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>}
                </Link>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => { if (!isCollapsed) toggleExpand(item.label); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: isCollapsed ? '9px 0' : '8px 10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: groupActive ? '#0d0d0d' : 'transparent',
                    borderLeft: groupActive ? '2px solid #333' : '2px solid transparent',
                    borderRadius: groupActive ? '0 4px 4px 0' : 4,
                    color: groupActive ? '#aaa' : '#555',
                    cursor: 'pointer', fontSize: 12, fontWeight: groupActive ? 500 : 400,
                    border: 'none', textAlign: 'left', transition: 'all .12s',
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                      <span style={{ color: '#333', display: 'flex' }}>
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                    </>
                  )}
                </button>

                {hasChildren && isExpanded && !isCollapsed && (
                  <div style={{ marginTop: 1, marginBottom: 2, marginLeft: 12, paddingLeft: 16, borderLeft: '1px solid #161616', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {item.children!.map((child) => {
                      const childActive = isActive(child.to);
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          style={{
                            display: 'block', padding: '6px 10px', borderRadius: 4,
                            fontSize: 11, fontWeight: childActive ? 500 : 400,
                            color: childActive ? '#d8d8d8' : '#484848',
                            background: childActive ? '#111' : 'transparent',
                            textDecoration: 'none', transition: 'all .1s',
                            borderLeft: childActive ? '2px solid #888' : '2px solid transparent',
                          }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #111', flexShrink: 0 }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', marginBottom: 3 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: '#111',
                border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#555', flexShrink: 0,
              }}>
                {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.display_name}
                </div>
                <div style={{ fontSize: 10, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{user?.username}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '7px 10px',
              background: 'none', border: 'none', color: '#3a3a3a', cursor: 'pointer',
              fontSize: 11, borderRadius: 4, transition: 'all .1s',
            }}
          >
            <LogOut size={14} />
            {!isCollapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#050505', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
