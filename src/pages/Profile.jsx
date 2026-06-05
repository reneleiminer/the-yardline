import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppUser } from '@/lib/useAppUser.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, ImagePlus, Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostCard from '@/components/feed/PostCard';
import { getImageUrl } from '@/lib/imageUtils';
import { getRoleSlug } from '@/lib/roleDefinitions';
import useSetHeader from '@/hooks/useSetHeader';

function getAccountType(appUser) {
  if (!appUser) return 'loading';

  const roleSlug = getRoleSlug(appUser.roleSlug || appUser.role || 'fan');

  if (['admin', 'moderator', 'data_editor'].includes(roleSlug)) {
    return 'internal';
  }

  if (roleSlug === 'club') {
    return 'club';
  }

  if (roleSlug === 'league') {
    return 'league';
  }

  if (roleSlug === 'official_media') {
    return 'media';
  }

  return 'profile';
}

function getInternalTitle(appUser) {
  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');

  if (roleSlug === 'admin') return 'Admin';
  if (roleSlug === 'moderator') return 'Moderator';
  if (roleSlug === 'data_editor') return 'Datenpflege';

  return 'Internes Konto';
}

function getInternalSubtitle(appUser) {
  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');

  if (roleSlug === 'admin') return 'Systemkonto';
  if (roleSlug === 'moderator') return 'Ehrenamt';
  if (roleSlug === 'data_editor') return 'Ehrenamt';

  return 'Kein öffentliches Profil';
}

function getRoleBadge(roleSlug) {
  if (roleSlug === 'creator') return 'Creator';
  if (roleSlug === 'photographer') return 'Fotograf';
  if (roleSlug === 'journalist') return 'Journalist';

  return '';
}

export default function Profile() {
  useSetHeader({ mode: 'back', title: 'Profil' });

  const navigate = useNavigate();
  const { appUser, updateAppUser } = useAppUser();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const accountType = getAccountType(appUser);
  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');

  useEffect(() => {
    if (!appUser) return;

    if (accountType === 'club') {
      navigate('/dashboard/club', { replace: true });
      return;
    }

    if (accountType === 'league') {
      navigate('/dashboard/league', { replace: true });
      return;
    }

    if (accountType === 'media') {
      navigate('/dashboard/media', { replace: true });
    }
  }, [accountType, appUser, navigate]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['myPosts', appUser?.id],
    queryFn: () =>
      appUser
        ? base44.entities.Post.filter({ authorId: appUser.id }, '-created_date')
        : [],
    enabled: !!appUser && accountType === 'profile',
  });

  if (!appUser) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (accountType === 'club' || accountType === 'league' || accountType === 'media') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (accountType === 'internal') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-muted-foreground" />
        </div>

        <h1 className="text-lg font-bold mb-1">
          {getInternalTitle(appUser)}
        </h1>

        <p className="text-sm text-muted-foreground mb-3">
          {getInternalSubtitle(appUser)}
        </p>

        <p className="text-xs text-muted-foreground max-w-sm">
          Dieses Konto existiert nur für interne Rechte und Verwaltung. Es hat kein öffentliches Nutzerprofil.
        </p>
      </div>
    );
  }

  const handleAvatarUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    await updateAppUser({
      avatar: file_url,
    });
  };

  const handleBannerUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    await updateAppUser({
      banner: file_url,
    });
  };

  const handleSaveProfile = async () => {
    await updateAppUser(editData);
    setEditing(false);
  };

  const roleLabel = getRoleBadge(roleSlug);

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      <div className="relative h-28 sm:h-36 bg-gradient-to-br from-primary/30 to-secondary w-full">
        {appUser.banner && (
          <img
            src={getImageUrl(appUser.banner)}
            alt=""
            className="w-full h-full object-cover"
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}

        <label className="absolute top-2 right-2 p-2 bg-black/40 rounded-full cursor-pointer hover:bg-black/60 transition-colors flex-shrink-0">
          <ImagePlus className="w-4 h-4 text-white" />
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="px-3 sm:px-4 -mt-8 sm:-mt-10 relative z-10">
        <div className="flex items-end gap-3 sm:gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <Avatar className="w-16 sm:w-20 h-16 sm:h-20 border-4 border-background">
              <AvatarImage src={appUser.avatar} />
              <AvatarFallback className="bg-secondary text-xl font-bold">
                {appUser.displayName?.[0] || appUser.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-white" />
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="mt-2 sm:mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-base sm:text-lg">
              {appUser.displayName || appUser.username}
            </h2>

            {appUser.verified && (
              <BadgeCheck className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
            )}

            {roleLabel && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-secondary text-foreground flex-shrink-0">
                {roleLabel}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">
            @{appUser.username}
          </p>

          {appUser.bio && (
            <p className="text-xs sm:text-sm mt-2 text-foreground/80">
              {appUser.bio}
            </p>
          )}

          <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-3 text-xs sm:text-sm">
            <div>
              <span className="font-bold">{posts.length}</span>
              <span className="text-muted-foreground ml-1">Beiträge</span>
            </div>

            <div>
              <span className="font-bold">{appUser.followersCount || 0}</span>
              <span className="text-muted-foreground ml-1">Follower</span>
            </div>

            <div>
              <span className="font-bold">{appUser.followingCount || 0}</span>
              <span className="text-muted-foreground ml-1">Folge ich</span>
            </div>
          </div>

          <div className="flex gap-2 mt-3 sm:mt-4">
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-full text-xs"
                onClick={() => {
                  setEditData({
                    displayName: appUser.displayName || '',
                    bio: appUser.bio || '',
                  });
                  setEditing(true);
                }}
              >
                Profil bearbeiten
              </Button>
            ) : (
              <div className="w-full space-y-2">
                <input
                  className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm"
                  placeholder="Anzeigename"
                  value={editData.displayName || ''}
                  onChange={event =>
                    setEditData(current => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />

                <textarea
                  className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Bio"
                  rows={3}
                  value={editData.bio || ''}
                  onChange={event =>
                    setEditData(current => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full flex-1"
                    onClick={handleSaveProfile}
                  >
                    Speichern
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setEditing(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border/30 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Noch keine Beiträge
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}