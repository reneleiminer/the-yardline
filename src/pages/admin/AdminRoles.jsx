import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Shield,
  Users,
} from 'lucide-react';

export default function AdminRoles() {
  useSetHeader({ mode: 'back', title: 'Rollen & Nutzer' });

  const navigate = useNavigate();

  const { data: pendingApplications = [], isLoading } = useQuery({
    queryKey: ['admin-applications-pending-count'],
    queryFn: () => base44.entities.RoleApplication.filter({ status: 'pending' }),
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24">
      <div className="mb-5">
        <h1 className="text-xl font-black">Rollen & Nutzer</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Rollen werden zentral über Bewerbungen oder direkt in der Nutzerverwaltung gepflegt.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />

          <div>
            <p className="text-sm font-bold text-yellow-300">
              Rollen nicht doppelt genehmigen
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Bewerbungen sollten nur über den Bereich “Bewerbungen” genehmigt werden.
              Dort werden Rolle, Verifizierung und Vereins-/Liga-Verknüpfungen sauber gesetzt.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                <ClipboardCheck className="w-5 h-5" />
              </div>

              <h2 className="text-sm font-bold">Bewerbungen prüfen</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Rollen-Anträge genehmigen, ablehnen und Vereins-/Liga-IDs verknüpfen.
              </p>
            </div>

            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : pendingApplications.length > 0 ? (
              <Badge className="bg-primary text-primary-foreground border-0">
                {pendingApplications.length} offen
              </Badge>
            ) : null}
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => navigate('/admin/applications')}
          >
            Zu Bewerbungen
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="p-4">
          <div className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary text-foreground flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>

            <h2 className="text-sm font-bold">Nutzer verwalten</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Bestehende Nutzer prüfen, Rollen korrigieren und Verbindungen kontrollieren.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate('/admin/users')}
          >
            Zur Nutzerverwaltung
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}