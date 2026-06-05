import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Camera,
  Crown,
  Lightbulb,
  Loader2,
  Megaphone,
  Newspaper,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

const ROLE_DESCRIPTIONS = {
  fan: {
    name: 'Fan',
    description: 'Kann Community-Beiträge posten und Vereinen folgen',
    icon: Users,
  },
  creator: {
    name: 'Creator',
    description: 'Kann Inhalte und Highlights veröffentlichen',
    icon: Lightbulb,
  },
  photographer: {
    name: 'Fotograf',
    description: 'Kann Fotos und Galerien hochladen',
    icon: Camera,
  },
  journalist: {
    name: 'Journalist',
    description: 'Kann Artikel, News und Berichte veröffentlichen',
    icon: Newspaper,
  },
  official_media: {
    name: 'Offizielle Medien',
    description: 'Offizielles Medienkonto ohne Verein- oder Liga-Verknüpfung',
    icon: Megaphone,
  },
  moderator: {
    name: 'Moderator',
    description: 'Moderiert Community-Inhalte und Nutzer',
    icon: Shield,
  },
  data_editor: {
    name: 'Daten-Editor',
    description: 'Pflegt Spielpläne, Ergebnisse und Ligadaten',
    icon: TrendingUp,
  },
  admin: {
    name: 'Admin',
    description: 'Vollständige Verwaltungsrechte',
    icon: Crown,
  },
};

export default function RoleChangeModal({
  open,
  onOpenChange,
  user,
  selectedRole,
  onRoleSelect,
  onConfirm,
  isPending,
}) {
  if (!user) return null;

  const availableRoles = Object.keys(ROLE_DESCRIPTIONS)
    .filter(slug => {
      if (slug === 'admin' && user.roleSlug !== 'admin') return false;
      return true;
    })
    .map(slug => ({
      slug,
      ...ROLE_DESCRIPTIONS[slug],
    }));

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Rolle für {user.username} ändern
          </AlertDialogTitle>

          <AlertDialogDescription>
            Wähle eine direkte Rolle. Verein und Liga werden über die Verknüpfung im Nutzer-Menü gesetzt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 max-h-96 overflow-y-auto">
          {availableRoles.map(roleData => {
            const isSelected = selectedRole === roleData.slug;
            const Icon = roleData.icon;

            return (
              <button
                key={roleData.slug}
                onClick={() => onRoleSelect(roleData.slug)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/15 shadow-lg shadow-primary/20'
                    : 'border-border/40 bg-secondary/40 hover:border-border/60 hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  />

                  <span className={`text-sm font-semibold ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                  >
                    {roleData.name}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-snug">
                  {roleData.description}
                </p>

                {isSelected && (
                  <div className="mt-2 text-primary text-xs font-medium">
                    Ausgewählt
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <AlertDialogCancel>
            Abbrechen
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            disabled={
              selectedRole === (user.roleSlug || 'fan').toLowerCase() ||
              isPending
            }
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Bestätigen'
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}