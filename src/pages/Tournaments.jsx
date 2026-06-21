import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Loader2,
  Pencil,
  PlaySquare,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import useSetHeader from "@/hooks/useSetHeader";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { canAccessLeague } from "@/lib/rolePermissions";

const CLOUDINARY_CLOUD_NAME = "dsd5ajgru";
const CLOUDINARY_UPLOAD_PRESET = "theyardline_upload";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const HIGHLIGHT_VERSION = "game_highlight";

const EMPTY_FORM = {
  title: "",
  description: "",
  thumbnail_url: "",
  external_video_url: "",
  source_name: "",
  preview_video_url: "",
  league_id: "",
  team_id: "",
  game_id: "",
  date: "",
  active: true,
};

function normalizeUrl(value) {
  return String(value || "").trim();
}

function getYoutubeId(url) {
  const value = normalizeUrl(url);

  if (!value) return "";

  const patterns = [
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function getYoutubeMaxThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

function getYoutubeFallbackThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function imageExists(url) {
  return new Promise(resolve => {
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();

    img.onload = () => {
      resolve(img.naturalWidth > 120);
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = url;
  });
}

async function getBestYoutubeThumbnail(url) {
  const videoId = getYoutubeId(url);

  if (!videoId) return "";

  const maxres = getYoutubeMaxThumbnail(videoId);
  const hasMaxres = await imageExists(maxres);

  if (hasMaxres) return maxres;

  return getYoutubeFallbackThumbnail(videoId);
}

function getCloudinaryThumbnail(videoUrl) {
  const value = normalizeUrl(videoUrl);

  if (!value.includes("res.cloudinary.com") || !value.includes("/video/upload/")) {
    return "";
  }

  return value
    .replace("/video/upload/", "/video/upload/so_0/")
    .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg");
}

function getGameDate(game) {
  if (game.kickoffAt) return new Date(game.kickoffAt);
  if (game.date) return new Date(game.date);
  return null;
}

function formatGameDate(game) {
  const date = getGameDate(game);

  if (!date || Number.isNaN(date.getTime())) return "Termin offen";

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getTeamName(team, fallback = "Offen") {
  return team?.shortName || team?.name || fallback;
}

function getGameLabel(game, teamsById) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);

  return `${formatGameDate(game)} · ${homeName} vs ${awayName}`;
}

function parseHighlightMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {
      description: message,
    };
  }
}

function normalizeHighlight(item) {
  const meta = parseHighlightMessage(item.message);
  const createdAt =
    meta.created_at ||
    meta.createdAt ||
    item.createdAtUtc ||
    item.created_date ||
    item.createdAt ||
    item.created_at ||
    "";

  return {
    ...item,
    title: item.title || "",
    description: meta.description || "",
    thumbnail_url: meta.thumbnail_url || item.imageUrl || "",
    external_video_url: meta.external_video_url || "",
    source_name: meta.source_name || "",
    league_id: meta.league_id || "",
    team_id: meta.team_id || "",
    game_id: meta.game_id || "",
    date: meta.date || "",
    active: item.isActive !== false && meta.active !== false,
    preview_video_url: meta.preview_video_url || "",
    created_at: createdAt,
  };
}

async function uploadVideoToCloudinary(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "the-yardline/highlights/previews");

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary Upload fehlgeschlagen");
  }

  return data;
}

function SelectField({ label, value, onChange, children, disabled = false }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60"
      >
        {children}
      </select>
    </label>
  );
}

function HighlightPreview({ highlight }) {
  const [videoErrored, setVideoErrored] = useState(false);
  const [imageErrored, setImageErrored] = useState(false);
  const previewVideoUrl = normalizeUrl(highlight.preview_video_url);
  const rawThumbnailUrl =
    normalizeUrl(highlight.thumbnail_url || highlight.imageUrl) ||
    getCloudinaryThumbnail(previewVideoUrl);
  const youtubeFallbackUrl = getYoutubeId(highlight.external_video_url)
    ? getYoutubeFallbackThumbnail(getYoutubeId(highlight.external_video_url))
    : "";
  const thumbnailUrl = imageErrored ? youtubeFallbackUrl : rawThumbnailUrl;
  const showVideo = previewVideoUrl && !videoErrored;

  return (
    <div className="w-full">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-black">
        {showVideo ? (
          <video
            src={previewVideoUrl}
            poster={thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            controls={false}
            onError={() => setVideoErrored(true)}
          />
        ) : thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={highlight.title || ""}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(event) => {
                const videoId = getYoutubeId(highlight.external_video_url);

                if (videoId && event.currentTarget.src !== getYoutubeFallbackThumbnail(videoId)) {
                  event.currentTarget.src = getYoutubeFallbackThumbnail(videoId);
                  return;
                }

                setImageErrored(true);
              }}
            />
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-primary/90 text-white flex items-center justify-center">
                <PlaySquare className="w-5 h-5" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,#0b1220,#000_52%,#1b0508)] px-4 text-center">
            <PlaySquare className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground">
              {highlight.title || "Thumbnail oder Preview hochladen"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightForm({
  formData,
  setFormData,
  editingId,
  onSubmit,
  onCancel,
  isSaving,
  leagues,
  teams,
  games,
}) {
  const [uploading, setUploading] = useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);

  const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map(league => [league.id, league])), [leagues]);

  const leagueTeams = useMemo(() => {
    if (!formData.league_id) return [];

    return teams
      .filter(team => team.leagueId === formData.league_id)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [formData.league_id, teams]);

  const filteredGames = useMemo(() => {
    return games
      .filter(game => {
        if (formData.league_id && game.leagueId !== formData.league_id) return false;

        if (formData.team_id) {
          return game.homeTeamId === formData.team_id || game.awayTeamId === formData.team_id;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = getGameDate(a)?.getTime() || 0;
        const dateB = getGameDate(b)?.getTime() || 0;

        return dateB - dateA;
      });
  }, [formData.league_id, formData.team_id, games]);

  const set = (key, value) => {
    setFormData(current => ({
      ...current,
      [key]: value,
    }));
  };

  const handleLeagueChange = leagueId => {
    setFormData(current => ({
      ...current,
      league_id: leagueId,
      team_id: "",
      game_id: "",
    }));
  };

  const handleTeamChange = teamId => {
    setFormData(current => ({
      ...current,
      team_id: teamId,
      game_id: "",
    }));
  };

  const handleGameChange = gameId => {
    const selectedGame = games.find(game => game.id === gameId);

    setFormData(current => ({
      ...current,
      game_id: gameId,
      league_id: selectedGame?.leagueId || current.league_id,
      date: current.date || (selectedGame?.date || ""),
    }));
  };

  const handleExternalUrlChange = async value => {
    setFormData(current => ({
      ...current,
      external_video_url: value,
    }));

    const videoId = getYoutubeId(value);

    if (!videoId) return;

    setLoadingThumbnail(true);

    try {
      const thumbnailUrl = await getBestYoutubeThumbnail(value);

      setFormData(current => ({
        ...current,
        thumbnail_url: current.thumbnail_url || thumbnailUrl,
        source_name: current.source_name || "YouTube",
      }));
    } finally {
      setLoadingThumbnail(false);
    }
  };

  const handlePreviewUpload = async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Bitte eine Video-Datei auswählen");
      return;
    }

    setUploading(true);

    try {
      const uploaded = await uploadVideoToCloudinary(file);
      const previewVideoUrl = uploaded.secure_url;
      const thumbnailUrl = getCloudinaryThumbnail(previewVideoUrl);

      setFormData(current => ({
        ...current,
        preview_video_url: previewVideoUrl,
        thumbnail_url: current.thumbnail_url || thumbnailUrl,
      }));

      toast.success("Preview-Video hochgeladen");
    } catch (error) {
      toast.error(error.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const selectedLeague = leaguesById.get(formData.league_id);
  const selectedTeam = teamsById.get(formData.team_id);
  const selectedGame = games.find(game => game.id === formData.game_id);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">
            {editingId ? "Highlight bearbeiten" : "Game Highlight posten"}
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Externer Link als Ziel, optional stumme Preview hochladen.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"
          aria-label="Schließen"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="space-y-3">
          <Input
            value={formData.title}
            onChange={event => set("title", event.target.value)}
            placeholder="Titel"
            autoComplete="off"
          />

          <Textarea
            value={formData.description}
            onChange={event => set("description", event.target.value)}
            placeholder="Beschreibung optional"
            className="min-h-20"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField
              label="Liga optional"
              value={formData.league_id}
              onChange={handleLeagueChange}
            >
              <option value="">Keine Liga</option>
              {leagues
                .slice()
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map(league => (
                  <option key={league.id} value={league.id}>
                    {league.name || league.shortName || league.id}
                  </option>
                ))}
            </SelectField>

            <SelectField
              label="Team optional"
              value={formData.team_id}
              onChange={handleTeamChange}
              disabled={!formData.league_id}
            >
              <option value="">
                {formData.league_id ? "Kein Team" : "Erst Liga wählen"}
              </option>
              {leagueTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name || team.shortName || team.id}
                </option>
              ))}
            </SelectField>
          </div>

          <SelectField
            label="Spiel optional"
            value={formData.game_id}
            onChange={handleGameChange}
            disabled={!formData.league_id}
          >
            <option value="">
              {formData.league_id ? "Kein Spiel" : "Erst Liga wählen"}
            </option>
            {filteredGames.map(game => (
              <option key={game.id} value={game.id}>
                {getGameLabel(game, teamsById)}
              </option>
            ))}
          </SelectField>

          {(selectedLeague || selectedTeam || selectedGame) && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Zuordnung
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {selectedLeague?.shortName || selectedLeague?.name || "Keine Liga"}
                {selectedTeam ? ` · ${selectedTeam.shortName || selectedTeam.name}` : ""}
                {selectedGame ? ` · ${getGameLabel(selectedGame, teamsById)}` : ""}
              </p>
            </div>
          )}

          <Input
            value={formData.external_video_url}
            onChange={event => handleExternalUrlChange(event.target.value)}
            placeholder="Externe Video URL, z.B. YouTube oder Instagram"
            autoComplete="off"
          />

          <div className="relative">
            <Input
              value={formData.thumbnail_url}
              onChange={event => set("thumbnail_url", event.target.value)}
              placeholder="Thumbnail URL"
              autoComplete="off"
            />

            {loadingThumbnail && (
              <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <Input
            value={formData.source_name}
            onChange={event => set("source_name", event.target.value)}
            placeholder="Quelle, z.B. YouTube, Instagram, ELF"
            autoComplete="off"
          />

          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/10 px-3 text-sm font-bold text-primary hover:bg-primary/15">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preview wird hochgeladen...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Preview Video hochladen
              </>
            )}

            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handlePreviewUpload}
              disabled={uploading}
            />
          </label>

          {formData.preview_video_url && (
            <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Preview Video
              </p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {formData.preview_video_url}
              </p>
            </div>
          )}

          <Input
            value={formData.preview_video_url}
            onChange={event => set("preview_video_url", event.target.value)}
            placeholder="Preview Video URL optional"
            autoComplete="off"
          />

          <Input
            type="date"
            value={formData.date}
            onChange={event => set("date", event.target.value)}
          />

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 px-3 py-3">
            <div>
              <p className="text-sm font-semibold">Aktiv</p>
              <p className="text-xs text-muted-foreground">
                Sichtbar in Home und Highlights
              </p>
            </div>

            <Switch
              checked={formData.active}
              onCheckedChange={value => set("active", value)}
            />
          </div>
        </div>

        <div>
          <HighlightPreview highlight={formData} />
        </div>
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={isSaving || uploading || loadingThumbnail}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {editingId ? "Speichern" : "Highlight posten"}
      </Button>
    </div>
  );
}

export default function AdminHighlights() {
  useSetHeader({
    mode: "back",
    title: "Game Highlights",
  });

  const queryClient = useQueryClient();
  const { appUserSnapshot } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["admin-game-highlights"],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list("-created_date");

      return all
        .filter(item => item.version === HIGHLIGHT_VERSION)
        .map(normalizeHighlight);
    },
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["admin-highlight-leagues"],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-highlight-teams"],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: games = [] } = useQuery({
    queryKey: ["admin-highlight-games"],
    queryFn: () => base44.entities.Game.list(),
  });

  const scopedLeagues = useMemo(
    () => leagues.filter(league => canAccessLeague(appUserSnapshot, league.id)),
    [appUserSnapshot, leagues]
  );
  const scopedTeams = useMemo(
    () => teams.filter(team => canAccessLeague(appUserSnapshot, team.leagueId)),
    [appUserSnapshot, teams]
  );
  const scopedGames = useMemo(
    () => games.filter(game => canAccessLeague(appUserSnapshot, game.leagueId)),
    [appUserSnapshot, games]
  );

  const teamsById = useMemo(() => new Map(scopedTeams.map(team => [team.id, team])), [scopedTeams]);
  const leaguesById = useMemo(() => new Map(scopedLeagues.map(league => [league.id, league])), [scopedLeagues]);

  const sortedHighlights = useMemo(() => {
    return [...highlights].filter(highlight => canAccessLeague(appUserSnapshot, highlight.league_id)).sort((a, b) => {
      const dateA = new Date(a.date || a.createdAtUtc || a.created_date || 0).getTime();
      const dateB = new Date(b.date || b.createdAtUtc || b.created_date || 0).getTime();

      return dateB - dateA;
    });
  }, [appUserSnapshot, highlights]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const invalidateHighlights = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-game-highlights"] }),
      queryClient.invalidateQueries({ queryKey: ["game-highlights"] }),
      queryClient.invalidateQueries({ queryKey: ["home-overview-updates"] }),
      queryClient.invalidateQueries({ queryKey: ["home-game-highlights"] }),
      queryClient.invalidateQueries({ queryKey: ["appUpdates"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-count-highlights"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.create(data),
    onSuccess: async () => {
      await invalidateHighlights();
      toast.success("Highlight gepostet");
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Highlight konnte nicht erstellt werden");
    },
  });

  const updateMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.update(editingId, data),
    onSuccess: async () => {
      await invalidateHighlights();
      toast.success("Highlight gespeichert");
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Highlight konnte nicht gespeichert werden");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.AppUpdate.delete(id),
    onSuccess: async () => {
      await invalidateHighlights();
      toast.success("Highlight gelöscht");
    },
    onError: error => {
      toast.error(error.message || "Highlight konnte nicht gelöscht werden");
    },
  });

  const handleSubmit = () => {
    const title = formData.title.trim();
    const thumbnailUrl = normalizeUrl(formData.thumbnail_url);
    const externalVideoUrl = normalizeUrl(formData.external_video_url);
    const previewVideoUrl = normalizeUrl(formData.preview_video_url);
    const description = formData.description.trim();

    if (!title) {
      toast.error("Bitte Titel eingeben");
      return;
    }

    if (!canAccessLeague(appUserSnapshot, formData.league_id)) {
      toast.error("Du bist für diese Liga nicht freigegeben.");
      return;
    }

    if (!thumbnailUrl && !previewVideoUrl) {
      toast.error("Bitte Thumbnail oder Preview Video hinzufügen");
      return;
    }

    const nowIso = new Date().toISOString();

    const meta = {
      description,
      thumbnail_url: thumbnailUrl || getCloudinaryThumbnail(previewVideoUrl),
      external_video_url: externalVideoUrl,
      source_name: formData.source_name.trim(),
      league_id: formData.league_id,
      team_id: formData.team_id,
      game_id: formData.game_id,
      date: formData.date,
      active: formData.active,
      preview_video_url: previewVideoUrl,
      created_at: editingId ? formData.created_at || nowIso : nowIso,
      updated_at: nowIso,
    };

    const payload = {
      title,
      message: JSON.stringify(meta),
      imageUrl: meta.thumbnail_url,
      version: HIGHLIGHT_VERSION,
      isActive: formData.active,
      showAsPopup: false,
    };

    if (editingId) {
      updateMutation.mutate(payload);
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = highlight => {
    setEditingId(highlight.id);
    setFormData({
      title: highlight.title || "",
      description: highlight.description || "",
      thumbnail_url: highlight.thumbnail_url || "",
      external_video_url: highlight.external_video_url || "",
      source_name: highlight.source_name || "",
      preview_video_url: highlight.preview_video_url || "",
      league_id: highlight.league_id || "",
      team_id: highlight.team_id || "",
      game_id: highlight.game_id || "",
      date: highlight.date || "",
      active: highlight.active !== false,
      created_at: highlight.created_at || "",
    });
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-24">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Querformat
          </p>

          <h1 className="text-xl font-black mt-1">
            Game Highlights
          </h1>

          <p className="text-xs text-muted-foreground mt-1">
            Externe Videos verlinken, optional stumme Preview hochladen.
          </p>
        </div>

        {!showForm && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingId(null);
              setFormData(EMPTY_FORM);
              setShowForm(true);
            }}
            className="gap-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Neu
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-5">
          <HighlightForm
            formData={formData}
            setFormData={setFormData}
            editingId={editingId}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isSaving={createMutation.isPending || updateMutation.isPending}
            leagues={scopedLeagues}
            teams={scopedTeams}
            games={scopedGames}
          />
        </div>
      )}

      {sortedHighlights.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card py-12 px-4 text-center">
          <PlaySquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />

          <p className="text-sm font-bold">
            Noch keine Highlights
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Erstelle dein erstes Game Highlight.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedHighlights.map(highlight => {
            const league = leaguesById.get(highlight.league_id);
            const team = teamsById.get(highlight.team_id);
            const game = scopedGames.find(item => item.id === highlight.game_id);

            return (
              <div
                key={highlight.id}
                className="rounded-2xl border border-border/50 bg-card p-3"
              >
                <HighlightPreview highlight={highlight} />

                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {highlight.title}
                      </p>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {highlight.source_name || "Highlight"}
                        {highlight.active === false ? " · Inaktiv" : " · Aktiv"}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">
                      16:9
                    </span>
                  </div>

                  {(league || team || game) && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                      {league?.shortName || league?.name || ""}
                      {team ? ` · ${team.shortName || team.name}` : ""}
                      {game ? ` · ${getGameLabel(game, teamsById)}` : ""}
                    </p>
                  )}

                  {highlight.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {highlight.description}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex-1"
                      onClick={() => handleEdit(highlight)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Bearbeiten
                    </Button>

                    {highlight.external_video_url && (
                      <a
                        href={highlight.external_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium inline-flex items-center justify-center"
                      >
                        <Eye className="w-3 h-3" />
                      </a>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-red-400 hover:text-red-300 hover:border-red-500/40"
                      onClick={() => deleteMutation.mutate(highlight.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
