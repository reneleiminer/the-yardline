import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  Shield,
  MapPin,
  Globe,
  Palette,
  Info,
  Building2,
  Plus,
  Trash2,
  Users,
  UserRound,
} from 'lucide-react';
import ImageUploadField from '@/components/create/ImageUploadField';
import useSetHeader from '@/hooks/useSetHeader';
import { toast } from 'sonner';

const USERNAME_REGEX = /^[a-z0-9_.]{3,24}$/;

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeSocialHandle(value) {
  return String(value || '').trim().replace(/^@/, '');
}

function getRoleSlug(user) {
  return String(user?.roleSlug || user?.role || '').trim().toLowerCase();
}

function isClubUser(user) {
  return ['club', 'verein'].includes(getRoleSlug(user));
}

function isAdminUser(user) {
  return getRoleSlug(user) === 'admin';
}

function userCanEditTeam(appUser, team) {
  if (!appUser || !team) return false;
  if (isAdminUser(appUser)) return true;

  return (
    isClubUser(appUser) &&
    (
      team.linkedUserId === appUser.id ||
      team.assignedUserId === appUser.id ||
      team.managedByUserId === appUser.id ||
      appUser.connectedTeamId === team.id ||
      appUser.linkedClubId === team.id ||
      appUser.connectedClubId === team.id ||
      team.clubId === appUser.linkedClubId ||
      team.clubId === appUser.connectedClubId
    )
  );
}

function createLocalId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyPlayer() {
  return {
    id: createLocalId('player'),
    name: '',
    number: '',
    position: '',
    height: '',
    weight: '',
    birthYear: '',
    nationality: '',
    image: '',
    isCaptain: false,
    isImport: false,
    status: 'active',
  };
}

function createEmptyCoach() {
  return {
    id: createLocalId('coach'),
    name: '',
    role: '',
    image: '',
    bio: '',
  };
}

function buildTeamForm(team) {
  return {
    shortName: team?.shortName || '',
    city: team?.city || '',
    region: team?.region || '',
    country: team?.country || '',
    stadium: team?.stadium || '',
    stadiumAddress: team?.stadiumAddress || '',
    website: team?.website || '',
    instagram: team?.instagram || '',
    youtube: team?.youtube || '',
    streamUrl: team?.streamUrl || '',
    contactEmail: team?.contactEmail || '',
    logo: team?.logo || '',
    banner: team?.banner || '',
    primaryColor: team?.primaryColor || '',
    secondaryColor: team?.secondaryColor || '',
    description: team?.description || '',
    roster: Array.isArray(team?.roster) ? team.roster.map(player => ({
      id: player.id || createLocalId('player'),
      name: player.name || '',
      number: player.number ?? '',
      position: player.position || '',
      height: player.height || '',
      weight: player.weight || '',
      birthYear: player.birthYear ?? '',
      nationality: player.nationality || '',
      image: player.image || '',
      isCaptain: !!player.isCaptain,
      isImport: !!player.isImport,
      status: player.status || 'active',
    })) : [],
    coaches: Array.isArray(team?.coaches) ? team.coaches.map(coach => ({
      id: coach.id || createLocalId('coach'),
      name: coach.name || '',
      role: coach.role || '',
      image: coach.image || '',
      bio: coach.bio || '',
    })) : [],
  };
}

function cleanRoster(roster = []) {
  return roster
    .filter(player => String(player.name || '').trim())
    .map(player => ({
      id: player.id || createLocalId('player'),
      name: String(player.name || '').trim(),
      number: player.number !== '' && player.number !== null && player.number !== undefined
        ? Number(player.number)
        : null,
      position: String(player.position || '').trim(),
      height: String(player.height || '').trim(),
      weight: String(player.weight || '').trim(),
      birthYear: player.birthYear !== '' && player.birthYear !== null && player.birthYear !== undefined
        ? Number(player.birthYear)
        : null,
      nationality: String(player.nationality || '').trim(),
      image: player.image || '',
      isCaptain: !!player.isCaptain,
      isImport: !!player.isImport,
      status: player.status || 'active',
    }));
}

function cleanCoaches(coaches = []) {
  return coaches
    .filter(coach => String(coach.name || '').trim())
    .map(coach => ({
      id: coach.id || createLocalId('coach'),
      name: String(coach.name || '').trim(),
      role: String(coach.role || '').trim(),
      image: coach.image || '',
      bio: String(coach.bio || '').trim(),
    }));
}

export default function ProfileEdit() {
  useSetHeader({ mode: 'back', title: 'Profil bearbeiten' });

  const queryClient = useQueryClient();
  const { appUser, updateAppUser } = useAppUser();

  const [form, setForm] = useState({
    displayName: appUser?.displayName || '',
    username: appUser?.username || '',
    bio: appUser?.bio || '',
    avatar: appUser?.avatar || '',
    banner: appUser?.banner || '',
    website: appUser?.website || '',
    instagram: appUser?.instagram || '',
    twitter: appUser?.twitter || '',
    tiktok: appUser?.tiktok || '',
    youtube: appUser?.youtube || '',
  });

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamForm, setTeamForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const setTeam = (key, value) => setTeamForm(prev => ({ ...(prev || {}), [key]: value }));

  const updateRosterItem = (playerId, key, value) => {
    setTeamForm(prev => ({
      ...(prev || {}),
      roster: (prev?.roster || []).map(player =>
        player.id === playerId ? { ...player, [key]: value } : player
      ),
    }));
  };

  const updateCoachItem = (coachId, key, value) => {
    setTeamForm(prev => ({
      ...(prev || {}),
      coaches: (prev?.coaches || []).map(coach =>
        coach.id === coachId ? { ...coach, [key]: value } : coach
      ),
    }));
  };

  const addPlayer = () => {
    setTeamForm(prev => ({
      ...(prev || {}),
      roster: [...(prev?.roster || []), createEmptyPlayer()],
    }));
  };

  const removePlayer = playerId => {
    setTeamForm(prev => ({
      ...(prev || {}),
      roster: (prev?.roster || []).filter(player => player.id !== playerId),
    }));
  };

  const addCoach = () => {
    setTeamForm(prev => ({
      ...(prev || {}),
      coaches: [...(prev?.coaches || []), createEmptyCoach()],
    }));
  };

  const removeCoach = coachId => {
    setTeamForm(prev => ({
      ...(prev || {}),
      coaches: (prev?.coaches || []).filter(coach => coach.id !== coachId),
    }));
  };

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
    enabled: !!appUser,
  });

  const editableTeams = useMemo(() => {
    if (!appUser) return [];
    return teams.filter(team => userCanEditTeam(appUser, team));
  }, [appUser, teams]);

  const managedTeam = useMemo(() => {
    if (editableTeams.length === 0) return null;

    if (selectedTeamId) {
      return editableTeams.find(team => team.id === selectedTeamId) || editableTeams[0];
    }

    return editableTeams[0];
  }, [editableTeams, selectedTeamId]);

  useEffect(() => {
    if (!managedTeam) {
      setTeamForm(null);
      return;
    }

    if (!selectedTeamId) {
      setSelectedTeamId(managedTeam.id);
    }

    setTeamForm(buildTeamForm(managedTeam));
  }, [managedTeam?.id]);

  const updateTeamMutation = useMutation({
    mutationFn: data => base44.entities.Team.update(managedTeam.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Teamdaten gespeichert');
    },
    onError: error => {
      console.error('UPDATE TEAM PROFILE ERROR:', error);
      toast.error('Teamdaten konnten nicht gespeichert werden');
    },
  });

  const validateUsername = value => {
    if (!USERNAME_REGEX.test(value)) {
      setUsernameError('3–24 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt oder Unterstrich');
      return false;
    }

    setUsernameError('');
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateUsername(form.username)) return;

    setSaving(true);

    try {
      const usernameChanged = form.username !== appUser.username;

      if (usernameChanged) {
        const existing = await base44.entities.AppUser.filter({ username: form.username });

        if (existing.length > 0 && existing[0].id !== appUser.id) {
          toast.error('Dieser Benutzername ist bereits vergeben');
          setSaving(false);
          return;
        }

        const history = appUser.usernameChangeHistory || [];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentChanges = history.filter(item => item.changedAtUtc >= thirtyDaysAgo);

        if (recentChanges.length >= 2) {
          toast.error('Du kannst deinen Benutzernamen nur 2-mal innerhalb von 30 Tagen ändern.');
          setSaving(false);
          return;
        }

        await updateAppUser({
          ...form,
          usernameChangeHistory: [
            ...history,
            {
              oldUsername: appUser.username,
              newUsername: form.username,
              changedAtUtc: new Date().toISOString(),
            },
          ],
        });
      } else {
        await updateAppUser(form);
      }

      toast.success('Profil gespeichert');
    } catch (error) {
      console.error('SAVE PROFILE ERROR:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeam = () => {
    if (!managedTeam || !teamForm) return;

    updateTeamMutation.mutate({
      shortName: teamForm.shortName?.trim() || managedTeam.shortName || '',
      city: teamForm.city?.trim() || '',
      region: teamForm.region?.trim() || '',
      country: teamForm.country?.trim() || '',
      stadium: teamForm.stadium?.trim() || '',
      stadiumAddress: teamForm.stadiumAddress?.trim() || '',
      website: normalizeUrl(teamForm.website),
      instagram: normalizeSocialHandle(teamForm.instagram),
      youtube: normalizeUrl(teamForm.youtube),
      streamUrl: normalizeUrl(teamForm.streamUrl),
      contactEmail: teamForm.contactEmail?.trim() || '',
      logo: teamForm.logo || '',
      banner: teamForm.banner || '',
      primaryColor: teamForm.primaryColor || '',
      secondaryColor: teamForm.secondaryColor || '',
      description: teamForm.description?.trim() || '',
      roster: cleanRoster(teamForm.roster),
      coaches: cleanCoaches(teamForm.coaches),
    });
  };

  if (!appUser) return null;

  const showClubMissingTeamNotice =
    !teamsLoading &&
    isClubUser(appUser) &&
    editableTeams.length === 0;

  return (
    <div className="px-4 pt-4 pb-24 space-y-5 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">Profil</h2>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Profilbild
          </label>
          <ImageUploadField value={form.avatar} onChange={value => set('avatar', value)} />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Bannerbild
          </label>
          <ImageUploadField value={form.banner} onChange={value => set('banner', value)} />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Anzeigename
          </label>
          <Input
            value={form.displayName}
            onChange={event => set('displayName', event.target.value)}
            className="bg-secondary border-border/50"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Benutzername
          </label>
          <Input
            value={form.username}
            onChange={event => {
              const value = event.target.value.toLowerCase();
              set('username', value);
              validateUsername(value);
            }}
            className="bg-secondary border-border/50"
            placeholder="dein_name"
          />

          {usernameError && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {usernameError}
            </p>
          )}

          <p className="text-[10px] text-muted-foreground mt-1">
            Max. 2 Änderungen in 30 Tagen
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Bio
          </label>
          <Textarea
            value={form.bio}
            onChange={event => set('bio', event.target.value)}
            rows={3}
            className="bg-secondary border-border/50 resize-none"
          />
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Social Links
          </p>

          <div className="space-y-2">
            {[
              { key: 'website', label: 'Website', placeholder: 'https://...' },
              { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
              { key: 'twitter', label: 'X / Twitter', placeholder: '@handle' },
              { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
              { key: 'youtube', label: 'YouTube', placeholder: 'Channel URL' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {label}
                </label>
                <Input
                  value={form[key]}
                  onChange={event => set(key, event.target.value)}
                  placeholder={placeholder}
                  className="bg-secondary border-border/50"
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSaveProfile} disabled={saving || !!usernameError} className="w-full rounded-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Profil speichern'}
        </Button>
      </div>

      {teamsLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {showClubMissingTeamNotice && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-yellow-300">
                Kein Team verknüpft
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Dein Vereinsaccount ist noch keinem Team zugeordnet. Ein Admin muss dein Team im Adminbereich verknüpfen, danach kannst du die Teamdaten hier bearbeiten.
              </p>
            </div>
          </div>
        </div>
      )}

      {managedTeam && teamForm && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-primary mt-0.5" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Verein / Team bearbeiten</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {managedTeam.name}
              </p>
            </div>
          </div>

          {editableTeams.length > 1 && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Team auswählen
              </label>
              <select
                value={selectedTeamId}
                onChange={event => setSelectedTeamId(event.target.value)}
                className="w-full rounded-lg bg-secondary border border-border/50 px-3 py-2 text-sm"
              >
                {editableTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Team-Logo
            </label>
            <ImageUploadField value={teamForm.logo} onChange={value => setTeam('logo', value)} />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Team-Banner
            </label>
            <ImageUploadField value={teamForm.banner} onChange={value => setTeam('banner', value)} />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Kurzname
            </label>
            <Input
              value={teamForm.shortName}
              onChange={event => setTeam('shortName', event.target.value)}
              className="bg-secondary border-border/50"
              placeholder="z.B. Panthers"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Beschreibung
            </label>
            <Textarea
              value={teamForm.description}
              onChange={event => setTeam('description', event.target.value)}
              rows={4}
              className="bg-secondary border-border/50 resize-none"
              placeholder="Kurzbeschreibung zum Verein..."
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Standort
              </p>
            </div>

            <Input
              value={teamForm.city}
              onChange={event => setTeam('city', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Stadt"
            />

            <Input
              value={teamForm.region}
              onChange={event => setTeam('region', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Region / Bundesland"
            />

            <Input
              value={teamForm.country}
              onChange={event => setTeam('country', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Land"
            />

            <Input
              value={teamForm.stadium}
              onChange={event => setTeam('stadium', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Stadion / Heimspielstätte"
            />

            <Input
              value={teamForm.stadiumAddress}
              onChange={event => setTeam('stadiumAddress', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Stadionadresse"
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Links & Kontakt
              </p>
            </div>

            <Input
              value={teamForm.website}
              onChange={event => setTeam('website', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Website"
            />

            <Input
              value={teamForm.instagram}
              onChange={event => setTeam('instagram', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Instagram"
            />

            <Input
              value={teamForm.youtube}
              onChange={event => setTeam('youtube', event.target.value)}
              className="bg-background border-border/50"
              placeholder="YouTube / Video-Link"
            />

            <Input
              value={teamForm.streamUrl}
              onChange={event => setTeam('streamUrl', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Stream-Link"
            />

            <Input
              value={teamForm.contactEmail}
              onChange={event => setTeam('contactEmail', event.target.value)}
              className="bg-background border-border/50"
              placeholder="Kontakt E-Mail"
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Farben
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={teamForm.primaryColor || '#4D9FFF'}
                onChange={event => setTeam('primaryColor', event.target.value)}
                className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
              />

              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Primärfarbe</p>
                <Input
                  value={teamForm.primaryColor}
                  onChange={event => setTeam('primaryColor', event.target.value)}
                  placeholder="#000000"
                  className="bg-background border-border/50 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={teamForm.secondaryColor || '#111827'}
                onChange={event => setTeam('secondaryColor', event.target.value)}
                className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
              />

              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Sekundärfarbe</p>
                <Input
                  value={teamForm.secondaryColor}
                  onChange={event => setTeam('secondaryColor', event.target.value)}
                  placeholder="#000000"
                  className="bg-background border-border/50 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Roster
                </p>
              </div>

              <Button size="sm" variant="outline" onClick={addPlayer} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Spieler
              </Button>
            </div>

            {(teamForm.roster || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Noch keine Spieler eingetragen.
              </p>
            ) : (
              <div className="space-y-3">
                {teamForm.roster.map((player, index) => (
                  <div key={player.id} className="rounded-xl border border-border/50 bg-background p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-muted-foreground">
                        Spieler {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>

                    <ImageUploadField
                      label="Spielerbild optional"
                      value={player.image}
                      onChange={value => updateRosterItem(player.id, 'image', value)}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={player.name}
                        onChange={event => updateRosterItem(player.id, 'name', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Name"
                      />

                      <Input
                        type="number"
                        value={player.number}
                        onChange={event => updateRosterItem(player.id, 'number', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Nummer"
                      />

                      <Input
                        value={player.position}
                        onChange={event => updateRosterItem(player.id, 'position', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Position, z.B. QB"
                      />

                      <select
                        value={player.status || 'active'}
                        onChange={event => updateRosterItem(player.id, 'status', event.target.value)}
                        className="w-full rounded-lg bg-secondary border border-border/50 px-3 py-2 text-sm"
                      >
                        <option value="active">Aktiv</option>
                        <option value="injured">Verletzt</option>
                        <option value="inactive">Inaktiv</option>
                      </select>

                      <Input
                        value={player.height}
                        onChange={event => updateRosterItem(player.id, 'height', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Größe optional"
                      />

                      <Input
                        value={player.weight}
                        onChange={event => updateRosterItem(player.id, 'weight', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Gewicht optional"
                      />

                      <Input
                        type="number"
                        value={player.birthYear}
                        onChange={event => updateRosterItem(player.id, 'birthYear', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Geburtsjahr optional"
                      />

                      <Input
                        value={player.nationality}
                        onChange={event => updateRosterItem(player.id, 'nationality', event.target.value)}
                        className="bg-secondary border-border/50"
                        placeholder="Nationalität optional"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!player.isCaptain}
                          onChange={event => updateRosterItem(player.id, 'isCaptain', event.target.checked)}
                        />
                        Captain
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!player.isImport}
                          onChange={event => updateRosterItem(player.id, 'isImport', event.target.checked)}
                        />
                        Import
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Coaches
                </p>
              </div>

              <Button size="sm" variant="outline" onClick={addCoach} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Coach
              </Button>
            </div>

            {(teamForm.coaches || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Noch keine Coaches eingetragen.
              </p>
            ) : (
              <div className="space-y-3">
                {teamForm.coaches.map((coach, index) => (
                  <div key={coach.id} className="rounded-xl border border-border/50 bg-background p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-muted-foreground">
                        Coach {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeCoach(coach.id)}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>

                    <ImageUploadField
                      label="Coachbild optional"
                      value={coach.image}
                      onChange={value => updateCoachItem(coach.id, 'image', value)}
                    />

                    <Input
                      value={coach.name}
                      onChange={event => updateCoachItem(coach.id, 'name', event.target.value)}
                      className="bg-secondary border-border/50"
                      placeholder="Name"
                    />

                    <Input
                      value={coach.role}
                      onChange={event => updateCoachItem(coach.id, 'role', event.target.value)}
                      className="bg-secondary border-border/50"
                      placeholder="Rolle, z.B. Head Coach"
                    />

                    <Textarea
                      value={coach.bio}
                      onChange={event => updateCoachItem(coach.id, 'bio', event.target.value)}
                      rows={2}
                      className="bg-secondary border-border/50 resize-none"
                      placeholder="Kurzinfo optional"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveTeam}
            disabled={updateTeamMutation.isPending}
            className="w-full rounded-full"
          >
            {updateTeamMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Teamdaten speichern'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}