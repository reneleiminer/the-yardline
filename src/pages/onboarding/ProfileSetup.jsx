import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const USERNAME_REGEX = /^[a-z0-9_.]{3,24}$/;

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 24);
}

function createFallbackUsername(email) {
  const prefix = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18);

  return normalizeUsername(prefix || `user_${Date.now()}`);
}

export default function ProfileSetup() {
  const { refreshAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseUser, setBaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [form, setForm] = useState({
    username: '',
    displayName: '',
  });
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);

    try {
      const me = await base44.auth.me();

      if (!me?.email) {
        throw new Error('Login konnte keinem Nutzer zugeordnet werden.');
      }

      const email = String(me.email).trim().toLowerCase();
      const users = await base44.entities.AppUser.filter({ email });
      const currentAppUser = users[0] || null;

      setBaseUser({
        ...me,
        email,
      });
      setAppUser(currentAppUser);

      const existingUsername =
        currentAppUser?.username && !currentAppUser.username.startsWith('user_')
          ? currentAppUser.username
          : createFallbackUsername(email);

      setForm({
        username: existingUsername,
        displayName:
          currentAppUser?.displayName ||
          me.full_name ||
          me.name ||
          '',
      });
    } catch (error) {
      console.error('PROFILE SETUP LOAD ERROR:', error);
      toast.error(error.message || 'Profil konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = value => {
    const nextUsername = normalizeUsername(value);

    if (!USERNAME_REGEX.test(nextUsername)) {
      setUsernameError('3-24 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt oder Unterstrich');
      return false;
    }

    setUsernameError('');
    return true;
  };

  const handleUsernameChange = event => {
    const nextUsername = normalizeUsername(event.target.value);

    setForm(current => ({
      ...current,
      username: nextUsername,
    }));

    validateUsername(nextUsername);
  };

  const handleSave = async () => {
    const username = normalizeUsername(form.username);
    const displayName = String(form.displayName || '').trim();

    if (!validateUsername(username)) return;

    if (!displayName) {
      toast.error('Bitte gib einen Anzeigenamen ein');
      return;
    }

    setSaving(true);

    try {
      const existingUsernameUsers = await base44.entities.AppUser.filter({ username });

      const usernameTaken = existingUsernameUsers.some(user =>
        user.id !== appUser?.id
      );

      if (usernameTaken) {
        setUsernameError('Dieser Benutzername ist bereits vergeben');
        toast.error('Dieser Benutzername ist bereits vergeben');
        setSaving(false);
        return;
      }

      const payload = {
        email: baseUser.email,
        username,
        displayName,
        roleSlug: appUser?.roleSlug || 'fan',
        role: appUser?.role || 'Fan',
        status: appUser?.status || 'active',
        verified: appUser?.verified || false,
        isOwner: appUser?.isOwner || false,
        needsOnboarding: false,
        updatedAtUtc: new Date().toISOString(),
      };

      if (appUser?.id) {
        await base44.entities.AppUser.update(appUser.id, payload);
      } else {
        await base44.entities.AppUser.create({
          ...payload,
          createdAtUtc: new Date().toISOString(),
        });
      }

      try {
        await base44.auth.updateMe({
          username,
          full_name: displayName,
        });
      } catch {
        // AppUser ist maßgeblich; Base44-Profil muss nicht überall beschreibbar sein.
      }

      toast.success('Profil eingerichtet');
      await refreshAuth();
      window.location.href = '/';
    } catch (error) {
      console.error('PROFILE SETUP SAVE ERROR:', error);
      toast.error(error.message || 'Profil konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h1 className="text-xl font-bold">Profil einrichten</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle deinen Namen für The Yardline.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Benutzername
            </label>

            <Input
              value={form.username}
              onChange={handleUsernameChange}
              placeholder="dein_name"
              className="bg-secondary/50 border-border/50"
            />

            {usernameError ? (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {usernameError}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Dieser Name ist öffentlich sichtbar.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Anzeigename
            </label>

            <Input
              value={form.displayName}
              onChange={event => setForm(current => ({
                ...current,
                displayName: event.target.value,
              }))}
              placeholder="Dein Name"
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !!usernameError || !form.username || !form.displayName.trim()}
            className="w-full rounded-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Weiter'
            )}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => base44.auth.logout('/')}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}