import { lazy, Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import MaintenancePage from './components/MaintenancePage';
import NotFoundPage from './components/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/ui/Spinner';
import { fetchPublicSettings } from './features/admin/adminSettingsApi';
import { restoreSession } from './features/auth/authSlice';

// Route-level code splitting: each page becomes its own chunk, fetched only
// when a user actually navigates there — first load only needs whichever
// page they land on (usually Home), not the whole app (upload forms,
// analytics charts, admin help editor, etc. all deferred).
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage'));
const ConfirmEmailChangePage = lazy(() => import('./features/auth/ConfirmEmailChangePage'));
const OAuthCallbackPage = lazy(() => import('./features/auth/OAuthCallbackPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const ChannelPage = lazy(() => import('./features/channel/ChannelPage'));
const SubscriptionsPage = lazy(() => import('./features/channel/SubscriptionsPage'));
const CollectionDetailPage = lazy(() => import('./features/collections/CollectionDetailPage'));
const CollectionsPage = lazy(() => import('./features/collections/CollectionsPage'));
const WatchLaterPage = lazy(() => import('./features/collections/WatchLaterPage'));
const LearningDashboardPage = lazy(() => import('./features/dashboard/LearningDashboardPage'));
const HelpPage = lazy(() => import('./features/help/HelpPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));
const HomePage = lazy(() => import('./features/videos/HomePage'));
const ImportPage = lazy(() => import('./features/videos/ImportPage'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));
const AdminReportsPage = lazy(() => import('./features/reports/AdminReportsPage'));
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./features/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./features/admin/AdminUsersPage'));
const AdminVideosPage = lazy(() => import('./features/admin/AdminVideosPage'));
const AdminUploadMonitorPage = lazy(() => import('./features/admin/AdminUploadMonitorPage'));
const AdminStoragePage = lazy(() => import('./features/admin/AdminStoragePage'));
const AdminAnalyticsPage = lazy(() => import('./features/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('./features/admin/AdminSettingsPage'));
const AdminActivityLogsPage = lazy(() => import('./features/admin/AdminActivityLogsPage'));
const SearchResultsPage = lazy(() => import('./features/videos/SearchResultsPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const SharedVideoPage = lazy(() => import('./features/share/SharedVideoPage'));
const UploadPage = lazy(() => import('./features/videos/UploadPage'));
const WatchPage = lazy(() => import('./features/videos/WatchPage'));

export default function App() {
  const dispatch = useDispatch();
  const { user, initialized } = useSelector((state) => state.auth);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    dispatch(restoreSession());
    // Best-effort — if this fails (e.g. server briefly unreachable), the app
    // just proceeds as if maintenance mode is off rather than getting stuck.
    fetchPublicSettings()
      .then(setSiteSettings)
      .catch(() => setSiteSettings({ maintenanceMode: false }));
  }, [dispatch]);

  // Only the (rare) maintenance-mode-on case needs to wait for auth to
  // settle before deciding what to render — the common case (maintenance
  // off, or the settings fetch hasn't resolved yet) renders immediately,
  // same as before this existed, rather than delaying every page load.
  if (siteSettings?.maintenanceMode) {
    if (!initialized) return <Spinner />;
    // Admins can still use the app during maintenance so they can turn it
    // back off; everyone else sees a static page instead of any route.
    if (!user?.isAdmin) return <MaintenancePage siteName={siteSettings.siteName} />;
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch/:videoId" element={<WatchPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/channel/:userId" element={<ChannelPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/share/:token" element={<SharedVideoPage />} />
          <Route path="/help" element={<HelpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/watch-later" element={<WatchLaterPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/dashboard" element={<LearningDashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="videos" element={<AdminVideosPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="uploads" element={<AdminUploadMonitorPage />} />
              <Route path="storage" element={<AdminStoragePage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="activity" element={<AdminActivityLogsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
