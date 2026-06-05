import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SETTINGS_FIELDS = [
  { key: 'gameRemindersEnabled', label: 'Spiele',          description: 'Benachrichtigungen vor Spielbeginn' },
  { key: 'finalScoresEnabled',   label: 'Ergebnisse',      description: 'Endergebnisse & Spielberichte' },
  { key: 'transfersEnabled',     label: 'Transfers',       description: 'Spielerwechsel & Transfers' },
  { key: 'announcementsEnabled', label: 'Ankündigungen',   description: 'Offizielle Ankündigungen' },
  { key: 'newsEnabled',          label: 'News',            description: 'Artikel & Neuigkeiten' },
];

export default function NotificationSettings() {
  const { appUser } = useAppUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pushGranted, setPushGranted] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPushGranted(Notification.permission === 'granted');
    }
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings', appUser?.id],
    queryFn: async () => {
      const results = await base44.entities.NotificationSettings.filter({ userId: appUser.id });
      if (results[0]) return results[0];
      // Create default settings if none exist
      return await base44.entities.NotificationSettings.create({
        userId: appUser.id,
        pushEnabled: false,
        gameRemindersEnabled: true,
        finalScoresEnabled: true,
        transfersEnabled: true,
        announcementsEnabled: true,
        newsEnabled: true,
      });
    },
    enabled: !!appUser?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => base44.entities.NotificationSettings.update(settings.id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificationSettings', appUser?.id] }),
    onError: () => toast.error('Einstellung konnte nicht gespeichert werden'),
  });

  const handleToggle = (key, value) => {
    updateMutation.mutate({ [key]: value });
  };

  const handlePushToggle = async (value) => {
    if (value && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushGranted(true);
        updateMutation.mutate({ pushEnabled: true });
        toast.success('Push-Benachrichtigungen aktiviert');
      } else {
        setPushGranted(false);
        updateMutation.mutate({ pushEnabled: false });
        toast('Push-Benachrichtigungen wurden abgelehnt. In-App-Benachrichtigungen bleiben aktiv.', {
          description: 'Bitte aktiviere Benachrichtigungen in deinen Browser-Einstellungen.',
        });
      }
    } else {
      setPushGranted(false);
      updateMutation.mutate({ pushEnabled: false });
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/30 px-3 sm:px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-muted-foreground p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold">Benachrichtigungen</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-3 sm:px-4 pt-4 space-y-6">

          {/* Push Section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Push</p>
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold">Push aktivieren</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Benachrichtigungen auf diesem Gerät</p>
                </div>
                <Switch
                  checked={settings?.pushEnabled && pushGranted}
                  onCheckedChange={handlePushToggle}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Content Preferences */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Inhalte</p>
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden divide-y divide-border/30">
              {SETTINGS_FIELDS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <Switch
                    checked={settings?.[key] ?? true}
                    onCheckedChange={(val) => handleToggle(key, val)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pb-2">
            In-App-Benachrichtigungen sind immer aktiv.
          </p>
        </div>
      )}
    </div>
  );
}