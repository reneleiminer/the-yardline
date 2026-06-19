import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react';
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
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PostEditSheet from '@/components/post/PostEditSheet';
import { permanentlyDeletePost } from '@/lib/deleteUtils';

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

function getPostPreview(post) {
  return String(post?.title || post?.teaser || post?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export default function PostActionsMenu({ post, onDeleted }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('regelverstoß');
  const [reportDetails, setReportDetails] = useState('');

  if (!appUser || !post) return null;

  const isOwnPost = appUser.id === post.authorId;
  const targetType = post.type === 'official' ? 'announcement' : 'post';

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await permanentlyDeletePost(base44, post.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setDeleteOpen(false);
      onDeleted?.();
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
        subject: `Meldung: ${targetType === 'announcement' ? 'Ankündigung' : 'Beitrag'}`,
        message: [
          `Gemeldeter Inhalt: ${targetType}`,
          `ID: ${post.id}`,
          post.authorId ? `Autor-ID: ${post.authorId}` : '',
          post.authorUsername ? `Autor: ${post.authorUsername}` : '',
          `Grund: ${reportReason}`,
          reportDetails ? `Details: ${reportDetails}` : '',
          getPostPreview(post) ? `Vorschau: ${getPostPreview(post)}` : '',
        ].filter(Boolean).join('\n'),

        ticketType: 'report',
        targetType,
        targetId: post.id,
        targetUrl: window.location.href,
        targetPreview: getPostPreview(post),
        reportedUserId: post.authorId || '',
        reportedUsername: post.authorUsername || '',
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
      console.error('REPORT POST ERROR:', error);
      toast.error('Meldung konnte nicht gesendet werden');
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded-full hover:bg-secondary/60 transition-colors">
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {isOwnPost && (
            <>
              <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                <Pencil className="w-4 h-4" />
                Beitrag bearbeiten
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Beitrag löschen
              </DropdownMenuItem>
            </>
          )}

          {!isOwnPost && (
            <DropdownMenuItem
              onClick={() => setReportOpen(true)}
              className="gap-2 cursor-pointer text-yellow-500 focus:text-yellow-500"
            >
              <Flag className="w-4 h-4" />
              Beitrag melden
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isOwnPost && (
        <PostEditSheet post={post} open={editOpen} onOpenChange={setEditOpen} />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beitrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Beitrag wird unwiderruflich gelöscht und ist für niemanden mehr sichtbar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Löschenâ€¦' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beitrag melden</AlertDialogTitle>
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
              {reporting ? 'Sendenâ€¦' : 'Melden'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}