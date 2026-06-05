import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Lock, User, LogOut, ChevronRight, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import useSetHeader from '@/hooks/useSetHeader';
import { toast } from 'sonner';
import DeleteAccountModal from '@/components/account/DeleteAccountModal';

function SectionCard({ icon: Icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/20 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function EmailChange({ onBack }) {
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const { updateAppUser } = useAppUser();

  const handleSave = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast.error('Bitte eine gültige E-Mail eingeben'); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ email: newEmail.trim() });
      await updateAppUser({ email: newEmail.trim() });
      toast.success('E-Mail wurde aktualisiert');
      onBack();
    } catch (e) {
      toast.error('Fehler beim Aktualisieren der E-Mail');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </button>
      <h2 className="text-base font-bold">E-Mail ändern</h2>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Neue E-Mail-Adresse</label>
        <Input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="neue@email.de"
          className="bg-secondary border-border/50"
        />
      </div>
      <Button onClick={handleSave} disabled={saving || !newEmail.trim()} className="w-full rounded-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'E-Mail speichern'}
      </Button>
    </div>
  );
}

function PasswordChange({ onBack }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [repeatPw, setRepeatPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newPw.length < 8) { toast.error('Passwort muss mindestens 8 Zeichen lang sein'); return; }
    if (newPw !== repeatPw) { toast.error('Passwörter stimmen nicht überein'); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ password: newPw, current_password: currentPw });
      toast.success('Passwort wurde geändert');
      onBack();
    } catch (e) {
      toast.error('Fehler: Aktuelles Passwort möglicherweise falsch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </button>
      <h2 className="text-base font-bold">Passwort ändern</h2>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Aktuelles Passwort</label>
        <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="bg-secondary border-border/50" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Neues Passwort (min. 8 Zeichen)</label>
        <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className="bg-secondary border-border/50" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Neues Passwort wiederholen</label>
        <Input type="password" value={repeatPw} onChange={e => setRepeatPw(e.target.value)} placeholder="••••••••" className="bg-secondary border-border/50" />
      </div>
      <Button onClick={handleSave} disabled={saving || !currentPw || !newPw || !repeatPw} className="w-full rounded-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Passwort speichern'}
      </Button>
    </div>
  );
}

export default function AccountManagement() {
  useSetHeader({ mode: 'back', title: 'Konto verwalten' });
  const navigate = useNavigate();
  const { appUser } = useAppUser();
  const [section, setSection] = useState('main');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeletionRequested = () => {
    setShowDeleteModal(false);
    // BannedAccessGuard will pick up the deletionRequested flag and redirect
    window.location.reload();
  };

  if (section === 'email') return (
    <div className="px-4 pt-4 pb-24"><EmailChange onBack={() => setSection('main')} /></div>
  );
  if (section === 'password') return (
    <div className="px-4 pt-4 pb-24"><PasswordChange onBack={() => setSection('main')} /></div>
  );

  return (
    <>
      <div className="px-4 pt-4 pb-24 space-y-6">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Login-Daten</p>
          <div className="space-y-2">
            <SectionCard icon={Mail} title="E-Mail ändern" description="Deine Login-E-Mail anpassen" onClick={() => setSection('email')} />
            <SectionCard icon={Lock} title="Passwort ändern" description="Neues Passwort festlegen" onClick={() => setSection('password')} />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Öffentliches Profil</p>
          <SectionCard icon={User} title="Profil bearbeiten" description="Bild, Name, Bio & Social Links" onClick={() => navigate('/settings/profile')} />
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Sicherheit</p>
          <button
            onClick={() => base44.auth.logout('/')}
            className="w-full flex items-center gap-3 p-4 bg-card border border-destructive/20 rounded-xl hover:border-destructive/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-destructive">Abmelden</p>
              <p className="text-xs text-muted-foreground">Von diesem Gerät abmelden</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Gefahrenzone</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-3 p-4 bg-card border border-destructive/30 rounded-xl hover:border-destructive/60 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-destructive">Konto löschen</p>
              <p className="text-xs text-muted-foreground">Alle Daten dauerhaft löschen (24h Frist)</p>
            </div>
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeletionRequested={handleDeletionRequested}
        />
      )}
    </>
  );
}