import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Eye, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/imageUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const INTERNAL_APP_UPDATE_VERSIONS = new Set([
  'game_highlight',
  'ad_banner',
  'community_clip',
  'community_clip_submission',
  'analytics_event',
  'gameday_photo',
  'game_prediction',
  'app_branding',
]);

const EMPTY_FORM = {
  title: '',
  message: '',
  imageUrl: '',
  version: '',
  updateType: 'update',
  isActive: true,
};

const UPDATE_TYPES = [
  { value: 'fix', label: 'Fix' },
  { value: 'update', label: 'Update' },
  { value: 'performance', label: 'Performance' },
  { value: 'admin', label: 'Admin' },
  { value: 'content', label: 'Content' },
];

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function validateVersion(value) {
  const version = normalizeVersion(value);

  if (!version) return true;

  return /^\d+\.\d+\.\d+([+-][a-zA-Z0-9.-]+)?(\s+[a-zA-Z0-9.-]+)?$/.test(version);
}

function getUpdateMessage(update) {
  return update?.message || update?.text || '';
}

function getUpdateMeta(update) {
  const raw = update?.legacyData || update?.legacy_data;
  if (!raw) return {};

  if (typeof raw === 'object') return raw;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function AdminUpdates() {
  useSetHeader({ mode: 'back', title: 'App Updates' });

  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['adminAppUpdates'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.filter(update =>
        !INTERNAL_APP_UPDATE_VERSIONS.has(update.version)
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAppUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
      toast.success('Update erstellt');
      resetForm();
    },
    onError: error => {
      console.error('CREATE APP UPDATE ERROR:', error);
      toast.error('Fehler beim Erstellen');
    },
  });

  const updateMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAppUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
      toast.success('Update aktualisiert');
      resetForm();
    },
    onError: error => {
      console.error('UPDATE APP UPDATE ERROR:', error);
      toast.error('Fehler beim Aktualisieren');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.AppUpdate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAppUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
      toast.success('Update gelöscht');
    },
    onError: error => {
      console.error('DELETE APP UPDATE ERROR:', error);
      toast.error('Fehler beim Löschen');
    },
  });

  const buildPayload = () => {
    const message = formData.message.trim();

    return {
      title: formData.title.trim(),
      message,
      text: message,
      imageUrl: formData.imageUrl.trim() || '',
      version: normalizeVersion(formData.version) || '',
      isActive: formData.isActive === true,
      legacyData: {
        updateType: formData.updateType || 'update',
        source: 'admin_updates',
        createdBy: 'admin',
      },
    };
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Bitte einen Titel eintragen');
      return false;
    }

    if (!formData.message.trim()) {
      toast.error('Bitte einen Update-Text eintragen');
      return false;
    }

    if (!validateVersion(formData.version)) {
      toast.error('Version bitte z.B. als 0.9.9 oder v0.9.9 Beta eintragen');
      return false;
    }

    return true;
  };

  const handleCreate = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    if (!validateForm()) return;

    createMutation.mutate(buildPayload());
  };

  const handleUpdate = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    if (!validateForm()) return;

    updateMutation.mutate(buildPayload());
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
    setShowPreview(false);
  };

  const handleEdit = update => {
    setFormData({
      title: update.title || '',
      message: getUpdateMessage(update),
      imageUrl: update.imageUrl || '',
      version: update.version || '',
      updateType: getUpdateMeta(update).updateType || 'update',
      isActive: update.isActive === true,
    });
    setEditingId(update.id);
    setShowForm(true);
  };

  const openCreateForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setShowPreview(false);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-blue-950/70 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Admin
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              App Updates
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Erstelle öffentliche Changelogs mit Version, Text und optionalem Bild.
        </p>
      </section>

      {!showForm && (
        <Button
          onClick={openCreateForm}
          className="w-full mb-5 rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Update
        </Button>
      )}

      {showForm && (
        <section className="bg-card border border-border/50 rounded-2xl p-5 mb-5 space-y-4">
          <h2 className="font-bold text-sm">
            {editingId ? 'Update bearbeiten' : 'Neues Update'}
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Version
            </label>

            <Input
              value={formData.version}
              onChange={event => setFormData(current => ({ ...current, version: event.target.value }))}
              placeholder="z.B. v0.9.9 Beta"
              className="h-11 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Typ
            </label>

            <select
              value={formData.updateType}
              onChange={event => setFormData(current => ({ ...current, updateType: event.target.value }))}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {UPDATE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Titel
            </label>

            <Input
              value={formData.title}
              onChange={event => setFormData(current => ({ ...current, title: event.target.value }))}
              placeholder="Kurzer Update-Titel"
              className="h-11 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Text
            </label>

            <Textarea
              value={formData.message}
              onChange={event => setFormData(current => ({ ...current, message: event.target.value }))}
              placeholder="Was ist neu?"
              className="min-h-[140px] text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Bild URL optional
            </label>

            <Input
              value={formData.imageUrl}
              onChange={event => setFormData(current => ({ ...current, imageUrl: event.target.value }))}
              placeholder="https://..."
              className="h-11 text-sm"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Veröffentlicht</p>
                <p className="text-[10px] text-muted-foreground">Auf der Updates-Seite anzeigen</p>
              </div>

              <Switch
                checked={formData.isActive}
                onCheckedChange={value => setFormData(current => ({ ...current, isActive: value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              disabled={!formData.title.trim() || !formData.message.trim()}
            >
              <Eye className="w-4 h-4 mr-2" />
              Vorschau
            </Button>

            <Button
              type="button"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                editingId ? 'Speichern' : 'Erstellen'
              )}
            </Button>

            <Button
              type="button"
              onClick={resetForm}
              variant="ghost"
            >
              Abbrechen
            </Button>
          </div>
        </section>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm overflow-hidden">
          {formData.imageUrl && (
            <div className="relative -mx-6 -mt-6 mb-4 w-[calc(100%+48px)]">
              <img
                src={getImageUrl(formData.imageUrl)}
                alt=""
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          <DialogHeader>
            <DialogTitle>{formData.title || 'Titel'}</DialogTitle>
          </DialogHeader>

          {formData.version && (
            <Badge variant="outline" className="w-fit">
              v{normalizeVersion(formData.version)}
            </Badge>
          )}

          <Badge className="w-fit">
            {UPDATE_TYPES.find(type => type.value === formData.updateType)?.label || 'Update'}
          </Badge>

          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {formData.message || 'Update-Text'}
          </p>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {updates.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Keine Updates erstellt
            </p>
          </div>
        ) : (
          updates.map(update => {
            const message = getUpdateMessage(update);
            const meta = getUpdateMeta(update);
            const typeLabel = UPDATE_TYPES.find(type => type.value === meta.updateType)?.label || 'Update';

            return (
              <article key={update.id} className="rounded-2xl border border-border/50 bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm truncate">
                        {update.title}
                      </h3>

                      {update.version && (
                        <Badge variant="outline" className="text-[10px]">
                          v{normalizeVersion(update.version)}
                        </Badge>
                      )}

                      <Badge className="text-[10px] bg-primary/15 text-primary">
                        {typeLabel}
                      </Badge>

                      {update.isActive && (
                        <Badge className="text-[10px] bg-green-500/20 text-green-400">
                          Aktiv
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleEdit(update)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs flex-1"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Bearbeiten
                  </Button>

                  <Button
                    onClick={() => deleteMutation.mutate(update.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
