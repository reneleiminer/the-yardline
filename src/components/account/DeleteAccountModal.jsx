import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { permanentlyDeleteUserData } from '@/lib/deleteUtils';

export default function DeleteAccountModal({ onClose, onDeletionRequested }) {
  const { appUser } = useAppUser();
  const [step, setStep] = useState(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameMatches =
    confirmInput.trim().toLowerCase() === appUser?.username?.toLowerCase();

  const handleDeleteAccount = async () => {
    if (!appUser) return;

    if (!usernameMatches) {
      toast.error('Benutzername stimmt nicht überein');
      return;
    }

    setLoading(true);

    try {
      await permanentlyDeleteUserData(base44, appUser);

      toast.success('Konto wurde gelöscht');

      if (onDeletionRequested) {
        onDeletionRequested();
      }

      await base44.auth.logout('/');
    } catch (error) {
      toast.error(error.message || 'Fehler beim Löschen des Kontos');
      console.error(error);
      setLoading(false);
    }
  };

  if (!appUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>

            <h2 className="font-bold text-base">Konto löschen</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive">
                  Was wird dauerhaft gelöscht:
                </p>

                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Dein Profil und alle persönlichen Daten</li>
                  <li>Alle deine Beiträge, Kommentare und Likes</li>
                  <li>Deine Follower- und Following-Verbindungen</li>
                  <li>Alle Benachrichtigungen und Einstellungen</li>
                  <li>Deine Bewerbungen und Support-Anfragen</li>
                  <li>Verbindungen zu Verein oder Liga</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Diese Löschung wird sofort ausgeführt. Dein Konto und deine App-Daten werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-full"
                >
                  Abbrechen
                </Button>

                <Button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 rounded-full bg-destructive hover:bg-destructive/90 text-white"
                >
                  Weiter
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Gib deinen Benutzernamen{' '}
                <strong className="text-foreground">@{appUser.username}</strong>{' '}
                ein, um die dauerhafte Löschung zu bestätigen:
              </p>

              <Input
                value={confirmInput}
                onChange={event => setConfirmInput(event.target.value)}
                placeholder={appUser.username}
                className="bg-secondary border-border/50"
                autoFocus
                disabled={loading}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 rounded-full"
                >
                  Zurück
                </Button>

                <Button
                  onClick={handleDeleteAccount}
                  disabled={loading || !usernameMatches}
                  className="flex-1 rounded-full bg-destructive hover:bg-destructive/90 text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Endgültig löschen'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}