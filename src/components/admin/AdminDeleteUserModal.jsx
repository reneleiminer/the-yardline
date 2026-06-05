import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminDeleteUserModal({ user, onConfirm, onCancel, isPending }) {
  const [typedUsername, setTypedUsername] = useState('');
  const isConfirmed = typedUsername === user?.username;

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card rounded-xl border border-destructive/40 p-6 max-w-sm w-full space-y-4 shadow-2xl">

        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Nutzer permanent löschen</h3>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        {/* Warning text */}
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-xs text-destructive leading-relaxed">
            Dieser Nutzer wird <strong>sofort und dauerhaft</strong> gelöscht. Alle Daten werden entfernt — Posts, Kommentare, Follows, Benachrichtigungen und das Profil. Diese Aktion kann <strong>nicht rückgängig gemacht werden</strong>.
          </p>
        </div>

        {/* Confirm by typing username */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Gib <span className="font-mono font-semibold text-foreground">{user.username}</span> ein, um zu bestätigen:
          </p>
          <Input
            value={typedUsername}
            onChange={(e) => setTypedUsername(e.target.value)}
            placeholder={user.username}
            className="h-9 text-sm bg-secondary/40 border-border/50 focus:border-destructive/50"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={onCancel}
            disabled={isPending}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onConfirm}
            disabled={!isConfirmed || isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Löschen...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Permanent löschen
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}