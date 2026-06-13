import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import useSetHeader from "@/hooks/useSetHeader";
import LeagueSelector from "@/components/admin/LeagueSelector";
import { getImageUrl } from "@/lib/imageUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GAME_PREDICTION_VERSION = "game_prediction";

const EMPTY = {
  homeTeamId: "",
  awayTeamId: "",
  homeTeamPlaceholder: "",
  awayTeamPlaceholder: "",
  homeTeamSeed: "",
  awayTeamSeed: "",
  leagueId: "",
  date: "",
  time: "",
  venue: "",
  status: "scheduled",
  scoreHome: 0,
  scoreAway: 0,
  week: "",
  groupId: "",
  city: "",
  stadiumAddress: "",
  selectedStadiumKey: "",
  streamUrl: "",
  streamStatus: "approved",
  streamEnabled: false,
  streamProviderId: "",
  streamProviderName: "",
  streamProviderLogo: "",
  streamLinks: [],
  attendance: "",
  weather: "",
  notes: "",
  competitionId: "",
  tournamentId: "",
  roundName: "",
  round: "",
  matchupIndex: "",
  isCompetitionGame: false,
  isTopGame: false,
  topGameScore: "",
  predictionEnabled: true,
  isHighlight: false,
  highlightVideoUrl: "",
  highlightThumbnail: "",
  highlightTitle: "",
  highlightSubtitle: "",
};

const GAME_STATUSES = ["scheduled", "live", "final", "cancelled"];

const STATUS_COLORS = {
  scheduled: "bg-secondary text-foreground",
  live: "bg-red-500/15 text-red-400",
  final: "bg-green-500/15 text-green-500",
  cancelled: "bg-orange-500/15 text-orange-400",
};

const STATUS_LABELS = {
  scheduled: "Geplant",
  live: "Live",
  final: "Final",
  cancelled: "Abgesagt",
};

const STREAM_STATUSES = ["approved", "pending", "rejected"];

function createLocalId() {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStreamLink() {
  return {
    id: createLocalId(),
    label: "",
    url: "",
    providerId: "",
    providerName: "",
    providerLogo: "",
    platform: "",
    status: "approved",
    enabled: true,
    submittedByRole: "admin",
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
  };
}

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getActiveProviders(providerRequests = []) {
  return providerRequests
    .filter(
      (item) =>
        item.type === "streaming_provider" &&
        item.status === "approved" &&
        item.providerIsActive !== false &&
        item.providerName
    )
    .sort((a, b) => {
      const orderA = Number(a.providerSortOrder || 0);
      const orderB = Number(b.providerSortOrder || 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.providerName || "").localeCompare(String(b.providerName || ""));
    });
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Geplant";
}

function formatDate(date) {
  if (!date) return "ohne Datum";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStreamStatusLabel(status) {
  if (status === "approved") return "Genehmigt / sichtbar";
  if (status === "pending") return "Ausstehend";
  if (status === "rejected") return "Abgelehnt";
  return status || "Genehmigt / sichtbar";
}

function normalizeTeamStadiums(team) {
  if (!team) return [];

  if (Array.isArray(team.stadiums) && team.stadiums.length > 0) {
    return team.stadiums
      .map((stadium, index) => ({
        id: stadium.id || `stadium_${team.id}_${index}`,
        name: stadium.name || "",
        address: stadium.address || "",
        city: stadium.city || "",
        region: stadium.region || "",
        country: stadium.country || "",
        isDefault: stadium.isDefault === true,
      }))
      .filter((stadium) => stadium.name || stadium.address || stadium.city);
  }

  if (team.stadium || team.stadiumAddress) {
    return [
      {
        id: `legacy_${team.id}`,
        name: team.stadium || "",
        address: team.stadiumAddress || "",
        city: team.city || "",
        region: team.region || "",
        country: team.country || "",
        isDefault: true,
      },
    ];
  }

  return [];
}

function getGameStadiumOptions({ homeTeam, awayTeam }) {
  const options = [];

  normalizeTeamStadiums(homeTeam).forEach((stadium) => {
    options.push({
      key: `home:${stadium.id}`,
      side: "home",
      label: `${stadium.name || "Stadion"}${stadium.isDefault ? " - Standard" : ""}`,
      teamName: homeTeam?.shortName || homeTeam?.name || "Heimteam",
      stadium,
    });
  });

  normalizeTeamStadiums(awayTeam).forEach((stadium) => {
    options.push({
      key: `away:${stadium.id}`,
      side: "away",
      label: `${stadium.name || "Stadion"}${stadium.isDefault ? " - Standard" : ""}`,
      teamName: awayTeam?.shortName || awayTeam?.name || "Gastteam",
      stadium,
    });
  });

  return options;
}

function getDefaultStadiumOption(options) {
  return (
    options.find((option) => option.side === "home" && option.stadium.isDefault) ||
    options.find((option) => option.side === "home") ||
    options.find((option) => option.stadium.isDefault) ||
    options[0] ||
    null
  );
}

function normalizeStreamLinks(game) {
  if (Array.isArray(game?.streamLinks) && game.streamLinks.length > 0) {
    return game.streamLinks.map((link) => {
      const providerName =
        link.providerName ||
        link.platform ||
        (link.label && link.label !== "Hauptstream" ? link.label : "") ||
        "Stream";

      return {
        id: link.id || createLocalId(),
        label: link.label && link.label !== "Hauptstream" ? link.label : providerName,
        url: link.url || "",
        providerId: link.providerId || "",
        providerName,
        providerLogo: link.providerLogo || "",
        platform: link.platform || providerName,
        status: link.status || "approved",
        enabled: link.enabled !== false,
        submittedByUserId: link.submittedByUserId || "",
        submittedByRole: link.submittedByRole || "admin",
        createdAtUtc: link.createdAtUtc || new Date().toISOString(),
        updatedAtUtc: link.updatedAtUtc || "",
      };
    });
  }

  if (game?.streamUrl) {
    const providerName =
      game.streamProviderName ||
      game.streamPlatform ||
      (game.streamLabel && game.streamLabel !== "Hauptstream" ? game.streamLabel : "") ||
      "Stream";

    return [
      {
        id: createLocalId(),
        label: game.streamLabel && game.streamLabel !== "Hauptstream" ? game.streamLabel : providerName,
        url: game.streamUrl,
        providerId: game.streamProviderId || "",
        providerName,
        providerLogo: game.streamProviderLogo || "",
        platform: game.streamPlatform || providerName,
        status: game.streamStatus || "approved",
        enabled: game.streamEnabled !== false,
        submittedByUserId: game.streamSubmittedByUserId || "",
        submittedByRole: "admin",
        createdAtUtc: game.streamUpdatedAt || new Date().toISOString(),
        updatedAtUtc: game.streamUpdatedAt || "",
      },
    ];
  }

  return [];
}

function cleanStreamLinks(streamLinks) {
  return (streamLinks || [])
    .map((link) => {
      const url = String(link.url || "").trim();
      const providerName =
        link.providerName ||
        link.platform ||
        (link.label && link.label !== "Hauptstream" && link.label !== "Stream" ? link.label : "");

      return {
        id: link.id || createLocalId(),
        label: String(link.label || providerName || "").trim(),
        url,
        providerId: link.providerId || "",
        providerName,
        providerLogo: link.providerLogo || "",
        platform: providerName,
        status: link.status || "approved",
        enabled: link.enabled !== false,
        submittedByUserId: link.submittedByUserId || "",
        submittedByRole: link.submittedByRole || "admin",
        createdAtUtc: link.createdAtUtc || new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
    })
    .filter((link) => link.url || link.providerId);
}

function getVisibleStreamLinks(game) {
  return normalizeStreamLinks(game).filter(
    (link) => link.url && link.enabled !== false && link.status === "approved"
  );
}

function getTeamDisplay(team, placeholder) {
  return team?.shortName || team?.name || placeholder || "Teilnehmer offen";
}

function TeamLogo({ team, placeholder }) {
  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt=""
        className="w-9 h-9 rounded-lg object-contain bg-secondary/40 border border-border/40 flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-muted-foreground">
        {placeholder ? "-" : "?"}
      </span>
    </div>
  );
}

function TeamSelectLabel({ team }) {
  if (!team) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {team.logo ? (
        <img src={getImageUrl(team.logo)} alt="" className="w-5 h-5 rounded object-contain bg-secondary/40" />
      ) : (
        <div className="w-5 h-5 rounded bg-secondary/50" />
      )}
      <span className="truncate">{team.name}</span>
    </div>
  );
}

function StreamLinksEditor({ value = [], providers = [], onChange }) {
  const streamLinks = value.length > 0 ? value : [];

  const getLinkForProvider = (providerId) => streamLinks.find((link) => link.providerId === providerId);

  const toggleProvider = (provider) => {
    const existing = getLinkForProvider(provider.id);

    if (existing) {
      onChange(streamLinks.filter((link) => link.providerId !== provider.id));
      return;
    }

    onChange([
      ...streamLinks,
      {
        ...createEmptyStreamLink(),
        providerId: provider.id,
        providerName: provider.providerName || "",
        providerLogo: provider.providerLogo || "",
        platform: provider.providerName || "",
        label: provider.providerName || "Stream",
        url: provider?.providerWebsite || "",
      },
    ]);
  };

  const updateLink = (id, key, nextValue) => {
    onChange(
      streamLinks.map((link) =>
        link.id === id
          ? {
              ...link,
              [key]: nextValue,
              updatedAtUtc: new Date().toISOString(),
            }
          : link
      )
    );
  };

  const removeLink = (id) => {
    onChange(streamLinks.filter((link) => link.id !== id));
  };

  const selectedLinks = providers
    .map((provider) => ({ provider, link: getLinkForProvider(provider.id) }))
    .filter((item) => item.link);

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold">Streaming-Anbieter</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Wähle aus, welche Anbieter dieses Spiel übertragen.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-400 text-xs">
          Noch keine Streaming-Anbieter angelegt.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {providers.map((provider) => {
            const selected = !!getLinkForProvider(provider.id);

            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => toggleProvider(provider)}
                className={`min-h-[72px] rounded-xl border px-2 py-2 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/15"
                    : "border-border/50 bg-background/70 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {provider.providerLogo ? (
                    <img
                      src={getImageUrl(provider.providerLogo)}
                      alt=""
                      className="w-8 h-8 rounded-lg object-contain bg-background border border-border/40 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{provider.providerName}</p>
                    <p className={`text-[10px] ${selected ? "text-primary" : "text-muted-foreground"}`}>
                      {selected ? "Ausgewählt" : "Nicht aktiv"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedLinks.length > 0 && (
        <div className="space-y-3">
          {selectedLinks.map(({ provider, link }) => (
            <div key={link.id} className="rounded-xl border border-border/50 bg-background/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold truncate">{provider.providerName}</p>

                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Input
                placeholder={`${provider.providerName} Stream-Link`}
                value={link.url || ""}
                onChange={(event) => updateLink(link.id, "url", event.target.value)}
              />

              <Input
                placeholder="Label optional, z.B. TV, Radio, Heimstream"
                value={link.label || ""}
                onChange={(event) => updateLink(link.id, "label", event.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                <Select
                  value={link.status || "approved"}
                  onValueChange={(nextValue) => updateLink(link.id, "status", nextValue)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAM_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStreamStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={link.enabled !== false}
                    onChange={(event) => updateLink(link.id, "enabled", event.target.checked)}
                  />
                  Aktiv
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GamePredictionsAdmin({ gameId }) {
  const queryClient = useQueryClient();

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["admin-game-predictions", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const all = await base44.entities.AppUpdate.list("-created_date", 1000);

      return all.filter((item) => {
        if (item.version !== GAME_PREDICTION_VERSION) return false;

        const meta = parseMessage(item.message);
        return meta.game_id === gameId;
      });
    },
    enabled: !!gameId,
  });

  const activePredictions = predictions.filter((item) => item.isActive !== false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(predictions.map((item) => base44.entities.AppUpdate.delete(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-game-predictions", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game-content", gameId] });
      queryClient.invalidateQueries({ queryKey: ["appUpdates"] });
      toast.success("Tipps zurückgesetzt");
    },
    onError: (error) => {
      toast.error(error.message || "Tipps konnten nicht zurückgesetzt werden");
    },
  });

  if (!gameId) {
    return (
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <p className="text-xs font-semibold">Tippspiel Verwaltung</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Tipps können erst verwaltet werden, nachdem das Spiel gespeichert wurde.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Tippspiel Verwaltung</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Hier kannst du gespeicherte Tipps zu diesem Spiel zurücksetzen.
          </p>
        </div>

        <Badge className="text-[10px] border-0 bg-primary/15 text-primary">
          {isLoading ? "..." : `${activePredictions.length} Tipps`}
        </Badge>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => resetMutation.mutate()}
        disabled={isLoading || resetMutation.isPending || predictions.length === 0}
        className="w-full text-xs"
      >
        {resetMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-1" />
        ) : (
          <Trash2 className="w-4 h-4 mr-1" />
        )}
        Alle Tipps für dieses Spiel löschen
      </Button>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Das löscht nur die gespeicherten Tipps zu diesem Spiel. Das Spiel selbst bleibt erhalten.
      </p>
    </div>
  );
}

function GameForm({
  initial = EMPTY,
  gameId = null,
  teams = [],
  leagues = [],
  providers = [],
  competitions = [],
  onSave,
  onCancel,
  isSaving,
}) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    streamLinks: normalizeStreamLinks(initial),
  });
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const leagueTeams = form.leagueId ? teams.filter((team) => team.leagueId === form.leagueId) : [];

  const homeTeam = teams.find((team) => team.id === form.homeTeamId);
  const awayTeam = teams.find((team) => team.id === form.awayTeamId);

  const stadiumOptions = useMemo(() => getGameStadiumOptions({ homeTeam, awayTeam }), [homeTeam, awayTeam]);

  const handleLeagueChange = (leagueId) => {
    const league = leagues.find((item) => item.id === leagueId);

    if (league) {
      setContinent(league.continent || "");
      setCountry(league.country || "");
      setRegion(league.regionState || "");
    }

    setForm((current) => ({
      ...current,
      leagueId,
      homeTeamId: "",
      awayTeamId: "",
      selectedStadiumKey: "",
      venue: "",
      city: "",
      stadiumAddress: "",
    }));
  };

  const applyStadium = (option) => {
    if (!option) return;

    setForm((current) => ({
      ...current,
      selectedStadiumKey: option.key,
      venue: option.stadium.name || "",
      city: option.stadium.city || current.city || "",
      stadiumAddress: option.stadium.address || "",
    }));
  };

  const handleHomeTeamChange = (teamId) => {
    const nextHomeTeam = teams.find((team) => team.id === teamId);
    const options = getGameStadiumOptions({ homeTeam: nextHomeTeam, awayTeam });
    const defaultOption = getDefaultStadiumOption(options);

    setForm((current) => ({
      ...current,
      homeTeamId: teamId,
      selectedStadiumKey: defaultOption?.key || "",
      venue: defaultOption?.stadium?.name || current.venue || "",
      city: defaultOption?.stadium?.city || current.city || "",
      stadiumAddress: defaultOption?.stadium?.address || current.stadiumAddress || "",
    }));
  };

  const handleStadiumSelection = (key) => {
    if (key === "manual") {
      setForm((current) => ({ ...current, selectedStadiumKey: "manual" }));
      return;
    }

    const option = stadiumOptions.find((item) => item.key === key);
    applyStadium(option);
  };

  const handleStatusChange = (value) => {
    setForm((current) => ({
      ...current,
      status: value,
      scoreHome: value === "cancelled" || value === "scheduled" ? 0 : current.scoreHome,
      scoreAway: value === "cancelled" || value === "scheduled" ? 0 : current.scoreAway,
    }));
  };

  const validate = () => {
    if (!form.leagueId) return "Liga erforderlich";

    const hasHome = !!form.homeTeamId || !!form.homeTeamPlaceholder?.trim();
    const hasAway = !!form.awayTeamId || !!form.awayTeamPlaceholder?.trim();

    if (!hasHome) return "Heimteam oder Heim-Platzhalter erforderlich";
    if (!hasAway) return "Auswärtsteam oder Gast-Platzhalter erforderlich";

    if (form.homeTeamId && form.awayTeamId && form.homeTeamId === form.awayTeamId) {
      return "Heimteam und Auswärtsteam dürfen nicht gleich sein";
    }

    if (!GAME_STATUSES.includes(form.status)) {
      return "Ungültiger Status";
    }

    return "";
  };

  const handleSave = () => {
    const err = validate();

    if (err) {
      setError(err);
      return;
    }

    setError("");
    onSave(form);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      <LeagueSelector
        leagues={leagues}
        selectedContinent={continent}
        selectedCountry={country}
        selectedRegion={region}
        selectedLeagueId={form.leagueId}
        onContinentChange={setContinent}
        onCountryChange={setCountry}
        onRegionChange={setRegion}
        onLeagueChange={handleLeagueChange}
      />

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <p className="text-xs font-semibold mb-2">Teams</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={form.homeTeamId} onValueChange={handleHomeTeamChange}>
            <SelectTrigger>
              <SelectValue placeholder="Heimteam auswählen" />
            </SelectTrigger>
            <SelectContent>
              {leagueTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <TeamSelectLabel team={team} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={form.awayTeamId} onValueChange={(teamId) => set("awayTeamId", teamId)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswärtsteam auswählen" />
            </SelectTrigger>
            <SelectContent>
              {leagueTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <TeamSelectLabel team={team} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input placeholder="Heim-Platzhalter optional" value={form.homeTeamPlaceholder} onChange={(event) => set("homeTeamPlaceholder", event.target.value)} />
          <Input placeholder="Gast-Platzhalter optional" value={form.awayTeamPlaceholder} onChange={(event) => set("awayTeamPlaceholder", event.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <p className="text-xs font-semibold mb-2">Termin & Stadion</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input type="date" value={form.date} onChange={(event) => set("date", event.target.value)} />
          <Input type="time" value={form.time} onChange={(event) => set("time", event.target.value)} />
        </div>

        {stadiumOptions.length > 0 && (
          <Select value={form.selectedStadiumKey || "manual"} onValueChange={handleStadiumSelection}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Stadion vom Heim-/Gastteam auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Freies / neutrales Stadion</SelectItem>
              {stadiumOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.teamName}: {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          className="mt-2"
          placeholder="Venue / Stadion optional"
          value={form.venue}
          onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value, selectedStadiumKey: "manual" }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Input
            placeholder="Stadt optional"
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value, selectedStadiumKey: "manual" }))}
          />

          <Input
            placeholder="Stadionadresse optional"
            value={form.stadiumAddress}
            onChange={(event) => setForm((current) => ({ ...current, stadiumAddress: event.target.value, selectedStadiumKey: "manual" }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Spieltag" value={form.week} onChange={(event) => set("week", event.target.value)} />
        <Input placeholder="Gruppe" value={form.groupId} onChange={(event) => set("groupId", event.target.value)} />
      </div>

      <Select value={form.status} onValueChange={handleStatusChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scheduled">Geplant</SelectItem>
          <SelectItem value="live">Live</SelectItem>
          <SelectItem value="final">Final</SelectItem>
          <SelectItem value="cancelled">Abgesagt</SelectItem>
        </SelectContent>
      </Select>

      {form.status === "cancelled" && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2">
          <p className="text-xs font-semibold text-orange-300">
            Spiel abgesagt
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            Abgesagte Spiele werden nicht automatisch live, zählen nicht für Tabellen und bekommen keinen Score.
          </p>
        </div>
      )}

      {form.status === "final" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Heim-Punkte" value={form.scoreHome} onChange={(event) => set("scoreHome", Number(event.target.value))} />
          <Input type="number" placeholder="Auswärts-Punkte" value={form.scoreAway} onChange={(event) => set("scoreAway", Number(event.target.value))} />
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-3">
        <p className="text-xs font-semibold">Tippspiel</p>

        {true && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
          <div>
            <p className="text-xs font-semibold">Tippspiel aktiv</p>
            <p className="text-[10px] text-muted-foreground">
              Nutzer können vor Kickoff einmal auf den Gewinner tippen.
            </p>
          </div>
          <Switch checked={form.predictionEnabled !== false} onCheckedChange={(value) => set("predictionEnabled", value)} />
        </div>
        )}


        {false && (
          <>
        <Input
          type="hidden"
          placeholder="Zusätzlicher Topspiel-Score optional"
          value=""
          onChange={(event) => set("topGameScore", event.target.value)}
        />

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
          <div>
            <p className="text-xs font-semibold">Game Highlight vorhanden</p>
            <p className="text-[10px] text-muted-foreground">
              Aktivieren, wenn dieses Spiel ein Video oder einen Ausschnitt hat.
            </p>
          </div>
          <Switch checked={!!form.isHighlight} onCheckedChange={(value) => set("isHighlight", value)} />
        </div>
          </>
        )}

        {false && form.isHighlight && (
          <div className="space-y-2">
            <Input
              placeholder="Highlight Video URL"
              value={form.highlightVideoUrl}
              onChange={(event) => set("highlightVideoUrl", event.target.value)}
            />
            <Input
              placeholder="Highlight Thumbnail URL"
              value={form.highlightThumbnail}
              onChange={(event) => set("highlightThumbnail", event.target.value)}
            />
            <Input
              placeholder="Highlight Titel"
              value={form.highlightTitle}
              onChange={(event) => set("highlightTitle", event.target.value)}
            />
            <Input
              placeholder="Highlight Untertitel"
              value={form.highlightSubtitle}
              onChange={(event) => set("highlightSubtitle", event.target.value)}
            />
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-primary hover:underline">
        {showAdvanced ? "▼ Erweiterte Optionen" : "▶ Erweiterte Optionen"}
      </button>

      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="number" placeholder="Heim-Seed optional" value={form.homeTeamSeed} onChange={(event) => set("homeTeamSeed", event.target.value)} />
            <Input type="number" placeholder="Gast-Seed optional" value={form.awayTeamSeed} onChange={(event) => set("awayTeamSeed", event.target.value)} />
          </div>

          <Select value={form.competitionId || "none"} onValueChange={(value) => set("competitionId", value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Wettbewerb optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Wettbewerb</SelectItem>
              {competitions.map((competition) => (
                <SelectItem key={competition.id} value={competition.id}>
                  {competition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Runde / Phase, z.B. Finale" value={form.roundName} onChange={(event) => set("roundName", event.target.value)} />
            <Input type="number" placeholder="Runden-Nr." value={form.round} onChange={(event) => set("round", event.target.value)} />
          </div>

          <Input
            type="number"
            placeholder="Matchup Index"
            value={form.matchupIndex}
            onChange={(event) => set("matchupIndex", event.target.value)}
          />

          <StreamLinksEditor value={form.streamLinks} providers={providers} onChange={(value) => set("streamLinks", value)} />

          <GamePredictionsAdmin gameId={gameId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="number" placeholder="Zuschauer" value={form.attendance} onChange={(event) => set("attendance", event.target.value)} />
            <Input placeholder="Wetter" value={form.weather} onChange={(event) => set("weather", event.target.value)} />
          </div>

          <textarea
            placeholder="Notizen"
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            className="w-full p-2 rounded border border-border bg-secondary text-foreground text-sm"
            rows="2"
          />
        </>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          Speichern
        </Button>

        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminGames() {
  useSetHeader({ mode: "back", title: "Spiele" });

  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLeague, setFilterLeague] = useState("all");
  const [search, setSearch] = useState("");

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => base44.entities.Game.list("-date", 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => base44.entities.Team.list("name"),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => base44.entities.League.list("name"),
  });

  const { data: competitions = [] } = useQuery({
    queryKey: ["adminCompetitions"],
    queryFn: () => base44.entities.Tournament.list("-created_date"),
  });

  const { data: providerRequests = [] } = useQuery({
    queryKey: ["streamingProviders"],
    queryFn: () => base44.entities.SupportRequest.list("providerSortOrder"),
  });

  const streamingProviders = useMemo(() => getActiveProviders(providerRequests), [providerRequests]);

  const teamMap = useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map((league) => [league.id, league])), [leagues]);
  const competitionMap = useMemo(() => Object.fromEntries(competitions.map((comp) => [comp.id, comp])), [competitions]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["games"] });
    queryClient.invalidateQueries({ queryKey: ["competitions"] });
    queryClient.invalidateQueries({ queryKey: ["adminCompetitions"] });
    queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["streamingProviders"] });
  };

  const buildPayload = (data) => {
    let kickoffAt = "";

    if (data.date && data.time) {
      const [hours, minutes] = data.time.split(":");
      const [year, month, day] = data.date.split("-");

      const kickoffDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours) || 0,
        parseInt(minutes) || 0,
        0,
        0
      );

      kickoffAt = kickoffDate.toISOString();
    }

    const streamLinks = cleanStreamLinks(data.streamLinks);
    const primaryStream = streamLinks.find((link) => link.status === "approved" && link.enabled !== false) || streamLinks[0] || null;
    const hasPrimaryStream = !!primaryStream?.url;
    const streamStatus = primaryStream ? primaryStream.status : "pending";

    const competitionId = data.competitionId || data.tournamentId || "";
    const roundNumber =
      data.round !== "" && data.round !== null && data.round !== undefined
        ? parseInt(data.round)
        : null;
    const matchupIndex =
      data.matchupIndex !== "" && data.matchupIndex !== null && data.matchupIndex !== undefined
        ? parseInt(data.matchupIndex)
        : null;

    const status = data.status || "scheduled";
    const hasScore = status === "final" || status === "live";

    return {
      leagueId: data.leagueId || "",
      homeTeamId: data.homeTeamId || "",
      awayTeamId: data.awayTeamId || "",
      homeTeamPlaceholder: data.homeTeamPlaceholder || "",
      awayTeamPlaceholder: data.awayTeamPlaceholder || "",
      homeTeamSeed: data.homeTeamSeed ? parseInt(data.homeTeamSeed) : null,
      awayTeamSeed: data.awayTeamSeed ? parseInt(data.awayTeamSeed) : null,
      teamsResolved: !!data.homeTeamId && !!data.awayTeamId,

      date: data.date || "",
      time: data.time || "",
      kickoffTime: data.time || "",
      kickoffAt,

      status,
      venue: data.venue || "",
      groupId: data.groupId || "",
      season: data.season || "",
      week: data.week ? parseInt(data.week) : null,
      city: data.city || "",
      stadiumAddress: data.stadiumAddress || "",

      streamUrl: hasPrimaryStream ? primaryStream.url : "",
      streamPlatform: primaryStream?.providerName || primaryStream?.platform || "",
      streamProviderId: primaryStream?.providerId || "",
      streamProviderName: primaryStream?.providerName || primaryStream?.platform || "",
      streamProviderLogo: primaryStream?.providerLogo || "",
      streamLabel: primaryStream?.label || "",
      streamStatus,
      streamEnabled: status !== "cancelled" && hasPrimaryStream && streamStatus === "approved" && primaryStream.enabled !== false,
      streamLinks,
      streamUpdatedAt: streamLinks.length > 0 ? new Date().toISOString() : "",

      scoreHome: hasScore ? data.scoreHome ?? 0 : 0,
      scoreAway: hasScore ? data.scoreAway ?? 0 : 0,
      attendance: data.attendance ? parseInt(data.attendance) : null,
      weather: data.weather || "",
      notes: data.notes || "",

      competitionId,
      tournamentId: competitionId,
      roundName: data.roundName || "",
      round: roundNumber,
      matchupIndex,
      isCompetitionGame: !!data.isCompetitionGame || !!competitionId,

      isTopGame: false,
      topGameScore: null,
      predictionEnabled: status !== "cancelled" && data.predictionEnabled !== false,

      isHighlight: false,
      hasHighlight: false,
      highlightVideoUrl: "",
      highlightUrl: "",
      videoUrl: "",
      highlightThumbnail: "",
      thumbnailUrl: "",
      highlightTitle: "",
      highlightSubtitle: "",
    };
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(buildPayload(data)),
    onSuccess: () => {
      invalidate();
      setAdding(false);
      toast.success("Spiel erstellt");
    },
    onError: (err) => {
      console.error("CREATE GAME ERROR:", err);
      toast.error(err.message || "Fehler beim Erstellen des Spiels");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, buildPayload(data)),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Spiel aktualisiert");
    },
    onError: (err) => {
      console.error("UPDATE GAME ERROR:", err);
      toast.error(err.message || "Fehler beim Aktualisieren des Spiels");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Game.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Spiel gelöscht");
    },
    onError: (err) => {
      console.error("DELETE GAME ERROR:", err);
      toast.error(err.message || "Fehler beim Löschen des Spiels");
    },
  });

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return games.filter((game) => {
      if (filterStatus !== "all" && game.status !== filterStatus) return false;
      if (filterLeague !== "all" && game.leagueId !== filterLeague) return false;

      if (!normalizedSearch) return true;

      const home = teamMap[game.homeTeamId];
      const away = teamMap[game.awayTeamId];
      const league = leagueMap[game.leagueId];
      const competition = competitionMap[game.competitionId || game.tournamentId];

      const haystack = [
        home?.name,
        home?.shortName,
        away?.name,
        away?.shortName,
        game.homeTeamPlaceholder,
        game.awayTeamPlaceholder,
        league?.name,
        league?.shortName,
        competition?.name,
        game.date,
        game.time,
        game.venue,
        game.roundName,
        getStatusLabel(game.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [competitionMap, filterLeague, filterStatus, games, leagueMap, search, teamMap]);

  const getTeamLabel = (teamId, placeholder) => {
    const team = teamMap[teamId];
    return team?.name || team?.shortName || placeholder || "Teilnehmer offen";
  };

  const getTeamShortLabel = (teamId, placeholder) => {
    const team = teamMap[teamId];
    return team?.shortName || team?.name || placeholder || "Offen";
  };

  const getInitialForm = (game) => ({
    ...EMPTY,
    homeTeamId: game.homeTeamId || "",
    awayTeamId: game.awayTeamId || "",
    homeTeamPlaceholder: game.homeTeamPlaceholder || "",
    awayTeamPlaceholder: game.awayTeamPlaceholder || "",
    homeTeamSeed: game.homeTeamSeed || "",
    awayTeamSeed: game.awayTeamSeed || "",
    leagueId: game.leagueId || "",
    date: game.date || "",
    time: game.time || "",
    venue: game.venue || "",
    status: game.status || "scheduled",
    scoreHome: game.scoreHome !== null && game.scoreHome !== undefined ? game.scoreHome : 0,
    scoreAway: game.scoreAway !== null && game.scoreAway !== undefined ? game.scoreAway : 0,
    week: game.week || "",
    groupId: game.groupId || "",
    city: game.city || "",
    stadiumAddress: game.stadiumAddress || "",
    selectedStadiumKey: "manual",
    streamUrl: game.streamUrl || "",
    streamStatus: game.streamStatus || (game.streamUrl ? "approved" : "pending"),
    streamEnabled: !!game.streamEnabled,
    streamProviderId: game.streamProviderId || "",
    streamProviderName: game.streamProviderName || "",
    streamProviderLogo: game.streamProviderLogo || "",
    streamLinks: normalizeStreamLinks(game),
    attendance: game.attendance || "",
    weather: game.weather || "",
    notes: game.notes || "",
    competitionId: game.competitionId || game.tournamentId || "",
    tournamentId: game.tournamentId || game.competitionId || "",
    roundName: game.roundName || "",
    round: game.round || "",
    matchupIndex: game.matchupIndex ?? "",
    isCompetitionGame: !!game.isCompetitionGame,
    isTopGame: !!game.isTopGame,
    topGameScore: game.topGameScore ?? "",
    predictionEnabled: game.predictionEnabled !== false,
    isHighlight: !!game.isHighlight || !!game.hasHighlight || !!game.highlightVideoUrl,
    highlightVideoUrl: game.highlightVideoUrl || game.highlightUrl || game.videoUrl || "",
    highlightThumbnail: game.highlightThumbnail || game.thumbnailUrl || "",
    highlightTitle: game.highlightTitle || "",
    highlightSubtitle: game.highlightSubtitle || "",
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          {filtered.length} von {games.length} Spielen
        </p>

        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" />
          Neues Spiel
        </Button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suchen nach Team, Liga, Datum, Ort..."
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {["all", ...GAME_STATUSES].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {status === "all" ? "Alle" : getStatusLabel(status)}
              </button>
            ))}
          </div>

          <Select value={filterLeague} onValueChange={setFilterLeague}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Liga filtern" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Ligen</SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.shortName || league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {adding && (
        <Card className="p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Neues Spiel</h2>

          <GameForm
            teams={teams}
            leagues={leagues}
            competitions={competitions}
            providers={streamingProviders}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setAdding(false)}
            isSaving={createMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Spiele gefunden
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((game) => {
            const homeTeam = teamMap[game.homeTeamId];
            const awayTeam = teamMap[game.awayTeamId];
            const league = leagueMap[game.leagueId];
            const competition = competitionMap[game.competitionId || game.tournamentId];

            const homeName = getTeamLabel(game.homeTeamId, game.homeTeamPlaceholder);
            const awayName = getTeamLabel(game.awayTeamId, game.awayTeamPlaceholder);
            const visibleStreams = getVisibleStreamLinks(game);
            const isCancelled = game.status === "cancelled";

            return (
              <Card key={game.id} className={`p-3 ${isCancelled ? "border-orange-500/30 bg-orange-500/5" : ""}`}>
                {editingId === game.id ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Bearbeiten
                    </p>

                    <GameForm
                      initial={getInitialForm(game)}
                      gameId={game.id}
                      teams={teams}
                      leagues={leagues}
                      competitions={competitions}
                      providers={streamingProviders}
                      onSave={(data) => updateMutation.mutate({ id: game.id, data })}
                      onCancel={() => setEditingId(null)}
                      isSaving={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <Badge className={`text-[10px] border-0 ${STATUS_COLORS[game.status] || STATUS_COLORS.scheduled}`}>
                          {getStatusLabel(game.status)}
                        </Badge>

                        {game.predictionEnabled === false && !isCancelled && (
                          <Badge className="text-[10px] border-0 bg-orange-500/15 text-orange-400">
                            Tippspiel aus
                          </Badge>
                        )}

                        {visibleStreams.length > 0 && !isCancelled && (
                          <Badge className="text-[10px] border-0 bg-blue-500/15 text-blue-400">
                            {visibleStreams.length === 1 ? "Stream" : `${visibleStreams.length} Streams`}
                          </Badge>
                        )}

                        {(game.isCompetitionGame || game.competitionId || game.tournamentId) && (
                          <Badge className="text-[10px] border-0 bg-primary/15 text-primary">
                            <Trophy className="w-3 h-3 mr-1" />
                            Wettbewerb
                          </Badge>
                        )}

                        <span className="text-[10px] text-muted-foreground">
                          {league?.shortName || league?.name || "Keine Liga"}
                        </span>

                        {game.roundName && (
                          <span className="text-[10px] text-muted-foreground">
                            · {game.roundName}
                          </span>
                        )}

                        {competition?.name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                            · {competition.name}
                          </span>
                        )}
                      </div>

                      <div className={`grid grid-cols-[1fr_auto_1fr] gap-2 items-center ${isCancelled ? "opacity-75" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamLogo team={homeTeam} placeholder={game.homeTeamPlaceholder} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              {getTeamShortLabel(game.homeTeamId, game.homeTeamPlaceholder)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {homeName}
                            </p>
                          </div>
                        </div>

                        <div className="text-center min-w-[64px]">
                          {isCancelled ? (
                            <p className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                              abgesagt
                            </p>
                          ) : game.status !== "scheduled" ? (
                            <p className="text-sm font-black">
                              {game.scoreHome ?? 0} : {game.scoreAway ?? 0}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-muted-foreground">
                              vs
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              {getTeamShortLabel(game.awayTeamId, game.awayTeamPlaceholder)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {awayName}
                            </p>
                          </div>
                          <TeamLogo team={awayTeam} placeholder={game.awayTeamPlaceholder} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(game.date)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game.time || game.kickoffTime || "ohne Uhrzeit"}
                        </span>

                        {game.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {game.venue}
                          </span>
                        )}

                        {game.week && <span>Spieltag {game.week}</span>}

                        {game.topGameScore !== null && game.topGameScore !== undefined && game.topGameScore !== "" && !isCancelled && (
                          <span>Top +{game.topGameScore}</span>
                        )}
                      </div>

                      {visibleStreams.length > 0 && !isCancelled && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {visibleStreams.map((stream) => (
                            <a
                              key={stream.id}
                              href={stream.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/20"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {stream.providerLogo && (
                                <img
                                  src={getImageUrl(stream.providerLogo)}
                                  alt=""
                                  className="w-3 h-3 rounded object-contain bg-background"
                                />
                              )}
                              {stream.providerName || stream.label || "Stream"}
                            </a>
                          ))}
                        </div>
                      )}

                      {isCancelled && (
                        <p className="text-[10px] text-orange-300 mt-3">
                          Dieses Spiel ist abgesagt und wird nicht gewertet.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button type="button" className="p-1.5 rounded-lg hover:bg-secondary" onClick={() => setEditingId(game.id)}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>

                      <button type="button" className="p-1.5 rounded-lg hover:bg-destructive/10" onClick={() => setDeleteTarget(game)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Spiel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Spiel wird endgültig gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-2">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Löschen"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
