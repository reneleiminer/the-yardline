import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppUser } from "@/lib/useAppUser";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploadField from "@/components/create/ImageUploadField";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Sport",
  "Transfers",
  "Ergebnisse",
  "Rekorde",
  "Analysen",
  "Interviews",
  "Sonstiges",
];

const ALLOWED_ROLE_SLUGS = [
  "admin",
  "journalist",
  "liga",
  "league",
  "official_media",
  "media_partner",
  "club",
  "verein",
];

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function getConnectedTeamId(appUser) {
  return (
    appUser?.connectedTeamId ||
    appUser?.connectedClubId ||
    appUser?.linkedClubId ||
    ""
  );
}

function isAllowedNewsRole(appUser) {
  const roleSlug = normalizeRole(appUser?.roleSlug || appUser?.role);

  return ALLOWED_ROLE_SLUGS.includes(roleSlug);
}

function isClubNewsAccount(appUser) {
  const roleSlug = normalizeRole(appUser?.roleSlug || appUser?.role);

  return roleSlug === "club" || roleSlug === "verein";
}

export default function CreateNews() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser, isLoading } = useAppUser();

  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const isClubAccount = isClubNewsAccount(appUser);
  const connectedTeamId = getConnectedTeamId(appUser);

  const canPublish =
    !!appUser &&
    title.trim() &&
    teaser.trim() &&
    body.trim() &&
    category &&
    image;

  const handlePublish = async () => {
    if (!appUser) {
      toast.error("Bitte zuerst einloggen.");
      return;
    }

    if (!isAllowedNewsRole(appUser)) {
      toast.error("Keine Berechtigung für News-Artikel.");
      return;
    }

    if (!canPublish) {
      toast.error("Alle Pflichtfelder ausfüllen");
      return;
    }

    if (isClubAccount && !connectedTeamId) {
      toast.error("Dieses Vereinskonto ist noch mit keinem Team verbunden.");
      return;
    }

    setLoading(true);

    try {
      const validQuotes = quotes.filter(q => q.text.trim());

      const quotesBlock =
        validQuotes.length > 0
          ? "\n\n---\n" +
            validQuotes
              .map(q => `"${q.text.trim()}"${q.author?.trim() ? ` - ${q.author.trim()}` : ""}`)
              .join("\n")
          : "";

      const now = new Date().toISOString();

      await base44.entities.Post.create({
        type: "news",
        sourceType: isClubAccount ? "club_news" : "news",

        authorId: appUser.id,
        authorUsername: appUser.username || appUser.internalUsername || "",
        authorAvatar: appUser.avatar || "",
        authorRole: appUser.role || "",
        authorRoleSlug: appUser.roleSlug || appUser.role || "",
        authorVerified: !!appUser.verified,

        title: title.trim(),
        teaser: teaser.trim(),
        text: body.trim() + quotesBlock,
        category,
        images: [image],

        leagueId: appUser?.linkedLeagueId || null,

        teamIds: isClubAccount && connectedTeamId ? [connectedTeamId] : [],
        teamId: isClubAccount && connectedTeamId ? connectedTeamId : "",
        clubId: isClubAccount && connectedTeamId ? connectedTeamId : "",
        connectedTeamId: isClubAccount && connectedTeamId ? connectedTeamId : "",

        publishedAtUtc: now,
        createdAtUtc: now,
        updatedAtUtc: now,

        likesCount: 0,
        commentsCount: 0,
      });

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["homePosts"] });

      toast.success("Artikel veröffentlicht!");
      navigate("/");
    } catch (error) {
      console.error("CREATE NEWS ERROR:", error);
      toast.error("Fehler beim Veröffentlichen");
    } finally {
      setLoading(false);
    }
  };

  const addQuote = () => {
    setQuotes(prev => [...prev, { text: "", author: "" }]);
  };

  const updateQuote = (index, field, value) => {
    setQuotes(prev =>
      prev.map((quote, currentIndex) =>
        currentIndex === index ? { ...quote, [field]: value } : quote
      )
    );
  };

  const removeQuote = index => {
    setQuotes(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (appUser && !isAllowedNewsRole(appUser)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-sm text-center">
          Keine Berechtigung für News-Artikel.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-secondary rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base font-bold">
            News Artikel
          </h1>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={!canPublish || loading}
            className="h-8 px-4 text-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Publizieren"
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">
        {isClubAccount && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs font-bold text-emerald-300">
              Vereinsnews
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dieser Artikel wird automatisch mit deinem verbundenen Verein verknüpft.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Titel *
          </label>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Schlagzeile des Artikels"
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Kategorie *
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary/50 border-border/30 rounded-xl">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(item => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Titelbild *
          </label>
          <ImageUploadField value={image} onChange={setImage} />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Teaser *
          </label>
          <textarea
            value={teaser}
            onChange={event => setTeaser(event.target.value)}
            placeholder="Kurze Zusammenfassung (1-2 Sätze)"
            rows={2}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Artikeltext *
          </label>
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            placeholder="Vollständiger Artikel..."
            rows={10}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Zitate optional
            </label>

            <button
              type="button"
              onClick={addQuote}
              className="flex items-center gap-1 text-xs text-primary font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Zitat
            </button>
          </div>

          {quotes.map((quote, index) => (
            <div
              key={index}
              className="bg-secondary/40 rounded-xl p-3 mb-2 space-y-2 border border-border/30"
            >
              <textarea
                value={quote.text}
                onChange={event => updateQuote(index, "text", event.target.value)}
                placeholder="Zitat Text..."
                rows={2}
                className="w-full bg-transparent text-sm resize-none focus:outline-none"
              />

              <div className="flex items-center gap-2">
                <input
                  value={quote.author}
                  onChange={event => updateQuote(index, "author", event.target.value)}
                  placeholder="Person optional"
                  className="flex-1 bg-transparent text-xs text-muted-foreground focus:outline-none border-t border-border/30 pt-2"
                />

                <button type="button" onClick={() => removeQuote(index)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}