import React, { useState } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useAppUser } from '@/lib/useAppUser';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AccountBlocked() {
  useSetHeader({ mode: 'none', title: 'Konto gesperrt' });
  const { appUser } = useAppUser();
  const { logout } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!appUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleSupportRequest = async () => {
    if (!message.trim()) {
      toast.error('Bitte gib eine Nachricht ein');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.SupportRequest.create({
        userId: appUser.id,
        email: currentUser.email,
        username: appUser.username,
        type: 'account_unban_request',
        message: message.trim(),
        status: 'open',
      });
      toast.success('Anfrage gesendet. Wir überprüfen deinen Account.');
      setShowRequestForm(false);
      setMessage('');
    } catch (error) {
      console.error('Failed to create support request:', error);
      toast.error('Fehler beim Senden der Anfrage');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Dein Konto wurde gesperrt
          </h1>

          <p className="text-sm text-muted-foreground">
            Du kannst The Yardline aktuell nicht nutzen. Wenn du glaubst, dass dies ein Fehler ist, kannst du eine Prüfung anfragen.
          </p>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-lg p-4 space-y-3">
          {appUser.hiddenReason && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Grund:</p>
              <p className="text-sm text-foreground">{appUser.hiddenReason}</p>
            </div>
          )}

          {appUser.bannedUntil && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gültig bis:</p>
              <p className="text-sm text-foreground">
                {formatDistanceToNow(new Date(appUser.bannedUntil), {
                  addSuffix: true,
                  locale: de,
                })}
              </p>
            </div>
          )}

          {appUser.status === 'banned' && !appUser.bannedUntil && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status:</p>
              <p className="text-sm text-destructive font-medium">
                Permanent gebannt
              </p>
            </div>
          )}
        </div>

        {!showRequestForm ? (
          <div className="space-y-2">
            <Button
              onClick={() => setShowRequestForm(true)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Mail className="w-4 h-4 mr-2" />
              Support kontaktieren
            </Button>

            <Button
              onClick={() => logout()}
              variant="outline"
              className="w-full"
            >
              Abmelden
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Warum soll dein Konto geprüft werden?
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Schreib uns, warum du denkst, dass dein Konto entsperrt werden sollte..."
                className="w-full h-24 px-3 py-2 rounded-lg bg-card/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowRequestForm(false);
                  setMessage('');
                }}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>

              <Button
                onClick={handleSupportRequest}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sendet...' : 'Senden'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}