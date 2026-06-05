import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import useSetHeader from '@/hooks/useSetHeader';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/timestampUtils';

const ICON_MAP = {
  football: { icon: '⚽', bg: 'bg-green-500/15 text-green-400' },
  scoreboard: { icon: '📊', bg: 'bg-blue-500/15 text-blue-400' },
  badge: { icon: '🏆', bg: 'bg-yellow-500/15 text-yellow-400' },
  arrows: { icon: '↔️', bg: 'bg-purple-500/15 text-purple-400' },
  newspaper: { icon: '📰', bg: 'bg-orange-500/15 text-orange-400' },
  support: { icon: '💬', bg: 'bg-primary/15 text-primary' },
  flag: { icon: '🚩', bg: 'bg-red-500/15 text-red-400' },
  bell: { icon: '🔔', bg: 'bg-primary/15 text-primary' },
};

function NotificationIcon({ iconType }) {
  const cfg = ICON_MAP[iconType] || ICON_MAP.bell;

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${cfg.bg}`}>
      {cfg.icon}
    </div>
  );
}

function targetPath(notification) {
  const { targetType, targetId } = notification;

  if (targetType === 'support_ticket') return `/support?ticket=${targetId}`;
  if (targetType === 'game') return `/game/${targetId}`;
  if (targetType === 'post') return `/post/${targetId}`;
  if (targetType === 'announcement') return `/announcement/${targetId}`;
  if (targetType === 'team') return `/team/${targetId}`;
  if (targetType === 'league') return `/league/${targetId}`;
  if (targetType === 'profile') return `/profile/${targetId}`;

  return null;
}

export default function Notifications() {
  useSetHeader({ mode: 'back', title: 'Benachrichtigungen' });

  const { appUser } = useAppUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', appUser?.id],
    queryFn: () => base44.entities.Notification.filter({ userId: appUser.id }, '-created_date', 50),
    enabled: !!appUser?.id,
  });

  const unreadCount = useMemo(() => {
    return notifications.filter(notification => !notification.isRead).length;
  }, [notifications]);

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(notification => !notification.isRead);

      await Promise.all(
        unread.map(notification =>
          base44.entities.Notification.update(notification.id, { isRead: true })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', appUser?.id] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: id => base44.entities.Notification.update(id, { isRead: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', appUser?.id] });
    },
  });

  const handleClick = notification => {
    if (!notification.isRead) {
      markOneMutation.mutate(notification.id);
    }

    const path = targetPath(notification);

    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      {unreadCount > 0 && (
        <div className="px-3 sm:px-4 pt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-xs text-primary gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            Alle gelesen
          </Button>
        </div>
      )}

      <div className="px-3 sm:px-4 pt-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Keine Benachrichtigungen</p>
            <p className="text-xs text-muted-foreground">Du bist auf dem neuesten Stand.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(notification => (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
                  notification.isRead
                    ? 'hover:bg-secondary/50'
                    : 'bg-primary/5 hover:bg-primary/8 border border-primary/10'
                }`}
              >
                <NotificationIcon iconType={notification.iconType} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight text-foreground">
                      {notification.title}
                    </p>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(notification.created_date)}
                      </span>

                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}