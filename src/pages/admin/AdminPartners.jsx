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
  Building2,
  Shield,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUploadField from '@/components/create/ImageUploadField';

const PARTNER_CATEGORIES = [
  {
  value: 'business',
  label: 'Partner',
  description: 'Unternehmen, Sponsoren und offizielle Partner',
  icon: Building2,
},
  {
    value: 'club',
    label: 'Vereinspartner',
    description: 'Football-Vereine, Teams und Clubs',
    icon: Shield,
  },
  {
    value: 'media',
    label: 'Media Network',
    description: 'Fotografen, Creator und Medienpartner',
    icon: Camera,
  },
];

const EMPTY_FORM = {
  name: '',
  logoUrl: '',
  linkUrl: '',
  category: 'business',
};

function getPartnerCategory(partner) {
  return partner.category || partner.type || 'business';
}

function getCategoryConfig(category) {
  return PARTNER_CATEGORIES.find(item => item.value === category) || PARTNER_CATEGORIES[0];
}

function CategoryBadge({ category }) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategoryOption({ option, active, onClick }) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-primary bg-primary/10'
          : 'border-border/50 bg-secondary/20 hover:border-primary/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />

        <p className="text-xs font-black">
          {option.label}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
        {option.description}
      </p>
    </button>
  );
}

export default function AdminPartners() {
  useSetHeader({ mode: 'back', title: 'Partner & Netzwerk' });

  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => {
      const categoryA = getPartnerCategory(a);
      const categoryB = getPartnerCategory(b);

      if (categoryA !== categoryB) {
        const orderA = PARTNER_CATEGORIES.findIndex(item => item.value === categoryA);
        const orderB = PARTNER_CATEGORIES.findIndex(item => item.value === categoryB);

        return orderA - orderB;
      }

      const sortA = Number(a.sortOrder || 0);
      const sortB = Number(b.sortOrder || 0);

      if (sortA !== sortB) return sortA - sortB;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [partners]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Partner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setFormData(EMPTY_FORM);
      setIsAdding(false);
      toast.success('Eintrag erstellt');
    },
    onError: (error) => {
      console.error('Partner erstellen Fehler:', error);
      toast.error('Eintrag konnte nicht erstellt werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Eintrag gelöscht');
    },
    onError: (error) => {
      console.error('Partner löschen Fehler:', error);
      toast.error('Eintrag konnte nicht gelöscht werden');
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.logoUrl.trim()) {
      toast.error('Name und Logo erforderlich');
      return;
    }

    createMutation.mutate({
  name: formData.name.trim(),
  logoUrl: formData.logoUrl.trim(),
  linkUrl: formData.linkUrl.trim(),
  category: formData.category || 'business',
  type: formData.category || 'business',
  sortOrder: partners.length,
});
  };

  const resetForm = () => {
    setIsAdding(false);
    setFormData(EMPTY_FORM);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {isAdding && (
        <Card className="p-6 mb-8">
          <h3 className="text-sm font-semibold mb-4">
            Neuer Eintrag
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Bereich
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PARTNER_CATEGORIES.map(option => (
                  <CategoryOption
                    key={option.value}
                    option={option}
                    active={formData.category === option.value}
                    onClick={() =>
                      setFormData(current => ({
                        ...current,
                        category: option.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>

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

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending}>
                Erstellen
              </Button>

              <Button type="button" variant="outline" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="mb-8 gap-2">
          <Plus className="w-4 h-4" />
          Eintrag hinzufügen
        </Button>
      )}

      <div className="space-y-6">
        {partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-2xl bg-secondary/50">
              <Handshake className="w-8 h-8 text-muted-foreground/50" />
            </div>

            <p className="font-medium text-muted-foreground">
              Noch keine Einträge hinzugefügt
            </p>

            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Füge Werbung, Vereinspartner oder Media-Network-Einträge hinzu, die im Footer angezeigt werden.
            </p>
          </div>
        ) : (
          PARTNER_CATEGORIES.map(category => {
            const items = sortedPartners.filter(partner =>
              getPartnerCategory(partner) === category.value
            );

            const Icon = category.icon;

            return (
              <section key={category.value}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-primary" />

                  <div>
                    <h2 className="text-sm font-black">
                      {category.label}
                    </h2>

                    <p className="text-[10px] text-muted-foreground">
                      {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}
                    </p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 bg-card/40 px-4 py-5 text-center">
                    <p className="text-xs text-muted-foreground">
                      Noch keine Einträge in diesem Bereich.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((partner) => {
                      const categoryValue = getPartnerCategory(partner);

                      return (
                        <Card
                          key={partner.id}
                          className="p-4 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {partner.logoUrl ? (
                              <img
                                src={partner.logoUrl}
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

                                <CategoryBadge category={categoryValue} />
                              </div>

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

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(partner.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}