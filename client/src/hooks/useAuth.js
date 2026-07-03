import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, accessToken, initialized } = useSelector((state) => state.auth);
  return { user, isAuthenticated: Boolean(user && accessToken), initialized };
}
