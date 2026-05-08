import { useState } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
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
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={20} /> },
  { 
    label: 'Analytics', 
    icon: <TrendingUp size={20} />, 
    children: [
      { label: 'Trending', to: '/admin/trending' },
      { label: 'Reports', to: '/admin/reports' },
    ]
  },
  { 
    label: 'Management', 
    icon: <Users size={20} />, 
    children: [
      { label: 'Users', to: '/admin/users' },
      { label: 'EO Accounts', to: '/admin/eo-accounts' },
      { label: 'Venues', to: '/admin/venues' },
    ]
  },
  { 
    label: 'Events', 
    icon: <Calendar size={20} />, 
    children: [
      { label: 'All Events', to: '/admin/events' },
      { label: 'Lineups', to: '/admin/lineups' },
      { label: 'Featured Ads', to: '/admin/featured-ads' },
    ]
  },
];

const eoNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/eo', icon: <LayoutDashboard size={20} /> },
  { 
    label: 'Events', 
    icon: <Calendar size={20} />, 
    children: [
      { label: 'My Events', to: '/eo/events' },
      { label: 'Create Event', to: '/eo/events/create' },
      { label: 'Analytics', to: '/eo/analytics' },
    ]
  },
  { 
    label: 'Content', 
    icon: <Image size={20} />, 
    children: [
      { label: 'Official Posts', to: '/eo/posts' },
      { label: 'Moments', to: '/eo/moments' },
      { label: 'Blast Messages', to: '/eo/blast' },
    ]
  },
  { 
    label: 'Account', 
    icon: <UserCircle size={20} />, 
    children: [
      { label: 'Profile', to: '/eo/profile' },
    ]
  },
];

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
    if (to === '/admin' || to === '/eo') {
      return currentPath === to;
    }
    return currentPath.startsWith(to);
  };

  const isGroupActive = (item: NavItem) => {
    if (item.to && isActive(item.to)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.to));
    }
    return false;
  };

  const toggleExpand = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800/60 z-40 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/60">
          {!isCollapsed && (
            <h1 className="text-xl font-black tracking-tight text-white">
              DEUR<span className="text-indigo-500">SOCIAL</span>
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-4">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                user?.role === 'admin'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'bg-violet-500/10 text-violet-400'
              }`}
            >
              {user?.role === 'admin' ? (
                <>
                  {!isCollapsed && <Megaphone size={12} className="mr-1.5" />}
                  {isCollapsed ? 'A' : 'ADMIN'}
                </>
              ) : (
                <>
                  {!isCollapsed && <PartyPopper size={12} className="mr-1.5" />}
                  {isCollapsed ? 'EO' : 'ORGANIZER'}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const hasChildren = !!item.children;
            const active = isGroupActive(item);
            const isExpanded = expandedMenus[item.label] ?? active;

            return (
              <div key={item.label} className="mb-1">
                {hasChildren ? (
                  <button
                    onClick={() => {
                      if (!isCollapsed) {
                        toggleExpand(item.label);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      active 
                        ? 'text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className={active ? 'text-indigo-400' : ''}>{item.icon}</span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="text-slate-500">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    )}
                  </button>
                ) : (
                  <Link
                    to={item.to!}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className={active ? 'text-white' : ''}>{item.icon}</span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Submenu */}
                {hasChildren && isExpanded && !isCollapsed && (
                  <div className="mt-1 mb-2 ml-4 pl-4 border-l border-slate-800 space-y-1">
                    {item.children!.map(child => {
                      const childActive = isActive(child.to);
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            childActive
                              ? 'bg-slate-800 text-white font-medium'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
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

        {/* User Info & Logout */}
        <div className="border-t border-slate-800/60 p-4">
          {!isCollapsed && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold border border-slate-700">
                {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {user?.display_name}
                </p>
                <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? 'ml-[72px]' : 'ml-64'
        }`}
      >
        <div className="min-h-screen bg-slate-950 text-slate-300">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
