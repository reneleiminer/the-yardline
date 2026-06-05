import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Trash2,
  Eye,
  Flag,
  ExternalLink,
  MessageSquare,
  LifeBuoy,
  Send,
} from 'lucide-react';
import useSetHeader from '@/hooks/useSetHeader';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORIES = {
  score_error: 'Falscher Score / Ergebnis',
  game_error: 'Spiel fehlt oder ist falsch',
  standings_error: 'Tabellenfehler',
  team_error: 'Team- oder Ligadaten falsch',
  stream_error: 'Stream-Link falsch oder fehlt',
  app_bug: 'Technisches App-Problem',
  data_editor_application: 'Dateneditor-Bewerbung',
  initiative: 'Initiativbewerbung',
  technisches_problem: 'Technisches Problem',
  konto_login: 'Interner Login',
  rolle_verifizierung: 'Interner Zugriff',
  inhalte_melden: 'Meldung',
  sonstiges: 'Sonstiges',
  other: 'Sonstiges',
};

const STATUS_COLORS = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
  closed: 'bg-green-500/20 text-green-400 border-green-500/20',
};

const STATUS_LABELS = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  closed: 'Geschlossen',
};

const TARGET_TYPE_LABELS = {
  game: 'Spiel',
  team: 'Team',
  league: 'Liga',
  competition: 'Wettbewerb',
  standing: 'Tabelle',
  stream: 'Stream',
  other: 'Sonstiges',
  post: 'Beitrag',
  announcement: 'Ankündigung',
  comment: 'Kommentar',
  user: 'Profil',
};

const REPORT_REASON_LABELS = {
  score_error: 'Falscher Score',
  game_error: 'Falsches Spiel',
  standings_error: 'Tabellenfehler',
  team_error: 'Teamdaten falsch',
  stream_error: 'Stream falsch',
  app_bug: 'App-Problem',
  spam: 'Spam',
  beleidigung: 'Beleidigung',
  hassrede: 'Hassrede',
  belästigung: 'Belästigung',
  gewalt: 'Gewalt',
  sexuell: 'Sexueller Inhalt',
  falschinformation: 'Falschinformation',
  urheberrecht: 'Urheberrecht',
  regelverstoß: 'Regelverstoß',
  anderes: 'Anderes',
};

function getCreatedDate(ticket) {
  return ticket.createdAtUtc || ticket.created_date || new Date().toISOString();
}

function getTicketType(ticket) {
  if (ticket.ticketType === 'report' || ticket.category === 'inhalte_melden') {
    return 'report';
  }

  return 'support';
}

function getTicketTypeLabel(ticket) {
  return getTicketType(ticket) === 'report' ? 'Meldung' : 'Support';
}

function getTicketIcon(ticket) {
  return getTicketType(ticket) === 'report' ? Flag : LifeBuoy;
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [replySending, setReplySending] = useState(false);

  useSetHeader({
    mode: 'back',
    title: 'Support',
    onBack: () => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/admin');
    },
  });

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date', 200),
  });

  useEffect(() => {
    setAdminReply(selectedTicket?.adminReply || '');
  }, [selectedTicket?.id]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (typeFilter !== 'all' && getTicketType(ticket) !== typeFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, typeFilter]);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await base44.entities.SupportTicket.update(ticketId, {
        status: newStatus,
        ...(newStatus === 'closed' ? { reviewedAtUtc: new Date().toISOString() } : {}),
      });

      refetch();

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch (error) {
      console.error('UPDATE SUPPORT TICKET ERROR:', error);
      toast.error('Status konnte nicht geändert werden');
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !adminReply.trim()) {
      toast.error('Bitte eine Antwort eingeben');
      return;
    }

    setReplySending(true);

    try {
      const replyAt = new Date().toISOString();

      await base44.entities.SupportTicket.update(selectedTicket.id, {
        adminReply: adminReply.trim(),
        adminReplyAtUtc: replyAt,
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
        updatedAtUtc: replyAt,
      });

      if (selectedTicket.userId) {
        await base44.entities.Notification.create({
          userId: selectedTicket.userId,
          type: 'support_ticket',
          title: getTicketType(selectedTicket) === 'report'
            ? 'Antwort zu deiner Meldung'
            : 'Antwort vom Support',
          message: adminReply.trim().slice(0, 160),
          targetType: 'support_ticket',
          targetId: selectedTicket.id,
          iconType: getTicketType(selectedTicket) === 'report' ? 'flag' : 'support',
          isRead: false,
        });
      }

      const updatedTicket = {
        ...selectedTicket,
        adminReply: adminReply.trim(),
        adminReplyAtUtc: replyAt,
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
        updatedAtUtc: replyAt,
      };

      setSelectedTicket(updatedTicket);
      refetch();
      toast.success('Antwort gespeichert');
    } catch (error) {
      console.error('SEND SUPPORT REPLY ERROR:', error);
      toast.error('Antwort konnte nicht gespeichert werden');
    } finally {
      setReplySending(false);
    }
  };

  const handleDelete = async ticketId => {
    try {
      await base44.entities.SupportTicket.delete(ticketId);
      refetch();
      setSelectedTicket(null);
    } catch (error) {
      console.error('DELETE SUPPORT TICKET ERROR:', error);
      toast.error('Ticket konnte nicht gelöscht werden');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Support</h1>

        <div className="mb-6 flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
              <SelectItem value="closed">Geschlossen</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="report">Meldungen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Keine Tickets vorhanden.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map(ticket => {
              const Icon = getTicketIcon(ticket);
              const isReport = getTicketType(ticket) === 'report';

              return (
                <div
                  key={ticket.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isReport ? 'text-destructive' : 'text-primary'}`} />
                        <h3 className="font-bold text-sm truncate">
                          {ticket.subject}
                        </h3>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        von {ticket.userName || 'Unbekannt'} ({ticket.userEmail || 'keine E-Mail'})
                      </p>

                      {isReport && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ziel: {TARGET_TYPE_LABELS[ticket.targetType] || ticket.targetType || 'Unbekannt'}
                          {ticket.reportedUsername ? ` · gemeldet: @${ticket.reportedUsername}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {ticket.adminReply && (
                        <Badge className="text-xs border bg-primary/15 text-primary border-primary/20">
                          Beantwortet
                        </Badge>
                      )}

                      <Badge className={`text-xs border ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status || 'Offen'}
                      </Badge>

                      <Badge variant={isReport ? 'destructive' : 'outline'} className="text-xs">
                        {getTicketTypeLabel(ticket)}
                      </Badge>

                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES[ticket.category] || ticket.category || 'Support'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 whitespace-pre-wrap">
                    {ticket.targetPreview || ticket.reportDetails || ticket.message}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(getCreatedDate(ticket)), { addSuffix: true, locale: de })}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Select
                        value={ticket.status || 'open'}
                        onValueChange={value => handleStatusChange(ticket.id, value)}
                      >
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Offen</SelectItem>
                          <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                          <SelectItem value="closed">Geschlossen</SelectItem>
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Ticket löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                          <div className="flex gap-3 justify-end">
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(ticket.id)}
                              className="bg-destructive"
                            >
                              Löschen
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {React.createElement(getTicketIcon(selectedTicket), {
                      className: `w-4 h-4 flex-shrink-0 ${getTicketType(selectedTicket) === 'report' ? 'text-destructive' : 'text-primary'}`,
                    })}

                    <h2 className="font-bold text-lg truncate">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {getTicketTypeLabel(selectedTicket)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Von</p>
                  <p className="font-medium">{selectedTicket.userName || 'Unbekannt'}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.userEmail || 'keine E-Mail'}</p>

                  {selectedTicket.userId && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      User ID: {selectedTicket.userId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kategorie</p>
                    <p className="font-medium">
                      {CATEGORIES[selectedTicket.category] || selectedTicket.category || 'Support'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={`border ${STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.open}`}>
                      {STATUS_LABELS[selectedTicket.status] || selectedTicket.status || 'Offen'}
                    </Badge>
                  </div>
                </div>

                {getTicketType(selectedTicket) === 'report' && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-destructive" />
                      <p className="text-sm font-bold">Meldedetails</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Gemeldeter Bereich</p>
                        <p className="font-medium">
                          {TARGET_TYPE_LABELS[selectedTicket.targetType] || selectedTicket.targetType || 'Unbekannt'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Grund</p>
                        <p className="font-medium">
                          {REPORT_REASON_LABELS[selectedTicket.reportReason] || selectedTicket.reportReason || 'Nicht angegeben'}
                        </p>
                      </div>
                    </div>

                    {selectedTicket.targetPreview && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Vorschau</p>
                        <p className="bg-background/70 p-3 rounded-lg text-sm whitespace-pre-wrap">
                          {selectedTicket.targetPreview}
                        </p>
                      </div>
                    )}

                    {selectedTicket.reportDetails && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Zusätzliche Details</p>
                        <p className="bg-background/70 p-3 rounded-lg text-sm whitespace-pre-wrap">
                          {selectedTicket.reportDetails}
                        </p>
                      </div>
                    )}

                    {selectedTicket.targetUrl && (
                      <a
                        href={selectedTicket.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Bereich öffnen
                      </a>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Nachricht</p>
                  <p className="bg-secondary p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedTicket.message}
                  </p>
                </div>

                {selectedTicket.adminReply && (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <p className="text-sm font-bold">Aktuelle Antwort</p>
                    </div>

                    <p className="text-sm whitespace-pre-wrap">
                      {selectedTicket.adminReply}
                    </p>

                    {selectedTicket.adminReplyAtUtc && (
                      <p className="text-[10px] text-muted-foreground mt-3">
                        {new Date(selectedTicket.adminReplyAtUtc).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold">Antwort</p>
                  </div>

                  <Textarea
                    value={adminReply}
                    onChange={event => setAdminReply(event.target.value)}
                    placeholder="Antwort schreiben..."
                    className="min-h-28 resize-none"
                  />

                  <Button
                    onClick={handleSendReply}
                    disabled={replySending || !adminReply.trim()}
                    className="w-full mt-3"
                  >
                    {replySending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Antwort speichern
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={selectedTicket.status || 'open'}
                    onValueChange={value => handleStatusChange(selectedTicket.id, value)}
                  >
                    <SelectTrigger className="w-44 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Offen</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="closed">Geschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Erstellt: {new Date(getCreatedDate(selectedTicket)).toLocaleString('de-DE')}
                  </p>

                  {selectedTicket.reviewedAtUtc && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Bearbeitet: {new Date(selectedTicket.reviewedAtUtc).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}