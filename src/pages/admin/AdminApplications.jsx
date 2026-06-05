import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser.jsx';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import useSetHeader from '@/hooks/useSetHeader';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Loader2,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = {
  pending: {
    label: 'Ausstehend',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  },
  under_review: {
    label: 'In Prüfung',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
  approved: {
    label: 'Genehmigt',
    color: 'text-green-400 bg-green-400/10 border-green-400/30',
  },
  rejected: {
    label: 'Abgelehnt',
    color: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
  info_requested: {
    label: 'Info erbeten',
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  },
};

const TYPE_LABELS = {
  volunteer: 'Ehrenamt',
  professional: 'Professionell',
  official: 'Offiziell',
};

function getRequestedRoleLabel(role) {
  if (role === 'data_editor' || role === 'DataEditor') return 'Dateneditor';
  return role || 'Dateneditor';
}

function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground font-medium w-36 flex-shrink-0">
        {label}:
      </span>
      <span className="text-foreground break-words">{String(value)}</span>
    </div>
  );
}

function ApplicationCard({ app, onAction, isProcessing }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.reviewNotes || '');

  const statusConfig = STATUS_LABELS[app.status] || STATUS_LABELS.pending;
  const canReview = app.status !== 'approved' && app.status !== 'rejected';

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(current => !current)}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">
              {getRequestedRoleLabel(app.requestedRole)}
            </span>

            <span className="text-xs text-muted-foreground">
              · {TYPE_LABELS[app.applicationType] || 'Bewerbung'}
            </span>

            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {app.name || app.username || app.email || 'Unbekannt'}
            {app.created_date && ` · ${new Date(app.created_date).toLocaleDateString('de-DE')}`}
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
          <div className="space-y-2">
            <DetailRow label="Name" value={app.name} />
            <DetailRow label="E-Mail" value={app.email} />
            <DetailRow label="Benutzername" value={app.username} />
            <DetailRow label="Football-Erfahrung" value={app.experience} />
            <DetailRow label="Bekannte Ligen" value={app.knownLeagues} />
            <DetailRow label="Motivation" value={app.reason} />
            <DetailRow label="Verfügbarkeit" value={app.availability} />
            <DetailRow label="Nachricht" value={app.notes || app.shortDescription} />
            <DetailRow label="Website" value={app.website} />
            <DetailRow label="Portfolio" value={app.portfolioLink} />
          </div>

          {app.reviewNotes && (
            <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Admin-Notiz: </span>
              {app.reviewNotes}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Notiz / Begründung
            </label>

            <Textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="bg-secondary border-border/50 resize-none text-sm"
              rows={2}
              placeholder="Optional: Begründung oder Nachfrage..."
            />
          </div>

          {canReview && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                onClick={() => onAction(app, 'approved', notes)}
                disabled={isProcessing}
                className="rounded-xl bg-green-600 hover:bg-green-500 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                Genehmigen
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(app, 'info_requested', notes)}
                disabled={isProcessing}
                className="rounded-xl border-orange-500/50 text-orange-400"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Info
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(app, 'rejected', notes)}
                disabled={isProcessing}
                className="rounded-xl border-destructive/50 text-destructive"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Ablehnen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminApplications() {
  useSetHeader({ mode: 'back', title: 'Bewerbungen' });

  const { appUser } = useAppUser();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: () => base44.entities.RoleApplication.list('-created_date', 100),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const usersById = useMemo(() => {
    return Object.fromEntries(users.map(user => [user.id, user]));
  }, [users]);

  const dataEditorApplications = useMemo(() => {
    return applications.filter(application =>
      application.requestedRole === 'data_editor' ||
      application.requestedRole === 'DataEditor' ||
      application.applicationType === 'volunteer'
    );
  }, [applications]);

  const filtered = dataEditorApplications.filter(application => {
    if (typeFilter !== 'all' && application.applicationType !== typeFilter) return false;
    if (statusFilter !== 'all' && application.status !== statusFilter) return false;

    const query = search.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      application.username,
      application.name,
      application.email,
      application.experience,
      application.knownLeagues,
      application.reason,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  const approveUserRole = async application => {
    if (!application.userId) return;

    const targetUser = usersById[application.userId];
    if (!targetUser || targetUser.isOwner) return;

    await base44.entities.AppUser.update(application.userId, {
      role: 'Daten-Editor',
      roleSlug: 'data_editor',
      status: 'active',
      verified: true,
      isInternalUser: true,
      needsOnboarding: false,
      updatedAtUtc: new Date().toISOString(),
    });
  };

  const handleAction = async (application, newStatus, notes) => {
    setProcessingId(application.id);

    try {
      if (newStatus === 'approved') {
        await approveUserRole(application);
      }

      await base44.entities.RoleApplication.update(application.id, {
        status: newStatus,
        reviewedBy: appUser?.id || '',
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes || '',
      });

      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });

      toast.success(
        newStatus === 'approved'
          ? 'Bewerbung genehmigt'
          : newStatus === 'rejected'
          ? 'Bewerbung abgelehnt'
          : 'Info angefordert'
      );
    } catch (error) {
      toast.error(error.message || 'Fehler beim Bearbeiten der Bewerbung');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="text-xl font-black mb-4">Dateneditor-Bewerbungen</h1>

      <div className="flex flex-col gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="bg-secondary border-border/50 pl-9 text-sm"
            placeholder="Name, E-Mail oder Liga suchen..."
          />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-secondary border-border/50 text-sm flex-1">
              <Filter className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Typ" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="volunteer">Ehrenamt</SelectItem>
              <SelectItem value="professional">Professionell</SelectItem>
              <SelectItem value="official">Offiziell</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-secondary border-border/50 text-sm flex-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="under_review">In Prüfung</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
              <SelectItem value="info_requested">Info erbeten</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          Keine Bewerbungen gefunden.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(application => (
            <ApplicationCard
              key={application.id}
              app={application}
              onAction={handleAction}
              isProcessing={processingId === application.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}