import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';

import CMSLayout from '@/layouts/CMSLayout';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEvents from '@/pages/admin/AdminEvents';
import AdminCreateEvent from '@/pages/admin/AdminCreateEvent';
import AdminEditEvent from '@/pages/admin/AdminEditEvent';
import AdminEventDetail from '@/pages/admin/AdminEventDetail';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';
import AdminEOAccounts from '@/pages/admin/AdminEOAccounts';
import AdminVenues from '@/pages/admin/AdminVenues';
import AdminLineups from '@/pages/admin/AdminLineups';
import AdminReports from '@/pages/admin/AdminReports';
import AdminFeaturedAds from '@/pages/admin/AdminFeaturedAds';
import AdminTrending from '@/pages/admin/AdminTrending';
import EODashboard from '@/pages/eo/EODashboard';
import EOEvents from '@/pages/eo/EOEvents';
import EOCreateEvent from '@/pages/eo/EOCreateEvent';
import EOEditEvent from '@/pages/eo/EOEditEvent';
import EOProfile from '@/pages/eo/EOProfile';
import EOMoments from '@/pages/eo/EOMoments';
import EOPosts from '@/pages/eo/EOPosts';
import EOBlast from '@/pages/eo/EOBlast';
import EOAnalytics from '@/pages/eo/EOAnalytics';

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
});

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user) {
      throw redirect({ to: user.role === 'admin' ? '/admin' : '/eo' });
    }
  },
});

// Index redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
    throw redirect({ to: user?.role === 'admin' ? '/admin' : '/eo' });
  },
  component: () => null,
});

// ── Admin routes ──
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: CMSLayout,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/login' });
    if (user?.role !== 'admin') throw redirect({ to: '/eo' });
  },
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/',
  component: AdminDashboard,
});

const adminEventsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/events',
  component: AdminEvents,
});

const adminCreateEventRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/events/create',
  component: AdminCreateEvent,
});

const adminEventDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/events/$eventId',
  component: AdminEventDetail,
});

const adminEditEventRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/events/$eventId/edit',
  component: AdminEditEvent,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users',
  component: AdminUsers,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users/$userId',
  component: AdminUserDetail,
});

const adminEOAccountsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/eo-accounts',
  component: AdminEOAccounts,
});

const adminVenuesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/venues',
  component: AdminVenues,
});

const adminLineupsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/lineups',
  component: AdminLineups,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/reports',
  component: AdminReports,
});

const adminFeaturedAdsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/featured-ads',
  component: AdminFeaturedAds,
});

const adminTrendingRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/trending',
  component: AdminTrending,
});

// ── EO routes ──
const eoLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/eo',
  component: CMSLayout,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/login' });
    if (user?.role !== 'eo') throw redirect({ to: '/admin' });
  },
});

const eoDashboardRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/',
  component: EODashboard,
});

const eoEventsRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/events',
  component: EOEvents,
});

const eoCreateEventRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/events/create',
  component: EOCreateEvent,
});

const eoEditEventRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/events/$eventId/edit',
  component: EOEditEvent,
});

const eoProfileRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/profile',
  component: EOProfile,
});

const eoMomentsRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/moments',
  component: EOMoments,
});

const eoPostsRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/posts',
  component: EOPosts,
});

const eoBlastRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/blast',
  component: EOBlast,
});

const eoAnalyticsRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/analytics',
  component: EOAnalytics,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminEventsRoute,
    adminCreateEventRoute,
    adminEventDetailRoute,
    adminEditEventRoute,
    adminUsersRoute,
    adminUserDetailRoute,
    adminEOAccountsRoute,
    adminVenuesRoute,
    adminLineupsRoute,
    adminReportsRoute,
    adminFeaturedAdsRoute,
    adminTrendingRoute,
  ]),
  eoLayoutRoute.addChildren([
    eoDashboardRoute,
    eoEventsRoute,
    eoCreateEventRoute,
    eoEditEventRoute,
    eoProfileRoute,
    eoMomentsRoute,
    eoPostsRoute,
    eoBlastRoute,
    eoAnalyticsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
