import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { sortLeagues, COUNTRIES, CONTINENTS, getRegionsForCountry } from '@/lib/leagueSort';
import { toast } from 'sonner';
import useSetHeader from '@/hooks/useSetHeader';

const CLOUDINARY_CLOUD_NAME = 'dsd5ajgru';
const CLOUDINARY_UPLOAD_PRESET = 'theyardline_upload';

const EMPTY = {
  name: '',
  shortName: '',
  logo: '',
  banner: '',
  country: 'Deutschland',
  regionState: '',
  continent: 'Europa',
  season: '',
  primaryColor: '#3b82f6',
  level: 0,
  tierLabel: '',
  isEuropeanLeague: false,
  groupsEnabled: false,
  groups: [],
  showInOnboarding: false,
  onboardingOrder: 0,
};

async function uploadToCloudinary(file) {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: data }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(result?.error?.message || 'Upload fehlgeschlagen');
  }

  return result.secure_url;
}

function GroupManager({ groups = [], onChange }) {
  const [newName, setNewName] = useState('');
  const [newShort, setNewShort] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editName, setEditName] = useState('');
  const [editShort, setEditShort] = useState('');

  const addGroup = () => {
    if (!newName.trim()) return;

    const group = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      shortName: newShort.trim(),
      displayOrder: groups.length,
    };

    onChange([...groups, group]);
    setNewName('');
    setNewShort('');
  };

  const saveEdit = idx => {
    const updated = groups.map((group, index) =>
      index === idx
        ? { ...group, name: editName, shortName: editShort }
        : group
    );

    onChange(updated);
    setEditIdx(null);
  };

  const removeGroup = idx => {
    onChange(groups.filter((_, index) => index !== idx));
  };

  const move = (idx, dir) => {
    const next = [...groups];
    const target = idx + dir;

    if (target < 0 || target >= next.length) return;

    [next[idx], next[target]] = [next[target], next[idx]];

    onChange(next.map((group, index) => ({
      ...group,
      displayOrder: index,
    })));
  };

  return (
    <div className="space-y-2">
      {groups.map((group, index) => (
        <div
          key={group.id}
          className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2"
        >
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="p-0.5 disabled:opacity-20"
            >
              <ChevronUp className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === groups.length - 1}
              className="p-0.5 disabled:opacity-20"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {editIdx === index ? (
            <>
              <Input
                className="h-7 text-xs flex-1"
                value={editName}
                onChange={event => setEditName(event.target.value)}
              />

              <Input
                className="h-7 text-xs w-20"
                placeholder="Kürzel"
                value={editShort}
                onChange={event => setEditShort(event.target.value)}
              />

              <button
                type="button"
                className="p-1 rounded hover:bg-green-500/20"
                onClick={() => saveEdit(index)}
              >
                <Check className="w-3.5 h-3.5 text-green-400" />
              </button>

              <button
                type="button"
                className="p-1 rounded hover:bg-secondary"
                onClick={() => setEditIdx(null)}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-xs font-medium">
                {group.name}
              </span>

              {group.shortName && (
                <Badge variant="secondary" className="text-[9px] h-4">
                  {group.shortName}
                </Badge>
              )}

              <button
                type="button"
                className="p-1 rounded hover:bg-secondary"
                onClick={() => {
                  setEditIdx(index);
                  setEditName(group.name);
                  setEditShort(group.shortName || '');
                }}
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>

              <button
                type="button"
                className="p-1 rounded hover:bg-destructive/10"
                onClick={() => removeGroup(index)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <Input
          className="h-8 text-xs flex-1"
          placeholder="Gruppenname"
          value={newName}
          onChange={event => setNewName(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && addGroup()}
        />

        <Input
          className="h-8 text-xs w-20"
          placeholder="Kürzel"
          value={newShort}
          onChange={event => setNewShort(event.target.value)}
        />

        <Button
          size="sm"
          className="h-8 px-2"
          onClick={addGroup}
          disabled={!newName.trim()}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-2">
        {title}
      </p>

      {children}
    </div>
  );
}

function LeagueForm({ initial = EMPTY, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const set = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleLogoUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);

    try {
      const url = await uploadToCloudinary(file);
      set('logo', url);
      toast.success('Liga-Logo hochgeladen');
    } catch (error) {
      console.error('LEAGUE LOGO UPLOAD ERROR:', error);
      toast.error(error.message || 'Logo Upload fehlgeschlagen');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleBannerUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);

    try {
      const url = await uploadToCloudinary(file);
      set('banner', url);
      toast.success('Liga-Banner hochgeladen');
    } catch (error) {
      console.error('LEAGUE BANNER UPLOAD ERROR:', error);
      toast.error(error.message || 'Banner Upload fehlgeschlagen');
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Bitte Liga-Namen eingeben');
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      shortName: form.shortName?.trim() || '',
      logo: form.logo || '',
      banner: form.banner || '',
      country: form.country || 'Deutschland',
      regionState: form.regionState || '',
      continent: form.continent || 'Europa',
      season: form.season || '',
      primaryColor: form.primaryColor || '#3b82f6',
      level: Number(form.level ?? 0),
      tierLabel: form.tierLabel || '',
      groupsEnabled: !!form.groupsEnabled,
      groups: form.groups || [],
      isEuropeanLeague: !!form.isEuropeanLeague,
      showInOnboarding: !!form.showInOnboarding,
      onboardingOrder: Number(form.onboardingOrder ?? 0),
    });
  };

  return (
    <div className="space-y-4">
      <Section title="A) Basisdaten">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Name*"
            value={form.name}
            onChange={event => set('name', event.target.value)}
          />

          <Input
            placeholder="Kürzel"
            value={form.shortName}
            onChange={event => set('shortName', event.target.value)}
          />
        </div>

        <Input
          placeholder="Saison"
          value={form.season}
          onChange={event => set('season', event.target.value)}
        />

        <div className="flex gap-2">
          <Input
            placeholder="Primärfarbe"
            value={form.primaryColor}
            onChange={event => set('primaryColor', event.target.value)}
          />

          <input
            type="color"
            value={form.primaryColor || '#3b82f6'}
            onChange={event => set('primaryColor', event.target.value)}
            className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent flex-shrink-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Logo
            </label>

            <div className="flex items-center gap-2">
              {form.logo ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={form.logo}
                    alt=""
                    className="w-8 h-8 object-contain rounded bg-secondary"
                  />

                  <button
                    type="button"
                    onClick={() => set('logo', '')}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
                  Logo
                </div>
              )}

              <label className="cursor-pointer">
                <span className="text-xs bg-secondary px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5">
                  {uploadingLogo && <Loader2 className="w-3 h-3 animate-spin" />}
                  {uploadingLogo ? 'Lädt...' : form.logo ? 'Ändern' : 'Bild wählen'}
                </span>

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo || isSaving}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Banner
            </label>

            <div className="flex items-center gap-2">
              {form.banner ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={form.banner}
                    alt=""
                    className="w-12 h-8 object-cover rounded bg-secondary"
                  />

                  <button
                    type="button"
                    onClick={() => set('banner', '')}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-8 rounded bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
                  Banner
                </div>
              )}

              <label className="cursor-pointer">
                <span className="text-xs bg-secondary px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5">
                  {uploadingBanner && <Loader2 className="w-3 h-3 animate-spin" />}
                  {uploadingBanner ? 'Lädt...' : form.banner ? 'Ändern' : 'Bild wählen'}
                </span>

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner || isSaving}
                />
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section title="B) Region">
        <Select
          value={form.country}
          onValueChange={value => {
            set('country', value);
            set('regionState', '');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Land" />
          </SelectTrigger>

          <SelectContent>
            {COUNTRIES.map(country => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(() => {
          const regions = getRegionsForCountry(form.country);

          if (regions) {
            return (
              <Select
                value={form.regionState || 'none'}
                onValueChange={value => set('regionState', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bundesland wählen" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">- kein Bundesland -</SelectItem>

                  {regions.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (form.country && form.country !== 'Europa / International') {
            return (
              <Input
                placeholder="Region / Bundesland"
                value={form.regionState || ''}
                onChange={event => set('regionState', event.target.value)}
              />
            );
          }

          return null;
        })()}

        <Select value={form.continent} onValueChange={value => set('continent', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Kontinent" />
          </SelectTrigger>

          <SelectContent>
            {CONTINENTS.map(continent => (
              <SelectItem key={continent} value={continent}>
                {continent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="C) Liga-Hierarchie">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">
              Liga Level
            </label>

            <Input
              type="number"
              min="0"
              max="20"
              value={form.level ?? 0}
              onChange={event => set('level', Number(event.target.value))}
            />
          </div>

          <div className="col-span-2">
            <label className="text-[10px] text-muted-foreground block mb-1">
              Level-Label
            </label>

            <Input
              value={form.tierLabel}
              onChange={event => set('tierLabel', event.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="D) Gruppen / Conferences">
        <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold">Gruppen aktivieren</p>
            <p className="text-[10px] text-muted-foreground">
              Nord/Süd, Ost/West, Conferences...
            </p>
          </div>

          <Switch
            checked={!!form.groupsEnabled}
            onCheckedChange={value => set('groupsEnabled', value)}
          />
        </div>

        {form.groupsEnabled && (
          <GroupManager
            groups={form.groups || []}
            onChange={value => set('groups', value)}
          />
        )}
      </Section>

      <Section title="E) Einleitung / App-Start">
        <div className="rounded-2xl border border-white/10 bg-black/70 p-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black">Liga-Icon in Welcome anzeigen</p>
              <p className="mt-0.5 text-[10px] font-semibold text-white/50">
                Maximal 4 Liga-Logos erscheinen unten auf der Welcome-Seite.
              </p>
            </div>

            <Switch
              checked={!!form.showInOnboarding}
              onCheckedChange={value => set('showInOnboarding', value)}
            />
          </div>

          <div className="mt-3 grid grid-cols-[88px_1fr] gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-white/48">
                Reihenfolge
              </label>
              <Input
                type="number"
                min="1"
                max="4"
                value={form.onboardingOrder || ''}
                onChange={event => set('onboardingOrder', Number(event.target.value))}
                placeholder="1-4"
                className="h-10"
              />
            </div>

            <div className="flex items-end">
              <p className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/58">
                Das Logo der Liga kommt automatisch aus dem Logo-Feld oben.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={isSaving || uploadingLogo || uploadingBanner || !form.name}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-1" />
          )}
          Speichern
        </Button>

        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminLeagues() {
  useSetHeader({ mode: 'back', title: 'Ligen' });

  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leagues'] });
  };

  const createMutation = useMutation({
    mutationFn: data => base44.entities.League.create(data),
    onSuccess: () => {
      invalidate();
      setAdding(false);
      toast.success('Liga erstellt');
    },
    onError: error => {
      console.error('CREATE LEAGUE ERROR:', error);
      toast.error('Liga konnte nicht erstellt werden');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success('Liga aktualisiert');
    },
    onError: error => {
      console.error('UPDATE LEAGUE ERROR:', error);
      toast.error('Liga konnte nicht aktualisiert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.League.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Liga gelöscht');
    },
    onError: error => {
      console.error('DELETE LEAGUE ERROR:', error);
      toast.error('Liga konnte nicht gelöscht werden');
    },
  });

  const sorted = sortLeagues(leagues);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-muted-foreground">
          {leagues.length} Ligen
        </p>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
        >
          <Plus className="w-4 h-4" />
          Neue Liga
        </Button>
      </div>

      {adding && (
        <Card className="p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">
            Neue Liga
          </h2>

          <LeagueForm
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setAdding(false)}
            isSaving={createMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Ligen
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(league => (
            <Card key={league.id} className="p-3">
              {editingId === league.id ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3">
                    Bearbeiten: {league.name}
                  </p>

                  <LeagueForm
                    initial={{
                      ...EMPTY,
                      ...league,
                      logo: league.logo || '',
                      banner: league.banner || '',
                      groups: league.groups || [],
                      showInOnboarding: !!league.showInOnboarding,
                      onboardingOrder: league.onboardingOrder || 0,
                    }}
                    onSave={data => updateMutation.mutate({ id: league.id, data })}
                    onCancel={() => setEditingId(null)}
                    isSaving={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {league.logo ? (
                    <img
                      src={league.logo}
                      alt=""
                      className="w-9 h-9 object-contain rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: league.primaryColor || '#3b82f6' }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {league.name}
                      </span>

                      {league.tierLabel && (
                        <Badge variant="outline" className="text-[9px] h-4">
                          {league.tierLabel}
                        </Badge>
                      )}

                      {league.isEuropeanLeague && (
                        <Badge className="text-[9px] h-4 bg-blue-500/20 text-blue-400 border-0">
                          EU
                        </Badge>
                      )}

                      {league.groupsEnabled && (
                        <Badge className="text-[9px] h-4 bg-purple-500/20 text-purple-400 border-0">
                          {(league.groups || []).length} Gruppen
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {[league.country, league.regionState || league.stateRegion, league.season]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-secondary"
                      onClick={() => {
                        setEditingId(league.id);
                        setAdding(false);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(league.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
