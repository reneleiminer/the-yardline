import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSetHeader from "@/hooks/useSetHeader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getImageUrl } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Loader2,
  Newspaper,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS = {
  news: "News",
  transfer: "Transfer",
  official: "Official",
  community: "Community",
  post: "Post",
};

function parseJsonMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getPostDate(post) {
  return post?.publishedAtUtc || post?.createdAtUtc || post?.created_date || post?.createdAt || "";
}

function formatDate(value) {
  if (!value) return "ohne Datum";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ohne Datum";

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPostImage(post) {
  if (Array.isArray(post?.images) && post.images.filter(Boolean).length > 0) {
    return post.images.filter(Boolean)[0];
  }

  if (post?.imageUrl) return post.imageUrl;
  if (post?.coverImageUrl) return post.coverImageUrl;
  if (post?.thumbnailUrl) return post.thumbnailUrl;
  if (post?.image) return post.image;

  const meta = parseJsonMessage(post?.message);
  return meta.image_url || meta.imageUrl || meta.thumbnail_url || meta.thumbnailUrl || "";
}

function getPostType(post) {
  return post?.type || "post";
}

function getStatus(post) {
  if (post?.isDeleted) return "deleted";
  if (post?.isHidden) return "hidden";
  if (post?.isActive === false) return "inactive";
  return "visible";
}

function getStatusLabel(status) {
  if (status === "deleted") return "Gelöscht";
  if (status === "hidden") return "Ausgeblendet";
  if (status === "inactive") return "Inaktiv";
  return "Sichtbar";
}

function getStatusClass(status) {
  if (status === "deleted") return "bg-red-500/15 text-red-400 border-red-500/20";
  if (status === "hidden") return "bg-orange-500/15 text-orange-300 border-orange-500/20";
  if (status === "inactive") return "bg-slate-500/15 text-slate-300 border-slate-500/20";
  return "bg-green-500/15 text-green-300 border-green-500/20";
}

function isAutoGameReport(post) {
  const meta = parseJsonMessage(post?.message);
  const authorUsername = String(post?.authorUsername || "").toLowerCase();
  const authorRole = String(post?.authorRoleSlug || post?.authorRole || "").toLowerCase();

  return (
    post?.isGameReport === true ||
    meta.is_game_report === true ||
    meta.isGameReport === true ||
    authorUsername === "yardline-system" ||
    authorUsername === "yardline_system" ||
    authorRole === "system"
  );
}

function isAdminManagedPost(post) {
  return !isAutoGameReport(post);
}

function getAuthorName(post, usersById) {
  const author = post?.authorId ? usersById.get(post.authorId) : null;
  const meta = parseJsonMessage(post?.message);

  return (
    author?.displayName ||
    author?.username ||
    post?.authorUsername ||
    meta.author_name ||
    meta.authorName ||
    "Unbekannt"
  );
}

function PostAdminCard({
  post,
  usersById,
  onHide,
  onShow,
  onSoftDelete,
  onHardDelete,
  isWorking,
}) {
  const image = getPostImage(post);
  const type = getPostType(post);
  const status = getStatus(post);
  const authorName = getAuthorName(post, usersById);
  const meta = parseJsonMessage(post.message);
  const previewText = post.teaser || post.text || meta.text || meta.description || "";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/72 text-white shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
      <div className="grid grid-cols-[92px_1fr] gap-3 p-3 sm:grid-cols-[132px_1fr]">
        <div className="h-[92px] overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:h-[132px]">
          {image ? (
            <img
              src={getImageUrl(image)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-900/60 via-black to-blue-900/60">
              <Newspaper className="h-7 w-7 text-white/48" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge className="border border-white/10 bg-white/10 text-[10px] uppercase text-white">
              {TYPE_LABELS[type] || type}
            </Badge>
            <Badge className={`border text-[10px] uppercase ${getStatusClass(status)}`}>
              {getStatusLabel(status)}
            </Badge>
          </div>

          <h2 className="line-clamp-2 text-base font-black leading-tight sm:text-lg">
            {post.title || "Ohne Titel"}
          </h2>

          {previewText && (
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-white/55">
              {previewText}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-white/38">
            <span>{formatDate(getPostDate(post))}</span>
            <span>von {authorName}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/post/${post.id}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 px-3 text-xs font-black text-white hover:bg-white/12"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Öffnen
            </Link>

            {status === "visible" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onHide(post)}
                disabled={isWorking}
                className="h-9 rounded-xl text-xs"
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Ausblenden
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onShow(post)}
                disabled={isWorking}
                className="h-9 rounded-xl text-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Wiederherstellen
              </Button>
            )}

            {status !== "deleted" && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onSoftDelete(post)}
                disabled={isWorking}
                className="h-9 rounded-xl text-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Löschen
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onHardDelete(post)}
              disabled={isWorking}
              className="h-9 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-black text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              Endgültig löschen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminContent() {
  useSetHeader({
    mode: "back",
    title: "Beiträge verwalten",
    backTo: "/admin",
  });

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-content-posts"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-content-users"],
    queryFn: () => base44.entities.AppUser.list("-created_date", 500),
  });

  const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-content-posts"] });
    queryClient.invalidateQueries({ queryKey: ["home-overview-news"] });
    queryClient.invalidateQueries({ queryKey: ["news-page-posts"] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const updatePostMutation = useMutation({
    mutationFn: async ({ post, updates }) => {
      return base44.entities.Post.update(post.id, {
        ...updates,
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Beitrag aktualisiert");
    },
    onError: error => {
      toast.error(error.message || "Beitrag konnte nicht aktualisiert werden");
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async post => base44.entities.Post.delete(post.id),
    onSuccess: () => {
      invalidate();
      toast.success("Beitrag endgültig gelöscht");
    },
    onError: error => {
      toast.error(error.message || "Beitrag konnte nicht endgültig gelöscht werden");
    },
  });

  const deleteAutoGameReportsMutation = useMutation({
    mutationFn: async () => {
      const autoReports = posts.filter(isAutoGameReport);
      const results = await Promise.allSettled(
        autoReports.map(post => base44.entities.Post.delete(post.id))
      );

      const failed = results.filter(result => result.status === "rejected");

      if (failed.length > 0) {
        throw new Error(`${failed.length} automatische Game Reports konnten nicht gelöscht werden.`);
      }

      return autoReports.length;
    },
    onSuccess: count => {
      invalidate();
      toast.success(`${count} automatische Game Reports gelöscht`);
    },
    onError: error => {
      toast.error(error.message || "Automatische Game Reports konnten nicht gelöscht werden");
    },
  });

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts
      .filter(isAdminManagedPost)
      .filter(post => {
        if (typeFilter !== "all" && getPostType(post) !== typeFilter) return false;
        if (statusFilter !== "all" && getStatus(post) !== statusFilter) return false;

        if (!query) return true;

        const authorName = getAuthorName(post, usersById);

        return [
          post.title,
          post.teaser,
          post.text,
          post.category,
          post.type,
          post.authorUsername,
          authorName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(getPostDate(a) || 0).getTime();
        const dateB = new Date(getPostDate(b) || 0).getTime();
        return dateB - dateA;
      });
  }, [posts, search, statusFilter, typeFilter, usersById]);

  const counts = useMemo(() => {
    const managedPosts = posts.filter(isAdminManagedPost);
    const autoReports = posts.filter(isAutoGameReport);

    return {
      total: managedPosts.length,
      visible: managedPosts.filter(post => getStatus(post) === "visible").length,
      hidden: managedPosts.filter(post => getStatus(post) === "hidden").length,
      deleted: managedPosts.filter(post => getStatus(post) === "deleted").length,
      autoReports: autoReports.length,
    };
  }, [posts]);

  const isWorking =
    updatePostMutation.isPending ||
    hardDeleteMutation.isPending ||
    deleteAutoGameReportsMutation.isPending;

  const handleHardDelete = post => {
    const confirmed = window.confirm(
      `Beitrag "${post.title || "Ohne Titel"}" endgültig löschen? Das kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    hardDeleteMutation.mutate(post);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 pb-24 sm:px-4">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
          Admin Content
        </p>
        <h1 className="mt-1 text-2xl font-black leading-tight">
          Beiträge verwalten
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Hier kannst du News, Transfers und andere Beiträge ausblenden, wiederherstellen oder endgültig löschen.
        </p>

        {counts.autoReports > 0 && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm font-black text-red-200">
              {counts.autoReports} alte automatische Game Reports gefunden
            </p>
            <p className="mt-1 text-xs leading-relaxed text-red-100/62">
              Diese alten System-Beiträge werden nicht mehr genutzt und können gesammelt entfernt werden.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-3"
              disabled={isWorking}
              onClick={() => {
                const confirmed = window.confirm("Alle alten automatischen Game Reports endgültig löschen?");
                if (confirmed) deleteAutoGameReportsMutation.mutate();
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Alte Auto Game Reports löschen
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: "Alle", value: counts.total },
          { label: "Sichtbar", value: counts.visible },
          { label: "Ausgeblendet", value: counts.hidden },
          { label: "Gelöscht", value: counts.deleted },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-black/72 p-3 text-center text-white">
            <p className="text-xl font-black">{item.value}</p>
            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wide text-white/45">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-3xl border border-white/10 bg-black/72 p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Beitrag, Autor oder Typ suchen"
              className="pl-9"
            />
          </div>

          <select
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none"
          >
            <option value="all">Alle Typen</option>
            <option value="news">News</option>
            <option value="transfer">Transfers</option>
            <option value="official">Official</option>
            <option value="community">Community</option>
            <option value="post">Posts</option>
          </select>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="visible">Sichtbar</option>
            <option value="hidden">Ausgeblendet</option>
            <option value="deleted">Gelöscht</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-black/72 p-8 text-center text-sm font-bold text-white/50">
          Keine Beiträge gefunden.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <PostAdminCard
              key={post.id}
              post={post}
              usersById={usersById}
              isWorking={isWorking}
              onHide={item => updatePostMutation.mutate({
                post: item,
                updates: {
                  isHidden: true,
                },
              })}
              onShow={item => updatePostMutation.mutate({
                post: item,
                updates: {
                  isHidden: false,
                  isDeleted: false,
                  isActive: true,
                },
              })}
              onSoftDelete={item => updatePostMutation.mutate({
                post: item,
                updates: {
                  isHidden: true,
                  isDeleted: true,
                },
              })}
              onHardDelete={handleHardDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
