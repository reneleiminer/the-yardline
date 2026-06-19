import React, { useState } from 'react';
import { LogOut, Save, UserCircle } from 'lucide-react';

import useSetHeader from '@/hooks/useSetHeader';
import { useAuth } from '@/lib/AuthContext';
import { useAppUser } from '@/lib/useAppUser.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Profile() {
  useSetHeader({ mode: 'back', title: 'Profil' });

  const { appUser, updateAppUser } = useAppUser();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    username: appUser?.username || '',
    displayName: appUser?.displayName || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setMessage('');
  };

  const handleSave = async event => {
    event.preventDefault();
    if (!appUser) return;

    setSaving(true);
    setMessage('');

    try {
      const payload = {
        username: form.username.trim().toLowerCase(),
        displayName: form.displayName.trim(),
      };

      if (form.password.trim()) {
        payload.internalPassword = form.password.trim();
      }

      await updateAppUser(payload);
      setForm(current => ({ ...current, password: '' }));
      setMessage('Gespeichert');
    } catch (error) {
      setMessage(error.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (!appUser) return null;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-5 pb-24">
      <div className="rounded-[28px] bg-[#061126] p-5 text-white shadow-[0_18px_55px_rgba(6,17,38,0.18)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <UserCircle className="h-10 w-10 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              Konto
            </p>
            <h1 className="truncate text-2xl font-black uppercase italic leading-tight">
              {appUser.displayName || appUser.username}
            </h1>
            <p className="truncate text-sm font-semibold text-white/55">
              {appUser.email}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold leading-relaxed text-white/58">
          Dieses Profil ist nur dein Konto. Nutzer können nichts posten, niemandem folgen und keine Community-Funktionen nutzen.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-4 space-y-3 rounded-[28px] bg-white p-4">
        <Input
          value={form.username}
          onChange={event => updateField('username', event.target.value)}
          placeholder="Benutzername"
          autoComplete="username"
          className="h-12 rounded-2xl bg-slate-50 text-black"
        />

        <Input
          value={form.displayName}
          onChange={event => updateField('displayName', event.target.value)}
          placeholder="Name"
          autoComplete="name"
          className="h-12 rounded-2xl bg-slate-50 text-black"
        />

        <Input
          type="password"
          value={form.password}
          onChange={event => updateField('password', event.target.value)}
          placeholder="Neues Passwort"
          autoComplete="new-password"
          className="h-12 rounded-2xl bg-slate-50 text-black"
        />

        {message && (
          <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
            {message}
          </p>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-2xl bg-[#013369] font-black uppercase tracking-wide text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        onClick={() => logout(true)}
        className="mt-3 h-12 w-full rounded-2xl border-[#c20f1a]/25 bg-white font-black uppercase tracking-wide text-[#c20f1a]"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Abmelden
      </Button>
    </div>
  );
}
