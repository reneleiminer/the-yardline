import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSetHeader from '@/hooks/useSetHeader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ImageUploadField from '@/components/create/ImageUploadField';
import {
  BarChart3,
  Building2,
  Camera,
  CalendarDays,
  ChevronRight,
  FileText,
  Flame,
  Handshake,
  HeadphonesIcon,
  Image,
  ListOrdered,
  Loader2,
  Menu,
  Pencil,
  PlaySquare,
  Radio,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserCog,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import TodaysGamesReminder from '@/components/admin/TodaysGamesReminder';
import { getImageUrl } from '@/lib/imageUtils';

const TEAM_SPOTLIGHT_VERSION = 'team_spotlight';
const AD_BANNER_VERSION = 'ad_banner';
const COMMUNITY_CLIP_VERSION = 'community_clip';
const COMMUNITY_CLIP_SUBMISSION_VERSION = 'community_clip_submission';
const GAMEDAY_SHOT_VERSION = 'gameday_photo';
const ANALYTICS_VERSION = 'analytics_event';
const APP_BRANDING_VERSION = 'app_branding';

const StatBadge = ({ count }) => {
  if (count == null) return null;

  return (
    <span className="ml-auto bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
};

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekStart(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);

  return next;
}

function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getEventDate(item) {
  const meta = parseMessage(item.message);
  const value =
    meta.created_at ||
    item.createdAtUtc ||
    item.created_date ||
    item.updatedAtUtc ||
    '';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getVisitorIdFromEvent(item) {
  const meta = parseMessage(item.message);
  return meta.visitor_id || meta.user_id || meta.userId || '';
}

function buildAnalyticsStats(events = []) {
  const now = new Date();

  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const unique24h = new Set();
  const unique7d = new Set();
  const unique30d = new Set();

  let views24h = 0;
  let views7d = 0;
  let views30d = 0;

  events.forEach(event => {
    const date = getEventDate(event);
    if (!date) return;

    const visitorId = getVisitorIdFromEvent(event);

    if (date >= since24h) {
      views24h += 1;
      if (visitorId) unique24h.add(visitorId);
    }

    if (date >= since7d) {
      views7d += 1;
      if (visitorId) unique7d.add(visitorId);
    }

    if (date >= since30d) {
      views30d += 1;
      if (visitorId) unique30d.add(visitorId);
    }
  });

  return {
    active24h: unique24h.size,
    active7d: unique7d.size,
    active30d: unique30d.size,
    views24h,
    views7d,
    views30d,
  };
}

function normalizeSpotlight(item) {
  const meta = parseMessage(item.message);

  return {
    ...item,
    team_id: meta.team_id || '',
    start_date: meta.start_date || '',
    end_date: meta.end_date || '',
    headline: meta.headline || item.title || '',
    description: meta.description || '',
    active: item.isActive !== false && meta.active !== false,
  };
}

function normalizeAdBanner(item) {
  const meta = parseMessage(item.message);

  return {
    ...item,
    title: item.title || meta.title || '',
    image_url: meta.image_url || item.imageUrl || '',
    link_url: meta.link_url || '',
    position: meta.position || 'after_highlights',
    active: item.isActive !== false && meta.active !== false,
    start_date: meta.start_date || '',
    end_date: meta.end_date || '',
    sort_order: Number(meta.sort_order || 0),
  };
}

function normalizeBranding(item) {
  const meta = parseMessage(item?.message);

  return {
    id: item?.id || '',
    header_icon_url: meta.header_icon_url || item?.imageUrl || '',
    app_name_top: meta.app_name_top || 'THE',
    app_name_bottom: meta.app_name_bottom || 'YARDLINE',
  };
}

function getDateStatus(item) {
  if (!item.active) return 'Inaktiv';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = item.start_date ? new Date(`${item.start_date}T00:00:00`) : null;
  const end = item.end_date ? new Date(`${item.end_date}T23:59:59`) : null;

  if (start && today < start) return 'Geplant';
  if (end && today > end) return 'Abgelaufen';

  return 'Aktiv';
}

function getSpotlightStatus(spotlight) {
  if (!spotlight.start_date || !spotlight.end_date) return 'UnvollstÃ¤ndig';
  return getDateStatus(spotlight);
}

const EMPTY_SPOTLIGHT_FORM = {
  team_id: '',
  start_date: toInputDate(getWeekStart()),
  end_date: toInputDate(getWeekEnd()),
  headline: '',
  description: '',
  active: true,
};

const EMPTY_BANNER_FORM = {
  title: '',
  image_url: '',
  link_url: '',
  position: 'after_highlights',
  start_date: toInputDate(new Date()),
  end_date: '',
  sort_order: '0',
  active: true,
};

const EMPTY_BRANDING_FORM = {
  header_icon_url: '',
  app_name_top: 'THE',
  app_name_bottom: 'YARDLINE',
};

function ToggleButton({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function TeamSpotlightPlanner({
  teams,
  spotlights,
  editingId,
  setEditingId,
  formData,
  setFormData,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
}) {
  const selectedTeam = teams.find(team => team.id === formData.team_id);

  const resetToCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_SPOTLIGHT_FORM);
  };

  const handleEdit = spotlight => {
    setEditingId(spotlight.id);
    setFormData({
      team_id: spotlight.team_id || '',
      start_date: spotlight.start_date || toInputDate(getWeekStart()),
      end_date: spotlight.end_date || toInputDate(getWeekEnd()),
      headline: spotlight.headline || '',
      description: spotlight.description || '',
      active: spotlight.active !== false,
    });
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Home
          </p>

          <h2 className="text-lg font-black mt-0.5">
            Team Spotlight Plan
          </h2>

          <p className="text-xs text-muted-foreground mt-1">
            Plane das wÃ¶chentliche Team Spotlight fÃ¼r die Home-Seite.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          SchlieÃŸen
        </button>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/40 p-3 mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Team
            </span>

            <select
              value={formData.team_id}
              onChange={event => setFormData(current => ({ ...current, team_id: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="">Team auswÃ¤hlen</option>
              {teams
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name || team.shortName || team.id}
                  </option>
                ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Headline optional
            </span>

            <input
              value={formData.headline}
              onChange={event => setFormData(current => ({ ...current, headline: event.target.value }))}
              placeholder="z.B. Team der Woche"
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Startdatum
            </span>

            <input
              type="date"
              value={formData.start_date}
              onChange={event => setFormData(current => ({ ...current, start_date: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Enddatum
            </span>

            <input
              type="date"
              value={formData.end_date}
              onChange={event => setFormData(current => ({ ...current, end_date: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Beschreibung optional
          </span>

          <textarea
            value={formData.description}
            onChange={event => setFormData(current => ({ ...current, description: event.target.value }))}
            placeholder="Kurzer Text zum Team Spotlight"
            className="w-full min-h-24 rounded-xl bg-secondary/50 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
          />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-3">
          <div>
            <p className="text-sm font-semibold">Aktiv</p>
            <p className="text-xs text-muted-foreground">
              Sichtbar, wenn der Zeitraum passt
            </p>
          </div>

          <ToggleButton
            checked={formData.active}
            onChange={value => setFormData(current => ({ ...current, active: value }))}
          />
        </div>

        {selectedTeam && (
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 p-3">
            <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center p-1.5 flex-shrink-0">
              {selectedTeam.logo ? (
                <img
                  src={getImageUrl(selectedTeam.logo)}
                  alt={selectedTeam.name || ''}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-sm font-black">
                  {selectedTeam.shortName?.[0] || selectedTeam.name?.[0] || '?'}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black truncate">
                {selectedTeam.name || selectedTeam.shortName}
              </p>

              <p className="text-xs text-muted-foreground truncate">
                Vorschau-Team
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={editingId ? onUpdate : onCreate}
            disabled={isSaving}
            className="col-span-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60 flex items-center justify-center"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingId ? (
              'Speichern'
            ) : (
              'Planen'
            )}
          </button>

          <button
            type="button"
            onClick={resetToCreate}
            className="h-10 rounded-xl bg-secondary text-sm font-bold"
          >
            Neu
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {spotlights.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-background/40 py-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Noch keine Spotlights geplant
            </p>
          </div>
        ) : (
          spotlights.map(spotlight => {
            const team = teams.find(item => item.id === spotlight.team_id);
            const status = getSpotlightStatus(spotlight);

            return (
              <article
                key={spotlight.id}
                className="rounded-xl border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">
                        {team?.name || spotlight.headline || 'Team Spotlight'}
                      </p>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'Aktiv'
                            ? 'bg-green-500/15 text-green-400'
                            : status === 'Abgelaufen'
                            ? 'bg-muted text-muted-foreground'
                            : status === 'Geplant'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-orange-500/15 text-orange-400'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1">
                      {spotlight.start_date || 'offen'} bis {spotlight.end_date || 'offen'}
                    </p>

                    {spotlight.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {spotlight.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(spotlight)}
                    className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold flex-1 inline-flex items-center justify-center"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Bearbeiten
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(spotlight.id)}
                    disabled={isDeleting}
                    className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-red-400 inline-flex items-center justify-center disabled:opacity-60"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function AdBannerPlanner({
  banners,
  editingId,
  setEditingId,
  formData,
  setFormData,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
}) {
  const resetToCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_BANNER_FORM);
  };

  const handleEdit = banner => {
    setEditingId(banner.id);
    setFormData({
      title: banner.title || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      position: banner.position || 'after_highlights',
      start_date: banner.start_date || toInputDate(new Date()),
      end_date: banner.end_date || '',
      sort_order: String(banner.sort_order || 0),
      active: banner.active !== false,
    });
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Home
          </p>

          <h2 className="text-lg font-black mt-0.5">
            Werbe-Banner
          </h2>

          <p className="text-xs text-muted-foreground mt-1">
            Erstelle dezente Banner nur fÃ¼r die Home-Seite.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          SchlieÃŸen
        </button>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/40 p-3 mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Titel optional
            </span>

            <input
              value={formData.title}
              onChange={event => setFormData(current => ({ ...current, title: event.target.value }))}
              placeholder="z.B. Werbung / Kampagnenname"
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Position
            </span>

            <select
              value={formData.position}
              onChange={event => setFormData(current => ({ ...current, position: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="after_highlights">Nach Highlights</option>
              <option value="after_upcoming">Nach Kommende Spiele</option>
              <option value="before_spotlight">Unten vor Team Spotlight</option>
            </select>
          </label>

          <div className="space-y-2 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bild / Logo
            </span>

            <ImageUploadField
              label="Werbebanner vom GerÃ¤t hochladen"
              value={formData.image_url}
              onChange={value => setFormData(current => ({ ...current, image_url: value }))}
            />

            <input
              value={formData.image_url}
              onChange={event => setFormData(current => ({ ...current, image_url: event.target.value }))}
              placeholder="Oder Bild-URL einfÃ¼gen"
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />

            <p className="text-[10px] text-muted-foreground">
              Du kannst ein Bild direkt vom GerÃ¤t hochladen oder eine bestehende Bild-URL nutzen.
            </p>
          </div>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Kunden-Link / Zielseite
            </span>

            <input
              value={formData.link_url}
              onChange={event => setFormData(current => ({ ...current, link_url: event.target.value }))}
              placeholder="https://www.kundenseite.de"
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />

            <p className="text-[10px] text-muted-foreground">
              Wenn ein Link eingetragen ist, Ã¶ffnet sich diese Seite beim Klick auf die Werbung.
            </p>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Startdatum
            </span>

            <input
              type="date"
              value={formData.start_date}
              onChange={event => setFormData(current => ({ ...current, start_date: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Enddatum optional
            </span>

            <input
              type="date"
              value={formData.end_date}
              onChange={event => setFormData(current => ({ ...current, end_date: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sortierung
            </span>

            <input
              type="number"
              value={formData.sort_order}
              onChange={event => setFormData(current => ({ ...current, sort_order: event.target.value }))}
              className="w-full h-11 rounded-xl bg-secondary/50 border border-border/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-3">
          <div>
            <p className="text-sm font-semibold">Aktiv</p>
            <p className="text-xs text-muted-foreground">
              Sichtbar, wenn der Zeitraum passt
            </p>
          </div>

          <ToggleButton
            checked={formData.active}
            onChange={value => setFormData(current => ({ ...current, active: value }))}
          />
        </div>

        {(formData.title || formData.image_url) && (
          <div className="rounded-2xl border border-white/10 bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-3 min-h-[54px]">
              {formData.image_url && (
                <div className="w-16 h-10 rounded-xl bg-black/25 border border-white/10 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                  <img
                    src={getImageUrl(formData.image_url)}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-primary">
                  Werbung
                </p>

                <p className="text-xs font-black truncate mt-0.5">
                  {formData.title || 'Werbe-Banner'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={editingId ? onUpdate : onCreate}
            disabled={isSaving}
            className="col-span-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60 flex items-center justify-center"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingId ? (
              'Speichern'
            ) : (
              'Erstellen'
            )}
          </button>

          <button
            type="button"
            onClick={resetToCreate}
            className="h-10 rounded-xl bg-secondary text-sm font-bold"
          >
            Neu
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {banners.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-background/40 py-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Noch keine Banner erstellt
            </p>
          </div>
        ) : (
          banners.map(banner => {
            const status = getDateStatus(banner);

            return (
              <article
                key={banner.id}
                className="rounded-xl border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">
                        {banner.title || 'Werbe-Banner'}
                      </p>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'Aktiv'
                            ? 'bg-green-500/15 text-green-400'
                            : status === 'Abgelaufen'
                            ? 'bg-muted text-muted-foreground'
                            : status === 'Geplant'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-orange-500/15 text-orange-400'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1">
                      {banner.position} Â· {banner.start_date || 'sofort'} bis {banner.end_date || 'offen'}
                    </p>

                    {banner.link_url && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {banner.link_url}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(banner)}
                    className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold flex-1 inline-flex items-center justify-center"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Bearbeiten
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(banner.id)}
                    disabled={isDeleting}
                    className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-red-400 inline-flex items-center justify-center disabled:opacity-60"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function AppBrandingPlanner({
  branding,
  formData,
  setFormData,
  onClose,
  onSave,
  isSaving,
}) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            App Design
          </p>

          <h2 className="text-lg font-black mt-0.5">
            Header Logo
          </h2>

          <p className="text-xs text-muted-foreground mt-1">
            Lade hier dein fertiges breites Header-Logo hoch. Es wird mittig im Header angezeigt.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          Schliessen
        </button>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/40 p-3 mb-4 space-y-3">
        <ImageUploadField
          label="Header-Logo vom Geraet hochladen"
          value={formData.header_icon_url}
          onChange={value => setFormData(current => ({ ...current, header_icon_url: value }))}
        />

        <div className="rounded-2xl border border-white/10 bg-[#07111f] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Vorschau
          </p>

          <div className="relative h-14 rounded-xl bg-[#050914] border border-white/8 overflow-hidden">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center">
              <Menu className="w-5 h-5 text-white/85" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-14">
              {formData.header_icon_url ? (
                <img
                  src={getImageUrl(formData.header_icon_url)}
                  alt="The Yardline"
                  className="h-9 max-w-[210px] w-auto object-contain"
                />
              ) : (
                <span className="text-base font-black tracking-wide uppercase text-white">
                  Yardline
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            Am besten ein transparentes PNG oder WebP verwenden, breit zugeschnitten, ohne Hintergrundkasten.
          </p>
        </div>

        {branding?.id && (
          <p className="text-[10px] text-muted-foreground">
            Aktuelles Branding wird beim Speichern ueberschrieben.
          </p>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60 flex items-center justify-center"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Logo speichern'
          )}
        </button>
      </div>
    </section>
  );
}
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showSpotlightPlanner, setShowSpotlightPlanner] = useState(false);
  const [editingSpotlightId, setEditingSpotlightId] = useState(null);
  const [spotlightForm, setSpotlightForm] = useState(EMPTY_SPOTLIGHT_FORM);

  const [showBannerPlanner, setShowBannerPlanner] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);

  const [showBrandingPlanner, setShowBrandingPlanner] = useState(false);
  const [brandingForm, setBrandingForm] = useState(EMPTY_BRANDING_FORM);

  useSetHeader({
  mode: 'back',
  title: 'Admin Dashboard',
  backTo: '/',
});

  const { data: users = [] } = useQuery({
    queryKey: ['admin-count-users'],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-count-leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-count-teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: games = [] } = useQuery({
    queryKey: ['admin-count-games'],
    queryFn: () => base44.entities.Game.list(),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['admin-count-partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: competitions = [] } = useQuery({
    queryKey: ['admin-count-competitions'],
    queryFn: () => base44.entities.Tournament.list(),
  });

  const { data: highlights = [] } = useQuery({
    queryKey: ['admin-count-highlights'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');
      return all.filter(item => item.version === 'game_highlight');
    },
  });

  const { data: analyticsEvents = [] } = useQuery({
    queryKey: ['admin-analytics-events'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date', 2000);
      return all.filter(item => item.version === ANALYTICS_VERSION);
    },
  });

  const { data: communityClipItems = [] } = useQuery({
    queryKey: ['admin-count-community-clips'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.filter(item =>
        item.version === COMMUNITY_CLIP_VERSION ||
        item.version === COMMUNITY_CLIP_SUBMISSION_VERSION
      );
    },
  });


  const { data: gameDayShots = [] } = useQuery({
    queryKey: ['admin-count-gameday-shots'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');
      return all.filter(item => item.version === GAMEDAY_SHOT_VERSION && item.isActive !== false);
    },
  });

  const { data: spotlights = [] } = useQuery({
    queryKey: ['admin-team-spotlights'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');
      return all
        .filter(item => item.version === TEAM_SPOTLIGHT_VERSION)
        .map(normalizeSpotlight);
    },
  });

  const { data: adBanners = [] } = useQuery({
    queryKey: ['admin-ad-banners'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');
      return all
        .filter(item => item.version === AD_BANNER_VERSION)
        .map(normalizeAdBanner);
    },
  });

  const { data: appBranding = null } = useQuery({
    queryKey: ['admin-app-branding'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');
      const item = all.find(entry => entry.version === APP_BRANDING_VERSION);

      return item ? normalizeBranding(item) : null;
    },
  });

  useEffect(() => {
    if (!appBranding) return;

    setBrandingForm({
      header_icon_url: appBranding.header_icon_url || '',
      app_name_top: appBranding.app_name_top || 'THE',
      app_name_bottom: appBranding.app_name_bottom || 'YARDLINE',
    });
  }, [appBranding]);

  const { data: supportTickets = [] } = useQuery({
    queryKey: ['admin-count-support'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date'),
  });

  const { data: streamRequests = [] } = useQuery({
    queryKey: ['admin-count-streams'],
    queryFn: () => base44.entities.SupportRequest.list(),
  });

  const invalidateSpotlights = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-team-spotlights'] });
    queryClient.invalidateQueries({ queryKey: ['home-team-spotlights'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const invalidateAdBanners = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ad-banners'] });
    queryClient.invalidateQueries({ queryKey: ['home-ad-banners'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const invalidateBranding = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-app-branding'] });
    queryClient.invalidateQueries({ queryKey: ['app-branding'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const buildSpotlightPayload = () => {
    const team = teams.find(item => item.id === spotlightForm.team_id);
    const headline = spotlightForm.headline.trim();

    const meta = {
      team_id: spotlightForm.team_id,
      start_date: spotlightForm.start_date,
      end_date: spotlightForm.end_date,
      headline,
      description: spotlightForm.description.trim(),
      active: spotlightForm.active,
    };

    return {
      title: headline || team?.name || 'Team Spotlight',
      message: JSON.stringify(meta),
      imageUrl: team?.logo || null,
      version: TEAM_SPOTLIGHT_VERSION,
      isActive: spotlightForm.active,
      showAsPopup: false,
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const buildBannerPayload = () => {
    const title = bannerForm.title.trim();
    const imageUrl = bannerForm.image_url.trim();

    const meta = {
      title,
      image_url: imageUrl,
      link_url: bannerForm.link_url.trim(),
      position: bannerForm.position,
      active: bannerForm.active,
      start_date: bannerForm.start_date,
      end_date: bannerForm.end_date,
      sort_order: Number(bannerForm.sort_order || 0),
    };

    return {
      title: title || 'Werbe-Banner',
      message: JSON.stringify(meta),
      imageUrl: imageUrl || null,
      version: AD_BANNER_VERSION,
      isActive: bannerForm.active,
      showAsPopup: false,
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const buildBrandingPayload = () => {
    const meta = {
      header_icon_url: brandingForm.header_icon_url.trim(),
      app_name_top: brandingForm.app_name_top.trim() || 'THE',
      app_name_bottom: brandingForm.app_name_bottom.trim() || 'YARDLINE',
    };

    return {
      title: 'App Branding',
      message: JSON.stringify(meta),
      imageUrl: meta.header_icon_url || null,
      version: APP_BRANDING_VERSION,
      isActive: false,
      showAsPopup: false,
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const validateSpotlightForm = () => {
    if (!spotlightForm.team_id) {
      toast.error('Bitte Team auswÃ¤hlen');
      return false;
    }

    if (!spotlightForm.start_date || !spotlightForm.end_date) {
      toast.error('Bitte Start- und Enddatum setzen');
      return false;
    }

    if (new Date(spotlightForm.end_date) < new Date(spotlightForm.start_date)) {
      toast.error('Enddatum darf nicht vor Startdatum liegen');
      return false;
    }

    return true;
  };

  const validateBannerForm = () => {
    if (!bannerForm.title.trim() && !bannerForm.image_url.trim()) {
      toast.error('Bitte Titel oder Bild/Logo URL eintragen');
      return false;
    }

    if (bannerForm.end_date && new Date(bannerForm.end_date) < new Date(bannerForm.start_date)) {
      toast.error('Enddatum darf nicht vor Startdatum liegen');
      return false;
    }

    return true;
  };

  const resetSpotlightForm = () => {
    setSpotlightForm(EMPTY_SPOTLIGHT_FORM);
    setEditingSpotlightId(null);
  };

  const resetBannerForm = () => {
    setBannerForm(EMPTY_BANNER_FORM);
    setEditingBannerId(null);
  };

  const createSpotlightMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.create({
      ...data,
      createdAtUtc: new Date().toISOString(),
    }),
    onSuccess: () => {
      invalidateSpotlights();
      toast.success('Team Spotlight geplant');
      resetSpotlightForm();
    },
    onError: error => {
      toast.error(error.message || 'Team Spotlight konnte nicht erstellt werden');
    },
  });

  const updateSpotlightMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.update(editingSpotlightId, data),
    onSuccess: () => {
      invalidateSpotlights();
      toast.success('Team Spotlight gespeichert');
      resetSpotlightForm();
    },
    onError: error => {
      toast.error(error.message || 'Team Spotlight konnte nicht gespeichert werden');
    },
  });

  const deleteSpotlightMutation = useMutation({
    mutationFn: id => base44.entities.AppUpdate.delete(id),
    onSuccess: () => {
      invalidateSpotlights();
      toast.success('Team Spotlight gelÃ¶scht');
      resetSpotlightForm();
    },
    onError: error => {
      toast.error(error.message || 'Team Spotlight konnte nicht gelÃ¶scht werden');
    },
  });

  const createBannerMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.create({
      ...data,
      createdAtUtc: new Date().toISOString(),
    }),
    onSuccess: () => {
      invalidateAdBanners();
      toast.success('Werbe-Banner erstellt');
      resetBannerForm();
    },
    onError: error => {
      toast.error(error.message || 'Werbe-Banner konnte nicht erstellt werden');
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: data => base44.entities.AppUpdate.update(editingBannerId, data),
    onSuccess: () => {
      invalidateAdBanners();
      toast.success('Werbe-Banner gespeichert');
      resetBannerForm();
    },
    onError: error => {
      toast.error(error.message || 'Werbe-Banner konnte nicht gespeichert werden');
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: id => base44.entities.AppUpdate.delete(id),
    onSuccess: () => {
      invalidateAdBanners();
      toast.success('Werbe-Banner gelÃ¶scht');
      resetBannerForm();
    },
    onError: error => {
      toast.error(error.message || 'Werbe-Banner konnte nicht gelÃ¶scht werden');
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async data => {
      if (appBranding?.id) {
        return base44.entities.AppUpdate.update(appBranding.id, data);
      }

      return base44.entities.AppUpdate.create({
        ...data,
        createdAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateBranding();
      toast.success('Branding gespeichert');
    },
    onError: error => {
      toast.error(error.message || 'Branding konnte nicht gespeichert werden');
    },
  });

  const handleCreateSpotlight = () => {
    if (!validateSpotlightForm()) return;
    createSpotlightMutation.mutate(buildSpotlightPayload());
  };

  const handleUpdateSpotlight = () => {
    if (!validateSpotlightForm()) return;
    updateSpotlightMutation.mutate(buildSpotlightPayload());
  };

  const handleCreateBanner = () => {
    if (!validateBannerForm()) return;
    createBannerMutation.mutate(buildBannerPayload());
  };

  const handleUpdateBanner = () => {
    if (!validateBannerForm()) return;
    updateBannerMutation.mutate(buildBannerPayload());
  };

  const handleSaveBranding = () => {
    saveBrandingMutation.mutate(buildBrandingPayload());
  };

  const dataEditors = users.filter(user => user.roleSlug === 'data_editor');

  const streamProviders = streamRequests.filter(item =>
    item.type === 'streaming_provider' &&
    item.status === 'approved' &&
    item.providerIsActive !== false
  );

  const openStreamRequests = streamRequests.filter(item =>
    item.type === 'streaming_provider_request' &&
    item.status === 'open'
  );

  const openSupportTickets = supportTickets.filter(ticket =>
    ticket.status === 'open' ||
    ticket.status === 'in_progress' ||
    !ticket.status
  );

  const activeHighlights = highlights.filter(item => item.isActive !== false);
  const activeSpotlights = spotlights.filter(item => getSpotlightStatus(item) === 'Aktiv');
  const activeBanners = adBanners.filter(item => getDateStatus(item) === 'Aktiv');
  const analyticsStats = buildAnalyticsStats(analyticsEvents);

  const pendingCommunitySubmissions = communityClipItems.filter(item =>
    item.version === COMMUNITY_CLIP_SUBMISSION_VERSION
  );

  const activeCommunityClips = communityClipItems.filter(item =>
    item.version === COMMUNITY_CLIP_VERSION &&
    item.isActive !== false
  );

  const sections = [
    {
      icon: UserCog,
      title: 'Dateneditor-Logins',
      description: 'Logins fÃ¼r Dateneditoren erstellen und verwalten',
      route: '/admin/users',
      count: dataEditors.length,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      icon: Image,
      title: 'App Branding',
      description: 'Header-Icon und App-Schriftzug verwalten',
      route: '__app_branding__',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      icon: Sparkles,
      title: 'Team Spotlight Plan',
      description: 'WÃ¶chentliches Team auf Home planen',
      route: '__team_spotlight__',
      count: activeSpotlights.length,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-400/10',
    },
    {
      icon: Image,
      title: 'Werbe-Banner',
      description: 'Dezente Home-Banner planen und verwalten',
      route: '__ad_banners__',
      count: activeBanners.length,
      color: 'text-lime-400',
      bg: 'bg-lime-400/10',
    },
    {
      icon: PlaySquare,
      title: 'Game Highlights',
      description: 'Hochformat-Highlights per URL posten',
      route: '/admin/highlights',
      count: activeHighlights.length,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
    {
      icon: Flame,
      title: 'Community Clips',
      description: 'Einsendungen prÃ¼fen und Clips verÃ¶ffentlichen',
      route: '/admin/community-clips',
      count: activeCommunityClips.length,
      badge: pendingCommunitySubmissions.length > 0 ? `${pendingCommunitySubmissions.length} neu` : null,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },    {
      icon: Trophy,
      title: 'Ligen',
      description: 'Ligen, Logos, Farben und Gruppen verwalten',
      route: '/admin/leagues',
      count: leagues.length,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      icon: Building2,
      title: 'Teams',
      description: 'Teams, Logos, Farben und Stadien verwalten',
      route: '/admin/teams',
      count: teams.length,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      icon: Swords,
      title: 'Spiele',
      description: 'Spielplan, Ergebnisse, Streams und Highlights',
      route: '/admin/games',
      count: games.length,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
    },
    {
      icon: Camera,
      title: 'GameDay Shots',
      description: 'Spielbilder, Credits und Captions verwalten',
      route: '/admin/gameday-shots',
      count: gameDayShots.length,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      icon: BarChart3,
      title: 'Game Statistics',
      description: 'After Game Stats, Game Leaders und Team-Vergleiche pflegen',
      route: '/user/statistics',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      icon: Radio,
      title: 'Streams',
      description: 'Streaming-Anbieter und Stream-Links verwalten',
      route: '/admin/streams',
      count: streamProviders.length,
      badge: openStreamRequests.length > 0 ? `${openStreamRequests.length} neu` : null,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
    },
    {
      icon: ListOrdered,
      title: 'Tabellen',
      description: 'Tabellen, Platzierungen und Zonen konfigurieren',
      route: '/admin/standings',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
    {
      icon: BarChart3,
      title: 'Wettbewerbe',
      description: 'Cups, Playoffs, Turniere und Brackets verwalten',
      route: '/admin/competitions',
      count: competitions.length,
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
    {
      icon: Handshake,
      title: 'Partner',
      description: 'Footer-Partner, Logos und Links verwalten',
      route: '/admin/partners',
      count: partners.length,
      color: 'text-teal-400',
      bg: 'bg-teal-400/10',
    },
    {
      icon: FileText,
      title: 'Rechtliches',
      description: 'Impressum, Datenschutz und Nutzungsbedingungen',
      route: '/admin/legal',
      color: 'text-slate-400',
      bg: 'bg-slate-400/10',
    },
    {
      icon: Zap,
      title: 'App Updates',
      description: 'Changelogs und Update-Hinweise erstellen',
      route: '/admin/updates',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      icon: HeadphonesIcon,
      title: 'Support',
      description: 'Fehlerberichte, Datenhinweise und Tickets bearbeiten',
      route: '/admin/support',
      badge: openSupportTickets.length > 0 ? `${openSupportTickets.length} offen` : null,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
    },  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <p className="text-xs text-muted-foreground mb-6">
        Admin-Zentrale fÃ¼r Daten, Logins und App-Inhalte.
      </p>

      <TodaysGamesReminder />

      <div className="rounded-2xl border border-primary/20 bg-card p-4 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              App Analytics
            </p>

            <h2 className="text-base font-black mt-0.5">
              Nutzer & Seitenaufrufe
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              Interne Richtwerte fÃ¼r Reichweite, AktivitÃ¤t und spÃ¤tere Werbepreise.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Aktiv 24h', value: analyticsStats.active24h },
            { label: 'Aktiv 7 Tage', value: analyticsStats.active7d },
            { label: 'Aktiv 30 Tage', value: analyticsStats.active30d },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-background/50 border border-border/50 rounded-xl p-2.5 text-center"
            >
              <div className="text-lg font-black text-primary">
                {stat.value}
              </div>

              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Views 24h', value: analyticsStats.views24h },
            { label: 'Views 7 Tage', value: analyticsStats.views7d },
            { label: 'Views 30 Tage', value: analyticsStats.views30d },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-background/40 border border-border/40 rounded-xl p-2.5 text-center"
            >
              <div className="text-base font-bold text-foreground">
                {stat.value}
              </div>

              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Ligen', value: leagues.length },
          { label: 'Teams', value: teams.length },
          { label: 'Spiele', value: games.length },
          { label: 'Highlights', value: activeHighlights.length },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-card border border-border/50 rounded-xl p-2.5 text-center"
          >
            <div className="text-base font-bold text-primary">
              {stat.value}
            </div>

            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {showBrandingPlanner && (
        <AppBrandingPlanner
          branding={appBranding}
          formData={brandingForm}
          setFormData={setBrandingForm}
          onClose={() => setShowBrandingPlanner(false)}
          onSave={handleSaveBranding}
          isSaving={saveBrandingMutation.isPending}
        />
      )}

      {showSpotlightPlanner && (
        <TeamSpotlightPlanner
          teams={teams}
          spotlights={spotlights}
          editingId={editingSpotlightId}
          setEditingId={setEditingSpotlightId}
          formData={spotlightForm}
          setFormData={setSpotlightForm}
          onClose={() => setShowSpotlightPlanner(false)}
          onCreate={handleCreateSpotlight}
          onUpdate={handleUpdateSpotlight}
          onDelete={id => deleteSpotlightMutation.mutate(id)}
          isSaving={createSpotlightMutation.isPending || updateSpotlightMutation.isPending}
          isDeleting={deleteSpotlightMutation.isPending}
        />
      )}

      {showBannerPlanner && (
        <AdBannerPlanner
          banners={adBanners}
          editingId={editingBannerId}
          setEditingId={setEditingBannerId}
          formData={bannerForm}
          setFormData={setBannerForm}
          onClose={() => setShowBannerPlanner(false)}
          onCreate={handleCreateBanner}
          onUpdate={handleUpdateBanner}
          onDelete={id => deleteBannerMutation.mutate(id)}
          isSaving={createBannerMutation.isPending || updateBannerMutation.isPending}
          isDeleting={deleteBannerMutation.isPending}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {sections.map(section => {
          const Icon = section.icon;

          return (
            <button
              key={section.route}
              type="button"
              onClick={() => {
                if (section.route === '__app_branding__') {
                  setShowBrandingPlanner(current => !current);
                  setShowSpotlightPlanner(false);
                  setShowBannerPlanner(false);
                  return;
                }

                if (section.route === '__team_spotlight__') {
                  setShowSpotlightPlanner(current => !current);
                  setShowBannerPlanner(false);
                  setShowBrandingPlanner(false);
                  return;
                }

                if (section.route === '__ad_banners__') {
                  setShowBannerPlanner(current => !current);
                  setShowSpotlightPlanner(false);
                  setShowBrandingPlanner(false);
                  return;
                }

                navigate(section.route);
              }}
              className="flex items-center gap-3 p-3.5 bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all text-left active:scale-[0.98] w-full"
            >
              <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${section.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold leading-tight">
                    {section.title}
                  </span>

                  {section.count != null && <StatBadge count={section.count} />}

                  {section.badge && (
                    <span className="ml-auto bg-orange-500/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {section.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">
                  {section.description}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

