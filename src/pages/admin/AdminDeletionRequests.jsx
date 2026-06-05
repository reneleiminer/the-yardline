import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { permanentlyDeleteUserData } from '@/lib/deleteUtils';
import useSetHeader from '@/hooks/useSetHeader';

function useCountdownStr(deleteAfterUtc) {
  const [str, setStr] = useState('');

  useEffect(() => {
    if (!deleteAfterUtc) return undefined;

    const tick = () => {
      const diff = new Date(deleteAfterUtc) - new Date();

      if (diff <= 0) {
        setStr('Fällig');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setStr(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    tick();

    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [deleteAfterUtc]);

  return str;
}

function RequestRow({ user, onForceDelete, onForceCancel, isProcessing }) {
  const countdown = useCountdownStr(user.deleteAfterUtc);
  const isDue = user.deleteAfterUtc && new Date(user.deleteAfterUtc) <= new Date();

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${isDue ? 'border-destructive/50' : 'border-border/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            @{user.username || user.internalUsername || 'unbekannt'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email || user.displayName || 'Keine E-Mail'}
          </p>
        </div>

        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
          isDue ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-400'
        }`}
        >
          {isDue ? 'Fällig' : 'Ausstehend'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block font-medium text-foreground/60">Angefragt</span>
          {user.deletionRequestedAtUtc
            ? new Date(user.deletionRequestedAtUtc).toLocaleString('de-DE')
            : '—'}
        </div>

        <div>
          <span className="block font-medium text-foreground/60">Löschung nach</span>
          {user.deleteAfterUtc
            ? new Date(user.deleteAfterUtc).toLocaleString('de-DE')
            : '—'}
        </div>
      </div>

      {!isDue && countdown && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono font-bold text-yellow-400">
            {countdown}
          </span>
          <span className="text-xs text-muted-foreground">
            verbleibend
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onForceCancel(user)}
          disabled={isProcessing}
          className="flex-1 rounded-full text-xs"
        >
          Löschung stornieren
        </Button>

        <Button
          size="sm"
          onClick={() => onForceDelete(user)}
          disabled={isProcessing}
          className="flex-1 rounded-full text-xs bg-destructive hover:bg-destructive/90 text-white"
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3 mr-1" />
          )}
          Jetzt löschen
        </Button>
      </div>
    </div>
  );
}

export default function AdminDeletionRequests() {
  useSetHeader({
    mode: 'back',
    title: 'Löschanfragen',
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    setLoading(true);

    try {
      const all = await base44.entities.AppUser.filter({ deletionStatus: 'pending' });
      setRequests(all.filter(user => !user.isOwner));
    } catch {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleForceCancel = async user => {
    if (!user?.id) return;

    setProcessing(user.id);

    try {
      await base44.entities.AppUser.update(user.id, {
        deletionRequested: false,
        deletionRequestedAtUtc: null,
        deleteAfterUtc: null,
        deletionStatus: 'cancelled',
      });

      toast.success('Löschung storniert');
      await load();
    } catch {
      toast.error('Fehler beim Stornieren');
    } finally {
      setProcessing(null);
    }
  };

  const handleForceDelete = async user => {
    if (!user?.id) return;

    if (!confirm(`Konto von @${user.username || user.internalUsername || 'unbekannt'} jetzt dauerhaft löschen?`)) {
      return;
    }

    setProcessing(user.id);

    try {
      await permanentlyDeleteUserData(base44, user);
      toast.success('Konto gelöscht');
      await load();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Löschen');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Löschanfragen</h1>
          <p className="text-xs text-muted-foreground">
            {requests.length} ausstehende Anfragen
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Keine ausstehenden Löschanfragen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(user => (
            <RequestRow
              key={user.id}
              user={user}
              onForceDelete={handleForceDelete}
              onForceCancel={handleForceCancel}
              isProcessing={processing === user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}