import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  Radio,
  Search,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {children}

      {hint && (
        <p className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

function getLogoUrl(value) {
  if (!value) return '';
  return value;
}

function OrganizationPicker({
  type,
  selectedId,
  onSelect,
}) {
  const [search, setSearch] = useState('');

  const isClub = type === 'club';
  const isLeague = type === 'league';

  const { data: teams = [] } = useQuery({
    queryKey: ['official-form-teams'],
    queryFn: () => base44.entities.Team.list('name'),
    enabled: isClub,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['official-form-leagues'],
    queryFn: () => base44.entities.League.list('name'),
    enabled: isLeague,
  });

  const { data: allLeagues = [] } = useQuery({
    queryKey: ['official-form-all-leagues'],
    queryFn: () => base44.entities.League.list('name'),
    enabled: isClub,
  });

  const leagueMap = useMemo(() => {
    const map = {};
    allLeagues.forEach(league => {
      map[league.id] = league;
    });
    return map;
  }, [allLeagues]);

  const items = isClub ? teams : leagues;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter(item => {
      const league = isClub ? leagueMap[item.leagueId] : null;

      return (
        item.name?.toLowerCase().includes(query) ||
        item.shortName?.toLowerCase().includes(query) ||
        item.city?.toLowerCase().includes(query) ||
        item.country?.toLowerCase().includes(query) ||
        item.regionState?.toLowerCase().includes(query) ||
        league?.name?.toLowerCase().includes(query) ||
        league?.shortName?.toLowerCase().includes(query)
      );
    });
  }, [isClub, items, leagueMap, search]);

  if (!isClub && !isLeague) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold">
          {isClub ? 'Vereinsseite auswählen' : 'Liga auswählen'}
          <span className="text-red-400 ml-0.5">*</span>
        </p>

        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isClub
            ? 'Wähle die vorhandene Team-/Vereinsseite, die du offiziell verwalten möchtest.'
            : 'Wähle die Liga, die du offiziell verwalten möchtest.'}
        </p>
      </div>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="pl-9 bg-background/70 border-border/50"
          placeholder={isClub ? 'Verein, Stadt oder Liga suchen...' : 'Liga suchen...'}
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Keine passenden Einträge gefunden.
          </p>
        ) : (
          filtered.map(item => {
            const league = isClub ? leagueMap[item.leagueId] : null;
            const selected = selectedId === item.id;
            const Icon = isClub ? Building2 : Globe;
            const logo = getLogoUrl(item.logo);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border/40 bg-background/60 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {item.name}
                      </p>

                      {selected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-muted-foreground">
                      {item.shortName && <span>{item.shortName}</span>}
                      {league && <span>{league.shortName || league.name}</span>}
                      {item.city && <span>{item.city}</span>}
                      {item.country && <span>{item.country}</span>}
                      {item.regionState && <span>{item.regionState}</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function OfficialForm({ card, appUser, onClose }) {
  const Icon = card.icon;
  const queryClient = useQueryClient();

  const isClub = card.role === 'club';
  const isLeague = card.role === 'league';
  const isOfficialMedia = card.role === 'official_media';

  const [selectedOrganization, setSelectedOrganization] = useState(null);

  const [form, setForm] = useState({
    organizationName: '',
    organizationType: card.label,
    contactPerson: appUser?.displayName || '',
    officialEmail: '',
    website: '',
    socialLinks: '',
    proofMessage: '',
  });

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const handleOrganizationSelect = item => {
    setSelectedOrganization(item);

    setForm(current => ({
      ...current,
      organizationName: item.name || current.organizationName,
      website: item.website || current.website,
    }));
  };

  const needsOrganizationSelection = isClub || isLeague;

  const valid =
    form.organizationName.trim() &&
    form.officialEmail.trim() &&
    form.contactPerson.trim() &&
    form.proofMessage.trim() &&
    (!needsOrganizationSelection || selectedOrganization?.id);

  const handleSubmit = async () => {
    if (!valid || saving) return;

    setSaving(true);

    try {
      const payload = {
        userId: appUser.id,
        username: appUser.username,
        applicationType: 'official',
        requestedRole: card.role,
        organizationName: form.organizationName.trim(),
        organizationType: form.organizationType,
        contactPerson: form.contactPerson.trim(),
        officialEmail: form.officialEmail.trim(),
        website: form.website.trim(),
        socialLinks: form.socialLinks.trim(),
        proofMessage: form.proofMessage.trim(),
        status: 'pending',
      };

      if (isClub && selectedOrganization?.id) {
        payload.requestedTeamId = selectedOrganization.id;
        payload.connectedTeamId = selectedOrganization.id;
      }

      if (isLeague && selectedOrganization?.id) {
        payload.requestedLeagueId = selectedOrganization.id;
        payload.linkedLeagueId = selectedOrganization.id;
      }

      await base44.entities.RoleApplication.create(payload);

      const admins = await base44.entities.AppUser.filter({
        roleSlug: 'admin',
      });

      await Promise.all(
        admins.map(admin =>
          base44.entities.Notification.create({
            userId: admin.id,
            type: 'official_announcement',
            title: 'Neue offizielle Bewerbung',
            message: `${form.organizationName} hat sich als ${card.label} beworben.`,
            targetType: 'profile',
            targetId: appUser.id,
            iconType: 'badge',
            isRead: false,
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: ['my-applications', appUser?.id] });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="px-4 pt-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>

        <h2 className="text-xl font-black">
          Antrag eingereicht!
        </h2>

        <p className="text-sm text-muted-foreground">
          Wir prüfen deinen Antrag und melden uns per Benachrichtigung.
        </p>

        <Button onClick={onClose} className="rounded-full mt-4">
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const titleIcon = isOfficialMedia ? Radio : Icon;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${card.color}20` }}
        >
          <titleIcon.type className="w-5 h-5" style={{ color: card.color }} />
        </div>

        <div>
          <h2 className="font-black text-lg">{card.label}</h2>
          <p className="text-xs text-muted-foreground">
            Offizielles Konto · Admin-Genehmigung nötig
          </p>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-5 flex gap-2.5">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />

        <p className="text-xs text-yellow-300/90 leading-relaxed">
          Offizielle Konten werden geprüft. Verein und Liga werden nach Genehmigung direkt mit der gewählten Seite verbunden.
        </p>
      </div>

      <div className="space-y-4">
        {(isClub || isLeague) && (
          <OrganizationPicker
            type={card.role}
            selectedId={selectedOrganization?.id || ''}
            onSelect={handleOrganizationSelect}
          />
        )}

        {selectedOrganization && (
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-0">
                Ausgewählt
              </Badge>

              <span className="text-xs font-semibold">
                {selectedOrganization.name}
              </span>
            </div>
          </div>
        )}

        <Field
          label={isOfficialMedia ? 'Name der Organisation' : 'Offizieller Name'}
          required
        >
          <Input
            value={form.organizationName}
            onChange={event => set('organizationName', event.target.value)}
            className="bg-secondary border-border/50"
            placeholder={
              isClub
                ? 'z.B. Berlin Adler'
                : isLeague
                ? 'z.B. GFL'
                : 'z.B. The Yardline Media'
            }
          />
        </Field>

        <Field label="Ansprechpartner" required>
          <Input
            value={form.contactPerson}
            onChange={event => set('contactPerson', event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="Name der Kontaktperson"
          />
        </Field>

        <Field label="Offizielle E-Mail" required hint="Am besten eine Mail-Adresse der Organisation.">
          <Input
            type="email"
            value={form.officialEmail}
            onChange={event => set('officialEmail', event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="info@organisation.de"
          />
        </Field>

        <Field label="Website">
          <Input
            value={form.website}
            onChange={event => set('website', event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="https://..."
          />
        </Field>

        <Field label="Social Media Links" hint="Instagram, Facebook, X, YouTube usw.">
          <Input
            value={form.socialLinks}
            onChange={event => set('socialLinks', event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="@instagram, facebook.com/..."
          />
        </Field>

        <Field label="Nachweis & Nachricht" required hint="Wie können wir bestätigen, dass du offiziell für diese Organisation handelst?">
          <Textarea
            value={form.proofMessage}
            onChange={event => set('proofMessage', event.target.value)}
            className="bg-secondary border-border/50 resize-none"
            rows={4}
            placeholder="Beschreibe kurz deine Rolle und wie wir dich verifizieren können..."
          />
        </Field>

        <Button
          onClick={handleSubmit}
          disabled={saving || !valid}
          className="w-full rounded-full mt-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Antrag einreichen'
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full rounded-full"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}