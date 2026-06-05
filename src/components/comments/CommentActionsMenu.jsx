import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Check, X, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { permanentlyDeleteComment } from '@/lib/deleteUtils';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'beleidigung', label: 'Beleidigung' },
  { value: 'hassrede', label: 'Hassrede' },
  { value: 'belästigung', label: 'Belästigung' },
  { value: 'gewalt', label: 'Gewalt' },
  { value: 'sexuell', label: 'Sexueller Inhalt' },
  { value: 'falschinformation', label: 'Falschinformation' },
  { value: 'urheberrecht', label: 'Urheberrecht' },
  { value: 'regelverstoß', label: 'Regelverstoß' },
  { value: 'anderes', label: 'Anderes' },
];

function getCommentPreview(comment) {
  return String(comment?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export default function CommentActionsMenu({ comment, postId, appUser }) {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('regelverstoß');
  const [reportDetails, setReportDetails] = useState('');

  if (!appUser || !comment) return null;

  const isOwn = appUser.id === comment.authorId;
  const isAdmin = appUser.role === 'Admin' || appUser.roleSlug === 'admin';

  const handleSave = async () => {
    if (!editText.trim()) return;

    setSaving(true);

    try {
      await base44.entities.Comment.update(comment.id, {
        text: editText.trim(),
        updatedAtUtc: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await permanentlyDeleteComment(base44, comment.id, postId);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } finally {
      setDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast.error('Bitte wähle einen Grund aus');
      return;
    }

    setReporting(true);

    try {
      await base44.entities.SupportTicket.create({
        userId: appUser.id,
        userName: appUser.displayName || appUser.username || appUser.email || 'Unbekannt',
        userEmail: appUser.email || '',
        category: 'inhalte_melden',
        subject: 'Meldung: Kommentar',
        message: [
          'Gemeldeter Inhalt: Kommentar',
          `Kommentar-ID: ${comment.id}`,
          `Post-ID: ${postId}`,
          comment.authorId ? `Autor-ID: ${comment.authorId}` : '',
          `Grund: ${reportReason}`,
          reportDetails ? `Details: ${reportDetails}` : '',
          getCommentPreview(comment) ? `Vorschau: ${getCommentPreview(comment)}` : '',
        ].filter(Boolean).join('\n'),

        ticketType: 'report',
        targetType: 'comment',
        targetId: comment.id,
        targetUrl: window.location.href,
        targetPreview: getCommentPreview(comment),
        reportedUserId: comment.authorId || '',
        reportedUsername: '',
        reportReason,
        reportDetails: reportDetails.trim(),
        createdAtUtc: new Date().toISOString(),
        status: 'open',
      });

      toast.success('Meldung gesendet');
      setReportOpen(false);
      setReportReason('regelverstoß');
      setReportDetails('');
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    } catch (error) {
      console.error('REPORT COMMENT ERROR:', error);
      toast.error('Meldung konnte nicht gesendet werden');
    } finally {
      setReporting(false);
    }
  };

  if (editing) {
    return (
      <div className="flex-1 min-w-0 mt-1">
        <Textarea
          value={editText}
          onChange={event => setEditText(event.target.value)}
          className="min-h-[72px] text-sm resize-none"
          autoFocus
        />

        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !editText.trim()}
            className="h-7 px-3 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setEditText(comment.text);
            }}
            className="h-7 px-3 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded-full hover:bg-secondary/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {isOwn && (
            <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2 cursor-pointer">
              <Pencil className="w-3.5 h-3.5" />
              Kommentar bearbeiten
            </DropdownMenuItem>
          )}

          {!isOwn && (
            <DropdownMenuItem
              onClick={() => setReportOpen(true)}
              className="gap-2 cursor-pointer text-yellow-500 focus:text-yellow-500"
            >
              <Flag className="w-3.5 h-3.5" />
              Kommentar melden
            </DropdownMenuItem>
          )}

          {(isOwn || isAdmin) && (
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Löschen…' : 'Kommentar löschen'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kommentar melden</AlertDialogTitle>
            <AlertDialogDescription>
              Deine Meldung wird als Ticket an das Moderationsteam gesendet.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Grund
              </label>
              <select
                value={reportReason}
                onChange={event => setReportReason(event.target.value)}
                className="w-full rounded-lg bg-secondary border border-border/50 px-3 py-2 text-sm"
              >
                {REPORT_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Details optional
              </label>
              <textarea
                value={reportDetails}
                onChange={event => setReportDetails(event.target.value)}
                rows={3}
                className="w-full rounded-lg bg-secondary border border-border/50 px-3 py-2 text-sm resize-none"
                placeholder="Was ist dir aufgefallen?"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reporting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport} disabled={reporting}>
              {reporting ? 'Senden…' : 'Melden'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}