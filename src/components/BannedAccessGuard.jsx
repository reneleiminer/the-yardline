import { useAppUser } from '@/lib/useAppUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import DeletionPending from '@/pages/DeletionPending';

const ALLOWED_ROUTES = ['/account-blocked', '/legal', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/community-guidelines'];

export default function BannedAccessGuard({ children }) {
  const { appUser } = useAppUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!appUser) return;
    if (appUser.isOwner) return;

    const isBanned = appUser.status === 'banned' || appUser.status === 'suspended';
    const isAllowedRoute = ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));

    if (isBanned && !isAllowedRoute) {
      navigate('/account-blocked', { replace: true });
    }
  }, [appUser, navigate, location.pathname]);

  // Show deletion pending screen if user has requested deletion
  if (appUser && !appUser.isOwner && appUser.deletionRequested && appUser.deletionStatus === 'pending') {
    return <DeletionPending />;
  }

  // Block rendering if user is banned and not on allowed route (owner is exempt)
  if (!appUser?.isOwner && (appUser?.status === 'banned' || appUser?.status === 'suspended')) {
    const isAllowedRoute = ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));
    if (!isAllowedRoute) {
      return null;
    }
  }

  return children;
}