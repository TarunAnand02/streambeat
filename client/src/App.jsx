import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { restoreSession } from './features/auth/authSlice';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import ChannelPage from './features/channel/ChannelPage';
import CollectionDetailPage from './features/collections/CollectionDetailPage';
import CollectionsPage from './features/collections/CollectionsPage';
import HelpPage from './features/help/HelpPage';
import HomePage from './features/videos/HomePage';
import ImportPage from './features/videos/ImportPage';
import SearchResultsPage from './features/videos/SearchResultsPage';
import UploadPage from './features/videos/UploadPage';
import WatchPage from './features/videos/WatchPage';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
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
        </Route>
      </Route>
    </Routes>
  );
}
