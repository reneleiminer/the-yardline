import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { permanentlyDeleteUserData } from '@/lib/deleteUtils';

function getRemainingMs(deleteAfterUtc) {
  if (!deleteAfterUtc) return 0;

  const target = new Date(deleteAfterUtc).getTime();

  if (Number.isNaN(target)) return 0;

  return Math.max(0, target - Date.now());
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function useCountdown(deleteAfterUtc) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(deleteAfterUtc));

  useEffect(() => {
    if (!deleteAfterUtc) {
      setRemainingMs(0);
      return undefined;
    }

    const tick = () => {
      setRemainingMs(getRemainingMs(deleteAfterUtc));
    };

    tick();

    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [deleteAfterUtc]);

  return {
    remainingMs,
    remainingText: formatRemaining(remainingMs),
    isExpired: !!deleteAfterUtc && remainingMs <= 0,
  };
}

export default function DeletionPending() {
  const { appUser, refreshAppUser } = useAppUser();

  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStarted, setDeleteStarted] = useState(false);

  const { remainingText, isExpired } = useCountdown(appUser?.deleteAfterUtc);

  const canRestore = useMemo(() => {
    return !!appUser && !isExpired && !deleting;
  }, [appUser, deleting, isExpired]);

  useEffect(() => {
    if (!appUser || !isExpired || deleting || deleteStarted) return;

    const runFinalDeletion = async () => {
      setDeleteStarted(true);
      setDeleting(true);

      try {
        await permanentlyDeleteUserData(base44, appUser);
        toast.success('Konto wurde endgültig gelöscht');
        await base44.auth.logout('/');
      } catch (error) {
        toast.error(error.message || 'Fehler beim endgültigen Löschen');
        setDeleting(false);
      }
    };

    runFinalDeletion();
  }, [appUser, deleteStarted, deleting, isExpired]);

  const handleCancel = async () => {
    if (!appUser || !canRestore) return;

    setCancelling(true);

    try {
      await base44.entities.AppUser.update(appUser.id, {
        deletionRequested: false,
        deletionRequestedAtUtc: null,
        deleteAfterUtc: null,
        deletionStatus: 'cancelled',
      });

      await refreshAppUser();
      toast.success('Konto wurde wiederhergestellt. Willkommen zurück!');
    } catch {
      toast.error('Fehler beim Wiederherstellen des Kontos');
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  if (!appUser) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            {deleting ? (
              <Loader2 className="w-10 h-10 text-destructive animate-spin" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-destructive" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">
            {deleting ? 'Konto wird endgültig gelöscht' : 'Konto wird gelöscht'}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {deleting
              ? 'Die Löschfrist ist abgelaufen. Dein Konto und alle App-Daten werden jetzt dauerhaft entfernt.'
              : 'Dein Konto ist zur dauerhaften Löschung vorgemerkt. Während dieser Zeit kannst du die App nicht nutzen. Du kannst die Löschung nur noch wiederherstellen oder dich abmelden.'}
          </p>
        </div>

        {!deleting && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Verbleibende Zeit</span>
            </div>

            <div className="text-4xl font-bold font-mono text-destructive tracking-widest">
              {remainingText}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!deleting && (
            <Button
              onClick={handleCancel}
              disabled={cancelling || !canRestore}
              className="w-full rounded-full"
              size="lg"
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Konto wiederherstellen
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={deleting}
            className="w-full rounded-full"
            size="lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>

        {!deleting && (
          <p className="text-xs text-muted-foreground">
            Nach Ablauf des Timers werden dein Konto und alle Daten unwiderruflich gelöscht.
          </p>
        )}
      </div>
    </div>
  );
}