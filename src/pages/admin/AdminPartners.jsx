import React, { useMemo, useState } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Trash2,
  Plus,
  ImageIcon,
  ExternalLink,
  Handshake,
  ShieldCheck,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUploadField from '@/components/common/ImageUploadField';
import { getImageUrl } from '@/lib/imageUtils';

const EMPTY_FORM = {
  name: '',
  logoUrl: '',
  linkUrl: '',
  isPartnerClub: false,
  connectedTeamId: '',
};

function getTeamName(teams, teamId) {
  if (!teamId) return '';

  const team = teams.find(item => item.id === teamId);

  return team?.name || team?.displayName || team?.shortName || '';
}

function getPartnerFormData(partner) {
  if (!partner) return EMPTY_FORM;

  return {
    name: partner.name || '',
    logoUrl: partner.logoUrl || '',
    linkUrl: partner.linkUrl || '',
    isPartnerClub: partner.isPartnerClub === true || partner.partnerStatus === 'active',
    connectedTeamId: partner.connectedTeamId || partner.teamId || '',
  };
}

export default function AdminPartners() {
  useSetHeader({ mode: 'back', title: 'Unsere Partner' });

  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['adminPartnersTeams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) =>
      String(a.name || a.displayName || a.shortName || '').localeCompare(
        String(b.name || b.displayName || b.shortName || ''),
        'de'
      )
    );
  }, [teams]);

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => {
      const sortA = Number(a.sortOrder || 0);
      const sortB = Number(b.sortOrder || 0);

      if (sortA !== sortB) return sortA - sortB;

      return String(a.name || '').localeCompare(String(b.name || ''), 'de');
    });
  }, [partners]);

  const invalidatePartners = () => {
    queryClient.invalidateQueries({ queryKey: ['partners'] });
    queryClient.invalidateQueries({ queryKey: ['home-partners'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Partner.create(data),
    onSuccess: () => {
      invalidatePartners();
      resetForm();
      toast.success('Eintrag erstellt');
    },
    onError: (error) => {
      console.error('Partner erstellen Fehler:', error);
      toast.error('Eintrag konnte nicht erstellt werden');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Partner.update(id, data),
    onSuccess: () => {
      invalidatePartners();
      resetForm();
      toast.success('Eintrag aktualisiert');
    },
    onError: (error) => {
      console.error('Partner bearbeiten Fehler:', error);
      toast.error('Eintrag konnte nicht aktualisiert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => {
      invalidatePartners();
      toast.success('Eintrag gelöscht');
    },
    onError: (error) => {
      console.error('Partner löschen Fehler:', error);
      toast.error('Eintrag konnte nicht gelöscht werden');
    },
  });

  const resetForm = () => {
    setIsAdding(false);
    setEditingPartner(null);
    setFormData(EMPTY_FORM);
  };

  const startCreate = () => {
    setEditingPartner(null);
    setFormData(EMPTY_FORM);
    setIsAdding(true);
  };

  const startEdit = (partner) => {
    setIsAdding(false);
    setEditingPartner(partner);
    setFormData(getPartnerFormData(partner));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.logoUrl.trim()) {
      toast.error('Name und Logo erforderlich');
      return;
    }

    if (formData.isPartnerClub && !formData.connectedTeamId) {
      toast.error('Bitte einen Verein verbinden');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      logoUrl: formData.logoUrl.trim(),
      linkUrl: formData.linkUrl.trim(),
      category: 'business',
      type: 'business',

      isPartnerClub: formData.isPartnerClub,
      connectedTeamId: formData.isPartnerClub ? formData.connectedTeamId : '',
      teamId: formData.isPartnerClub ? formData.connectedTeamId : '',
      partnerStatus: formData.isPartnerClub ? 'active' : '',
    };

    if (editingPartner?.id) {
      updateMutation.mutate({
        id: editingPartner.id,
        data: payload,
      });
      return;
    }

    createMutation.mutate({
      ...payload,
      sortOrder: partners.length,
    });
  };

  const isFormOpen = isAdding || editingPartner;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {isFormOpen && (
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold">
              {editingPartner ? 'Partner bearbeiten' : 'Neuer Eintrag'}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Name *"
              value={formData.name}
              onChange={(event) =>
                setFormData(current => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />

            <ImageUploadField
              label="Logo"
              required
              value={formData.logoUrl}
              onChange={(url) =>
                setFormData(current => ({
                  ...current,
                  logoUrl: url,
                }))
              }
            />

            <Input
              placeholder="Link URL optional, z.B. https://..."
              value={formData.linkUrl}
              onChange={(event) =>
                setFormData(current => ({
                  ...current,
                  linkUrl: event.target.value,
                }))
              }
            />

            <label className="flex items-start gap-3 rounded-2xl border border-border/50 bg-secondary/30 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPartnerClub}
                onChange={(event) =>
                  setFormData(current => ({
                    ...current,
                    isPartnerClub: event.target.checked,
                    connectedTeamId: event.target.checked ? current.connectedTeamId : '',
                  }))
                }
                className="mt-1"
              />

              <div>
                <p className="text-sm font-bold">
                  Partnerverein
                </p>

                <p className="text-xs text-muted-foreground mt-0.5">
                  Spiele dieses Vereins werden im Home bei kommenden Spielen als empfohlen angezeigt.
                </p>
              </div>
            </label>

            {formData.isPartnerClub && (
              <select
                value={formData.connectedTeamId}
                onChange={(event) =>
                  setFormData(current => ({
                    ...current,
                    connectedTeamId: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                <option value="">Verein verbinden...</option>
                {sortedTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name || team.displayName || team.shortName || 'Unbenannter Verein'}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isSaving}>
                {editingPartner ? 'Speichern' : 'Erstellen'}
              </Button>

              <Button type="button" variant="outline" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!isFormOpen && (
        <Button onClick={startCreate} className="mb-8 gap-2">
          <Plus className="w-4 h-4" />
          Eintrag hinzufügen
        </Button>
      )}

      <div className="space-y-6">
        {sortedPartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-2xl bg-secondary/50">
              <Handshake className="w-8 h-8 text-muted-foreground/50" />
            </div>

            <p className="font-medium text-muted-foreground">
              Noch keine Partner hinzugefügt
            </p>

            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Füge Partner hinzu, die im Footer unter â€žUnsere Partnerâ€œ angezeigt werden.
            </p>
          </div>
        ) : (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-black">
                  Unsere Partner
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  {sortedPartners.length} {sortedPartners.length === 1 ? 'Partner' : 'Partner'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedPartners.map((partner) => {
                const connectedTeamName = getTeamName(
                  teams,
                  partner.connectedTeamId || partner.teamId
                );

                return (
                  <Card
                    key={partner.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {partner.logoUrl ? (
                        <img
                          src={getImageUrl(partner.logoUrl)}
                          alt={partner.name}
                          className="h-10 w-10 object-contain flex-shrink-0 rounded bg-white/5 p-1"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">
                            {partner.name}
                          </p>

                          {(partner.isPartnerClub || partner.partnerStatus === 'active') && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-black">
                              <ShieldCheck className="w-3 h-3" />
                              Partnerverein
                            </span>
                          )}
                        </div>

                        {connectedTeamName && (
                          <p className="text-xs text-emerald-300 mt-1">
                            Verbunden mit: {connectedTeamName}
                          </p>
                        )}

                        {partner.linkUrl && (
                          <a
                            href={partner.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground truncate flex items-center gap-1 hover:text-primary transition-colors mt-1"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            {partner.linkUrl}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(partner)}
                        disabled={deleteMutation.isPending}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(partner.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}