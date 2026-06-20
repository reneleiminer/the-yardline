import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Eye, FileText, Loader2, Newspaper, RefreshCw, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import useSetHeader from "@/hooks/useSetHeader";
import {
  AUTO_NEWS_TYPES,
  buildAutoNewsPreview,
  getAutoNewsIdentity,
  getDefaultAutoNewsRange,
} from "@/lib/autoNewsroom";
import { getImageUrl } from "@/lib/imageUtils";

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getLegacy(post) {
  return post?.legacyData || post?.legacy_data || {};
}

function getPostIdentity(post) {
  const meta = {
    ...getLegacy(post),
    ...parseMessage(post?.message),
  };

  return meta.auto_news_identity || post?.autoNewsIdentity || "";
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

function ShellCard({ children, className = "" }) {
  return (
    <div className={`rounded-[28px] border border-white/10 bg-black/72 p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.28)] ${className}`}>
      {children}
    </div>
  );
}

export default function AdminAutoNewsroom() {
  useSetHeader({ mode: "dashboard", title: "Auto Newsroom" });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const defaultRange = useMemo(() => getDefaultAutoNewsRange("weekend_schedule"), []);
  const [type, setType] = useState("weekend_schedule");
  const [leagueId, setLeagueId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [preview, setPreview] = useState(null);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["auto-newsroom-games"],
    queryFn: () => base44.entities.Game.list("date", 1000),
    staleTime: 1000 * 60,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["auto-newsroom-leagues"],
    queryFn: () => base44.entities.League.list("name", 300),
    staleTime: 1000 * 60 * 10,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["auto-newsroom-teams"],
    queryFn: () => base44.entities.Team.list("name", 1000),
    staleTime: 1000 * 60 * 10,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["auto-newsroom-posts"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 500),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const next = getDefaultAutoNewsRange(type);
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
    setPreview(null);
  }, [type]);

  const identity = useMemo(
    () => getAutoNewsIdentity({ type, leagueId, dateFrom, dateTo }),
    [dateFrom, dateTo, leagueId, type]
  );

  const existingPost = useMemo(() => {
    return posts.find((post) => getPostIdentity(post) === identity) || null;
  }, [identity, posts]);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === leagueId) || null,
    [leagueId, leagues]
  );

  const handleGenerate = () => {
    try {
      const generated = buildAutoNewsPreview({
        type,
        leagueId,
        dateFrom,
        dateTo,
        games,
        leagues,
        teams,
      });
      setPreview(generated);
      toast.success("Vorschau erstellt");
    } catch (error) {
      setPreview(null);
      toast.error(error.message || "Vorschau konnte nicht erstellt werden");
    }
  };

  const buildPayload = (status) => {
    if (!preview) throw new Error("Bitte zuerst eine Vorschau erzeugen.");

    const publishedAtUtc = status === "published"
      ? existingPost?.publishedAtUtc || new Date().toISOString()
      : existingPost?.publishedAtUtc || "";
    const metadata = {
      ...preview.metadata,
      auto_news_identity: identity,
      generated_at_utc: new Date().toISOString(),
      status,
    };

    return {
      type: "news",
      sourceType: "auto_newsroom",
      authorUsername: "The Yardline Auto Newsroom",
      authorRole: "Admin",
      authorRoleSlug: "admin",
      title: preview.title,
      teaser: preview.teaser,
      text: preview.text,
      imageUrl: preview.imageUrl,
      images: [preview.imageUrl],
      category: "Auto News",
      leagueId: leagueId || null,
      isHidden: status !== "published",
      isDeleted: false,
      isActive: status === "published",
      featured: false,
      publishedAtUtc,
      message: JSON.stringify({
        ...metadata,
        author_name: "The Yardline",
        blocks: [
          {
            id: "auto-intro",
            type: "text",
            title: "Intro",
            text: preview.text,
          },
        ],
      }),
      legacyData: metadata,
      autoNewsIdentity: identity,
      autoNewsType: type,
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const payload = buildPayload(status);
      if (existingPost) return base44.entities.Post.update(existingPost.id, payload);
      return base44.entities.Post.create(payload);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["auto-newsroom-posts"] });
      queryClient.invalidateQueries({ queryKey: ["news-page-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      toast.success(status === "published" ? "Auto-News veröffentlicht" : "Auto-News als Entwurf gespeichert");
    },
    onError: (error) => toast.error(error.message || "Auto-News konnte nicht gespeichert werden"),
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff2338]">
            Admin
          </p>
          <h1 className="text-3xl font-black italic tracking-tight sm:text-5xl">
            Auto Newsroom
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/56">
            Erstellt automatische News aus Spielplan, Liga, Teams, Kickoff, Ergebnis und Stream-Daten.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-white/12 bg-black/60 text-white hover:bg-white/10"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <ShellCard>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d20a18]/16 text-[#ff2338]">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black italic">Generator</h2>
              <p className="text-xs font-semibold text-white/45">
                MVP: Weekend Schedule nach Liga.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Auto-News Typ">
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/12 bg-black px-3 text-sm font-black text-white outline-none focus:border-[#2f7dff]"
              >
                {AUTO_NEWS_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Liga">
              <select
                value={leagueId}
                onChange={(event) => {
                  setLeagueId(event.target.value);
                  setPreview(null);
                }}
                className="h-12 w-full rounded-2xl border border-white/12 bg-black px-3 text-sm font-black text-white outline-none focus:border-[#2f7dff]"
              >
                <option value="">Alle Ligen</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name || league.shortName}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Von">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black px-3 text-sm font-black text-white outline-none focus:border-[#2f7dff]"
                />
              </Field>
              <Field label="Bis">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black px-3 text-sm font-black text-white outline-none focus:border-[#2f7dff]"
                />
              </Field>
            </div>

            {existingPost && (
              <div className="rounded-2xl border border-[#2f7dff]/25 bg-[#2f7dff]/10 p-3 text-xs font-bold text-blue-100">
                Bestehender Auto-Beitrag gefunden. Beim Speichern wird er aktualisiert.
              </div>
            )}

            <Button
              type="button"
              className="h-12 w-full rounded-2xl bg-[#d20a18] text-sm font-black uppercase text-white hover:bg-[#ff2338]"
              disabled={gamesLoading}
              onClick={handleGenerate}
            >
              {gamesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Vorschau erzeugen
            </Button>
          </div>
        </ShellCard>

        <ShellCard className="min-h-[520px]">
          {!preview ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/5">
                <FileText className="h-8 w-8 text-white/50" />
              </div>
              <h2 className="text-2xl font-black italic">Noch keine Vorschau</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-white/48">
                Wähle Typ, Liga und Zeitraum. Danach wird ein kompletter News-Post mit Bild generiert.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff2338]">
                    {preview.label} {selectedLeague ? `- ${selectedLeague.shortName || selectedLeague.name}` : ""}
                  </p>
                  <h2 className="mt-1 text-2xl font-black italic leading-tight">{preview.title}</h2>
                  <p className="mt-1 text-xs font-bold text-white/45">
                    {preview.games.length} Spiele generiert - {format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/12 bg-black/60 text-white hover:bg-white/10"
                  onClick={handleGenerate}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Neu laden
                </Button>
              </div>

              <img
                src={getImageUrl(preview.imageUrl)}
                alt=""
                className="aspect-video w-full rounded-[26px] border border-white/10 object-cover"
              />

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Teaser</p>
                <p className="mt-2 text-sm font-bold text-white/75">{preview.teaser}</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Text</p>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm font-semibold leading-relaxed text-white/74">
                  {preview.text}
                </pre>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/12 bg-black/60 text-sm font-black uppercase text-white hover:bg-white/10"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate("draft")}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Entwurf speichern
                </Button>
                <Button
                  type="button"
                  className="h-12 rounded-2xl bg-[#d20a18] text-sm font-black uppercase text-white hover:bg-[#ff2338]"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate("published")}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Veröffentlichen
                </Button>
              </div>
            </div>
          )}
        </ShellCard>
      </div>
    </div>
  );
}
