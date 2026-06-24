import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';

import CMSLayout from '@/layouts/CMSLayout';
import LoginPage from '@/pages/LoginPage';
import LandingPage from '@/pages/LandingPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsConditionPage from '@/pages/TermsConditionPage';
import DeepLinkRedirect from '@/components/DeepLinkRedirect';

// ── Deeplink wrapper components ──
function EventDeepLink() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}`} />;
}
function EventPostDeepLink() {
  const { slug, postSlug } = useParams({ strict: false }) as { slug: string; postSlug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}/posts/${postSlug}`} />;
}
function EventMomentDeepLink() {
  const { slug, momentSlug } = useParams({ strict: false }) as { slug: string; momentSlug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}/moments/${momentSlug}`} />;
}
function GroupDeepLink() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <DeepLinkRedirect deepLink={`deursocial://group/${slug}`} />;
}
function OrganizerDeepLink() {
  const { id } = useParams({ strict: false }) as { id: string };
  return <DeepLinkRedirect deepLink={`deursocial://organizer/${id}`} />;
}
function ProfileDeepLink() {
  const { username } = useParams({ strict: false }) as { username: string };
  const { passport } = useSearch({ strict: false }) as { passport?: string };
  const deepLink = `deursocial://profile/${username}${passport ? `?passport=${passport}` : ''}`;
  return <DeepLinkRedirect deepLink={deepLink} />;
}

// ── Share deeplink wrapper components (/s/* routes — not intercepted by universal links) ──
function EventShareDeepLink() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}?source=share`} />;
}
function EventPostShareDeepLink() {
  const { slug, postSlug } = useParams({ strict: false }) as { slug: string; postSlug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}/posts/${postSlug}?source=share`} />;
}
function EventMomentShareDeepLink() {
  const { slug, momentSlug } = useParams({ strict: false }) as { slug: string; momentSlug: string };
  return <DeepLinkRedirect deepLink={`deursocial://event/${slug}/moments/${momentSlug}?source=share`} />;
}
function GroupShareDeepLink() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <DeepLinkRedirect deepLink={`deursocial://group/${slug}?source=share`} />;
}
function OrganizerShareDeepLink() {
  const { id } = useParams({ strict: false }) as { id: string };
  return <DeepLinkRedirect deepLink={`deursocial://organizer/${id}?source=share`} />;
}
function ProfileShareDeepLink() {
  const { username } = useParams({ strict: false }) as { username: string };
  const { passport } = useSearch({ strict: false }) as { passport?: string };
  const deepLink = `deursocial://profile/${username}?source=share${passport ? `&passport=${passport}` : ''}`;
  return <DeepLinkRedirect deepLink={deepLink} />;
}
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
import AdminMoments from '@/pages/admin/AdminMoments';
import AdminPosts from '@/pages/admin/AdminPosts';
import EODashboard from '@/pages/eo/EODashboard';
import EOEvents from '@/pages/eo/EOEvents';
import EOCreateEvent from '@/pages/eo/EOCreateEvent';
import EOEditEvent from '@/pages/eo/EOEditEvent';
import EOProfile from '@/pages/eo/EOProfile';
import EOMoments from '@/pages/eo/EOMoments';
import EOPosts from '@/pages/eo/EOPosts';
import EOBlast from '@/pages/eo/EOBlast';
import EOAnalytics from '@/pages/eo/EOAnalytics';
import EOCheckinDashboard from '@/pages/eo/EOCheckinDashboard';
import EOPostDetail from '@/pages/eo/EOPostDetail';
import EOMomentDetail from '@/pages/eo/EOMomentDetail';
import AdminBackgrounds from '@/pages/admin/AdminBackgrounds';
import AdminBadges from '@/pages/admin/AdminBadges';
import AdminPassportCosmetics from '@/pages/admin/AdminPassportCosmetics';
import AdminAds from '@/pages/admin/AdminAds';
import EOAds from '@/pages/eo/EOAds';
import UserProfile from '@/pages/UserProfile';

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

// Index — landing page for public, dashboard redirect for authenticated users
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: user?.role === 'admin' ? '/admin' : '/eo' });
    }
  },
  component: LandingPage,
});

// ── Public routes ──
const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/event/$slug',
  component: EventDeepLink,
});

const eventPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/event/$slug/posts/$postSlug',
  component: EventPostDeepLink,
});

const eventMomentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/event/$slug/moments/$momentSlug',
  component: EventMomentDeepLink,
});

const groupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group/$slug',
  component: GroupDeepLink,
});

const organizerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organizer/$id',
  component: OrganizerDeepLink,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$username',
  validateSearch: (search: Record<string, unknown>) => ({
    passport: typeof search.passport === 'string' ? search.passport : undefined,
  }),
  component: ProfileDeepLink,
});

// ── Share routes (/s/* — excluded from universal links so CMS always handles them) ──
const eventShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/event/$slug',
  component: EventShareDeepLink,
});

const eventPostShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/event/$slug/posts/$postSlug',
  component: EventPostShareDeepLink,
});

const eventMomentShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/event/$slug/moments/$momentSlug',
  component: EventMomentShareDeepLink,
});

const groupShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/group/$slug',
  component: GroupShareDeepLink,
});

const organizerShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/organizer/$id',
  component: OrganizerShareDeepLink,
});

const profileShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/profile/$username',
  validateSearch: (search: Record<string, unknown>) => ({
    passport: typeof search.passport === 'string' ? search.passport : undefined,
  }),
  component: ProfileShareDeepLink,
});

const privacyPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy-policy',
  component: PrivacyPolicyPage,
});

const termsConditionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms-condition',
  component: TermsConditionPage,
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

const adminMomentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/moments',
  component: AdminMoments,
});

const adminPostsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/posts',
  component: AdminPosts,
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

const eoCheckinDashboardRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/events/$eventSlug/checkins',
  component: EOCheckinDashboard,
});

const eoPostDetailRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/posts/$slug',
  component: EOPostDetail,
});

const eoMomentDetailRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/moments/$slug',
  component: EOMomentDetail,
});

const adminBackgroundsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/backgrounds',
  component: AdminBackgrounds,
});

const adminAdsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/ads',
  component: AdminAds,
});

const adminPassportCosmeticsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/passport-cosmetics',
  component: AdminPassportCosmetics,
});

const adminBadgesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/badges',
  component: AdminBadges,
});

const eoAdsRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/ads',
  component: EOAds,
});

const adminUserProfileRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/user/$username',
  component: UserProfile,
});

const eoUserProfileRoute = createRoute({
  getParentRoute: () => eoLayoutRoute,
  path: '/user/$username',
  component: UserProfile,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  // Public deeplink + static routes
  eventRoute,
  eventPostRoute,
  eventMomentRoute,
  groupRoute,
  organizerRoute,
  profileRoute,
  privacyPolicyRoute,
  termsConditionRoute,
  // Share routes (/s/* — always go through CMS, never intercepted by universal links)
  eventShareRoute,
  eventPostShareRoute,
  eventMomentShareRoute,
  groupShareRoute,
  organizerShareRoute,
  profileShareRoute,
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
    adminMomentsRoute,
    adminPostsRoute,
    adminBackgroundsRoute,
    adminAdsRoute,
    adminPassportCosmeticsRoute,
    adminBadgesRoute,
    adminUserProfileRoute,
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
    eoCheckinDashboardRoute,
    eoPostDetailRoute,
    eoMomentDetailRoute,
    eoAdsRoute,
    eoUserProfileRoute,
  ]),
]);

export const router = createRouter({ routeTree });

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
