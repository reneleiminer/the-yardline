import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  KeyRound,
  Loader2,
  Radio,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useSetHeader from "@/hooks/useSetHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getImageUrl } from "@/lib/imageUtils";

const PODCAST_VERSION = "podcast_feature";

function parseJsonMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePodcast(item) {
  const meta = parseJsonMessage(item?.message);

  return {
    id: item?.id || "",
    spotify_url: meta.spotify_url || meta.url || "",
    podcast_title: meta.podcast_title || meta.show_title || "Football Germany Podcast",
    episode_title: meta.episode_title || item?.title || "",
    description: meta.description || "",
    thumbnail_url: meta.thumbnail_url || item?.imageUrl || "",
    partner_name: meta.partner_name || meta.author_name || "Football Germany",
    active: item?.isActive !== false && meta.active !== false,
    updated_at: meta.updated_at || item?.updatedAtUtc || item?.updated_date || item?.createdAtUtc || item?.created_date || "",
  };
}

function cleanUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function getStoredPassword(appUser) {
  return (
    appUser?.internalPassword ||
    appUser?.password ||
    appUser?.loginPassword ||
    appUser?.temporaryPassword ||
    ""
  );
}

function isSpotifyUrl(value) {
  return /^https:\/\/open\.spotify\.com\/(episode|show)\//i.test(String(value || "").trim());
}

function PodcastPreview({ form }) {
  const imageUrl = form.thumbnail_url;

  return (
    <Card className="p-4 overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-2xl bg-secondary border border-border/50 overflow-hidden flex items-center justify-center flex-shrink-0">
          {imageUrl ? (
            <img
              src={getImageUrl(imageUrl)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Radio className="w-8 h-8 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">
            Podcast
          </p>

          <h2 className="text-base font-black leading-tight mt-1 whitespace-normal break-words">
            {form.episode_title || "Neue Folge"}
          </h2>

          <p className="text-xs text-muted-foreground mt-1 whitespace-normal break-words">
            <span className="font-bold text-foreground">
              {form.partner_name || "Football Germany"}
            </span>
            {form.podcast_title ? ` · ${form.podcast_title}` : ""}
          </p>

          {form.spotify_url && (
            <a
              href={form.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mt-3"
            >
              Spotify öffnen
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function AccountSettings({ appUser, onSessionRefresh }) {
  const [username, setUsername] = useState(appUser?.username || appUser?.internalUsername || "");
  const [displayName, setDisplayName] = useState(appUser?.displayName || "Football Germany");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(appUser?.username || appUser?.internalUsername || "");
    setDisplayName(appUser?.displayName || "Football Germany");
  }, [appUser?.id, appUser?.username, appUser?.internalUsername, appUser?.displayName]);

  const saveAccount = async () => {
    if (!appUser?.id) {
      toast.error("Account konnte nicht geladen werden.");
      return;
    }

    const nextUsername = cleanUsername(username);
    const nextDisplayName = displayName.trim();
    const nextPassword = newPassword.trim();
    const storedPassword = getStoredPassword(appUser);

    if (!nextUsername) {
      toast.error("Bitte Benutzernamen eingeben.");
      return;
    }

    if (!nextDisplayName) {
      toast.error("Bitte Anzeigenamen eingeben.");
      return;
    }

    if (nextPassword) {
      if (!currentPassword.trim()) {
        toast.error("Bitte aktuelles Passwort eingeben.");
        return;
      }

      if (String(storedPassword) !== currentPassword.trim()) {
        toast.error("Aktuelles Passwort ist falsch.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        username: nextUsername,
        internalUsername: nextUsername,
        displayName: nextDisplayName,
        updatedAtUtc: new Date().toISOString(),
      };

      if (nextPassword) {
        payload.internalPassword = nextPassword;
      }

      await base44.entities.AppUser.update(appUser.id, payload);
      await onSessionRefresh?.({
        username: nextUsername,
        password: nextPassword || currentPassword.trim() || storedPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      toast.success("Account gespeichert");
    } catch (error) {
      console.error("PODCAST ACCOUNT UPDATE ERROR:", error);
      toast.error(error.message || "Account konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>

        <div>
          <h2 className="text-sm font-bold">
            Profil & Login
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anzeigename, Benutzername und Passwort ändern.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={displayName}
          onChange={event => setDisplayName(event.target.value)}
          placeholder="Anzeigename"
          autoComplete="name"
        />

        <Input
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="Benutzername"
          autoComplete="username"
        />

        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">
              Passwort ändern
            </p>
          </div>

          <Input
            type="password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            placeholder="Aktuelles Passwort"
            autoComplete="current-password"
          />

          <Input
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="Neues Passwort optional"
            autoComplete="new-password"
          />
        </div>

        <Button
          type="button"
          onClick={saveAccount}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Account speichern
        </Button>
      </div>
    </Card>
  );
}

export default function PodcastDashboard() {
  useSetHeader({ mode: "dashboard", title: "Podcast" });

  const queryClient = useQueryClient();
  const { appUserSnapshot, internalLogin } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["podcast-feature"],
    queryFn: () => base44.entities.AppUpdate.filter({ version: PODCAST_VERSION }),
  });

  const existingItem = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.updatedAtUtc || a.updated_date || a.createdAtUtc || a.created_date || "";
      const dateB = b.updatedAtUtc || b.updated_date || b.createdAtUtc || b.created_date || "";
      return String(dateB).localeCompare(String(dateA));
    })[0] || null;
  }, [items]);

  const podcast = useMemo(() => normalizePodcast(existingItem), [existingItem]);

  const [form, setForm] = useState({
    spotify_url: "",
    podcast_title: "Football Germany Podcast",
    episode_title: "",
    description: "",
    thumbnail_url: "",
    partner_name: "Football Germany",
    active: true,
  });

  const [loadingSpotify, setLoadingSpotify] = useState(false);

  useEffect(() => {
    setForm({
      spotify_url: podcast.spotify_url || "",
      podcast_title: podcast.podcast_title || "Football Germany Podcast",
      episode_title: podcast.episode_title || "",
      description: podcast.description || "",
      thumbnail_url: podcast.thumbnail_url || "",
      partner_name: podcast.partner_name || appUserSnapshot?.displayName || "Football Germany",
      active: podcast.active !== false,
    });
  }, [podcast.id, appUserSnapshot?.displayName]);

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const loadSpotifyMeta = async () => {
    const spotifyUrl = form.spotify_url.trim();

    if (!isSpotifyUrl(spotifyUrl)) {
      toast.error("Bitte einen Spotify-Link zu einer Folge oder Show eintragen.");
      return;
    }

    setLoadingSpotify(true);

    try {
      const response = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
      );

      if (!response.ok) {
        throw new Error("Spotify konnte die Daten nicht liefern.");
      }

      const data = await response.json();

      setForm(current => ({
        ...current,
        episode_title: data.title || current.episode_title,
        podcast_title: data.author_name || current.podcast_title || "Football Germany Podcast",
        thumbnail_url: data.thumbnail_url || current.thumbnail_url,
        partner_name: current.partner_name || appUserSnapshot?.displayName || "Football Germany",
      }));

      toast.success("Spotify-Daten geladen");
    } catch (error) {
      console.error("SPOTIFY OEMBED ERROR:", error);
      toast.error(error.message || "Spotify-Daten konnten nicht geladen werden.");
    } finally {
      setLoadingSpotify(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const spotifyUrl = form.spotify_url.trim();

      if (!spotifyUrl) {
        throw new Error("Bitte Spotify-Link eintragen.");
      }

      if (!isSpotifyUrl(spotifyUrl)) {
        throw new Error("Bitte einen gültigen Spotify-Link eintragen.");
      }

      if (!form.episode_title.trim()) {
        throw new Error("Bitte Folgentitel eintragen.");
      }

      const now = new Date().toISOString();
      const meta = {
        spotify_url: spotifyUrl,
        podcast_title: form.podcast_title.trim() || "Football Germany Podcast",
        episode_title: form.episode_title.trim(),
        description: form.description.trim(),
        thumbnail_url: form.thumbnail_url.trim(),
        partner_name: form.partner_name.trim() || appUserSnapshot?.displayName || "Football Germany",
        active: form.active,
        updated_at: now,
      };

      const payload = {
        title: meta.episode_title,
        version: PODCAST_VERSION,
        isActive: form.active,
        showAsPopup: false,
        imageUrl: meta.thumbnail_url,
        message: JSON.stringify(meta),
        updatedAtUtc: now,
      };

      if (existingItem?.id) {
        return base44.entities.AppUpdate.update(existingItem.id, payload);
      }

      return base44.entities.AppUpdate.create({
        ...payload,
        createdAtUtc: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcast-feature"] });
      queryClient.invalidateQueries({ queryKey: ["home-app-updates"] });
      toast.success("Podcast gespeichert");
    },
    onError: error => {
      toast.error(error.message || "Podcast konnte nicht gespeichert werden");
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
      <Card className="p-5 overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Radio className="w-6 h-6 text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">
              Football Germany
            </p>

            <h1 className="text-xl font-black leading-tight mt-1">
              Podcast im Home
            </h1>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Spotify-Link eintragen, Daten laden und speichern. Die Karte erscheint im Home unter Game Highlights.
            </p>
          </div>
        </div>
      </Card>

      <PodcastPreview form={form} />

      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h2 className="text-sm font-bold">
              Spotify-Podcast
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Link zu einer Spotify-Folge oder Show.
            </p>
          </div>
        </div>

        <Input
          value={form.spotify_url}
          onChange={event => set("spotify_url", event.target.value)}
          placeholder="https://open.spotify.com/episode/..."
          inputMode="url"
        />

        <Button
          type="button"
          variant="outline"
          onClick={loadSpotifyMeta}
          disabled={loadingSpotify || !form.spotify_url.trim()}
          className="w-full"
        >
          {loadingSpotify ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Daten aus Spotify laden
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={form.partner_name}
            onChange={event => set("partner_name", event.target.value)}
            placeholder="Name im Home, z.B. Football Germany"
          />

          <Input
            value={form.podcast_title}
            onChange={event => set("podcast_title", event.target.value)}
            placeholder="Podcast Name"
          />
        </div>

        <Input
          value={form.episode_title}
          onChange={event => set("episode_title", event.target.value)}
          placeholder="Folgentitel"
        />

        <Input
          value={form.thumbnail_url}
          onChange={event => set("thumbnail_url", event.target.value)}
          placeholder="Cover URL optional"
          inputMode="url"
        />

        <Textarea
          value={form.description}
          onChange={event => set("description", event.target.value)}
          placeholder="Beschreibung optional"
          className="min-h-[90px]"
        />

        <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.active}
            onChange={event => set("active", event.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Im Home anzeigen
        </label>

        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Podcast speichern
        </Button>
      </Card>

      <AccountSettings
        appUser={appUserSnapshot}
        onSessionRefresh={({ username, password }) => internalLogin({ username, password })}
      />
    </div>
  );
}
