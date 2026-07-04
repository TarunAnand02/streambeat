import { lazy, Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/ui/Spinner';
import { restoreSession } from './features/auth/authSlice';

// Route-level code splitting: each page becomes its own chunk, fetched only
// when a user actually navigates there — first load only needs whichever
// page they land on (usually Home), not the whole app (upload forms,
// analytics charts, admin help editor, etc. all deferred).
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const ChannelPage = lazy(() => import('./features/channel/ChannelPage'));
const SubscriptionsPage = lazy(() => import('./features/channel/SubscriptionsPage'));
const CollectionDetailPage = lazy(() => import('./features/collections/CollectionDetailPage'));
const CollectionsPage = lazy(() => import('./features/collections/CollectionsPage'));
const HelpPage = lazy(() => import('./features/help/HelpPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));
const HomePage = lazy(() => import('./features/videos/HomePage'));
const ImportPage = lazy(() => import('./features/videos/ImportPage'));
const SearchResultsPage = lazy(() => import('./features/videos/SearchResultsPage'));
const UploadPage = lazy(() => import('./features/videos/UploadPage'));
const WatchPage = lazy(() => import('./features/videos/WatchPage'));

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch/:videoId" element={<WatchPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/channel/:userId" element={<ChannelPage />} />
          <Route path="/help" element={<HelpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
