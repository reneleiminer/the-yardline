import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSetHeader from '@/hooks/useSetHeader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ImageUploadField from '@/components/common/ImageUploadField';
import {
  Activity,
  BarChart3,
  Building2,
  Camera,
  ChevronRight,
  Eye,
  FileText,
  Handshake,
  HeadphonesIcon,
  Image,
  ListOrdered,
  Loader2,
  Menu,
  MousePointer,
  Pencil,
  PlaySquare,
  Radio,
  Swords,
  Trash2,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import TodaysGamesReminder from '@/components/admin/TodaysGamesReminder';
import { getImageUrl } from '@/lib/imageUtils';


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

function getSessionIdFromEvent(item) {
  const meta = parseMessage(item.message);
  return meta.session_id || meta.sessionId || '';
}

function getEventPath(item) {
  const meta = parseMessage(item.message);
  return meta.full_path || meta.path || '/';
}

function getEventRouteGroup(item) {
  const meta = parseMessage(item.message);
  return meta.route_group || 'other';
}

function getEventDevice(item) {
  const meta = parseMessage(item.message);
  return meta.device_type || 'unknown';
}

function getEventReferrer(item) {
  const meta = parseMessage(item.message);
  return meta.referrer_host || 'direct';
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(Number(value || 0));
}

function formatDecimal(value) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getLastDays(days) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return getDateKey(date);
  });
}

function compactPathLabel(path) {
  if (path === '/') return 'Home';
  if (path.startsWith('/game/')) return 'Game Detail';
  if (path.startsWith('/team/')) return 'Team Detail';
  if (path.startsWith('/club/')) return 'Club Detail';
  if (path.startsWith('/league/')) return 'Liga Detail';
  if (path.startsWith('/wettbewerbe/')) return 'Wettbewerb Detail';

  return path
    .replace('/spiele', 'Spiele')
    .replace('/tabellen', 'Tabellen')
    .replace('/wettbewerbe', 'Wettbewerbe')
    .replace('/highlights', 'Highlights')
    .replace('/feed', 'Feed')
    .replace('/post/', 'Post ');
}

function pushCount(map, key) {
  const normalizedKey = key || 'unknown';
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function topEntries(map, limit = 5) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildAnalyticsStats(events = []) {
  const now = new Date();

  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const windows = {
    day: { visitors: new Set(), sessions: new Set(), views: 0 },
    week: { visitors: new Set(), sessions: new Set(), views: 0 },
    month: { visitors: new Set(), sessions: new Set(), views: 0 },
  };

  const seenEventKeys = new Set();
  const topPages = new Map();
  const routeGroups = new Map();
  const devices = new Map();
  const referrers = new Map();
  const dailyViews = new Map(getLastDays(14).map(day => [day, 0]));
  const dailyVisitors = new Map(getLastDays(14).map(day => [day, new Set()]));

  events.forEach(event => {
    const date = getEventDate(event);
    if (!date) return;

    const visitorId = getVisitorIdFromEvent(event);
    const sessionId = getSessionIdFromEvent(event) || `${visitorId}_${getDateKey(date)}`;
    const path = getEventPath(event);
    const eventKey = [
      visitorId || 'anonymous',
      sessionId || 'session',
      path,
      Math.floor(date.getTime() / (30 * 60 * 1000)),
    ].join('|');

    if (seenEventKeys.has(eventKey)) return;
    seenEventKeys.add(eventKey);

    const applyWindow = windowStats => {
      windowStats.views += 1;
      if (visitorId) windowStats.visitors.add(visitorId);
      if (sessionId) windowStats.sessions.add(sessionId);
    };

    if (date >= since24h) applyWindow(windows.day);

    if (date >= since7d) {
      applyWindow(windows.week);
      pushCount(topPages, compactPathLabel(path));
      pushCount(routeGroups, getEventRouteGroup(event));
      pushCount(devices, getEventDevice(event));
      pushCount(referrers, getEventReferrer(event));
    }

    if (date >= since30d) applyWindow(windows.month);

    const dayKey = getDateKey(date);
    if (dailyViews.has(dayKey)) {
      dailyViews.set(dayKey, dailyViews.get(dayKey) + 1);
      if (visitorId) dailyVisitors.get(dayKey).add(visitorId);
    }
  });

  const weekSessions = windows.week.sessions.size;
  const weekVisitors = windows.week.visitors.size;
  const weekViews = windows.week.views;

  return {
    active24h: windows.day.visitors.size,
    active7d: weekVisitors,
    active30d: windows.month.visitors.size,
    sessions24h: windows.day.sessions.size,
    sessions7d: weekSessions,
    sessions30d: windows.month.sessions.size,
    views24h: windows.day.views,
    views7d: weekViews,
    views30d: windows.month.views,
    pagesPerSession7d: weekSessions > 0 ? weekViews / weekSessions : 0,
    viewsPerVisitor7d: weekVisitors > 0 ? weekViews / weekVisitors : 0,
    topPages: topEntries(topPages, 6),
    routeGroups: topEntries(routeGroups, 5),
    devices: topEntries(devices, 4),
    referrers: topEntries(referrers, 4),
    daily: Array.from(dailyViews.entries()).map(([date, views]) => ({
      date,
      views,
      visitors: dailyVisitors.get(date)?.size || 0,
    })),
  };
}

function AnalyticsMetricCard({ icon: Icon, label, value, hint, tone = 'text-primary' }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/45 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>

          <p className={`text-xl font-black leading-none mt-1 ${tone}`}>
            {value}
          </p>
        </div>

        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>

      {hint && (
        <p className="hidden sm:block text-[10px] text-muted-foreground mt-2 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

function AnalyticsList({ title, items, formatter = value => formatNumber(value) }) {
  const max = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="rounded-xl border border-border/50 bg-background/35 p-2.5">
      <h3 className="text-[11px] font-black mb-2">
        {title}
      </h3>

      <div className="space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine Daten</p>
        ) : items.map(item => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
              <span className="font-semibold truncate">{item.label}</span>
              <span className="text-muted-foreground flex-shrink-0">{formatter(item.value)}</span>
            </div>

            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsDashboard({ stats }) {
  const maxDaily = Math.max(...stats.daily.map(day => day.views), 1);

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-3 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            App Analytics
          </p>

          <h2 className="text-sm font-black mt-0.5">
            Reichweite & Werbewert
          </h2>

          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Doppelte Refreshes werden herausgerechnet. Besucher sind eindeutige Geraete, Sessions laufen nach 30 Minuten Inaktivitaet aus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <AnalyticsMetricCard icon={Users} label="Besucher" value={formatNumber(stats.active7d)} hint="7 Tage" />
        <AnalyticsMetricCard icon={Activity} label="Sessions" value={formatNumber(stats.sessions7d)} hint="7 Tage" />
        <AnalyticsMetricCard icon={Eye} label="Views" value={formatNumber(stats.views7d)} hint="7 Tage" />
        <AnalyticsMetricCard icon={TrendingUp} label="Seiten/S." value={formatDecimal(stats.pagesPerSession7d)} hint="Engagement" />
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: '24h Besucher', value: stats.active24h },
          { label: '30 Tage Besucher', value: stats.active30d },
          { label: '30 Tage Views', value: stats.views30d },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-border/40 bg-background/35 p-2 text-center">
            <p className="text-base font-black text-primary">{formatNumber(item.value)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-background/35 p-2.5 mb-2.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-xs font-black">Letzte 14 Tage</h3>
          <span className="text-[10px] text-muted-foreground">Views / Besucher</span>
        </div>

        <div className="flex items-end gap-1 h-16">
          {stats.daily.map(day => (
            <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-primary/80 min-h-[4px]"
                style={{ height: `${Math.max(4, (day.views / maxDaily) * 48)}px` }}
                title={`${day.date}: ${day.views} Views, ${day.visitors} Besucher`}
              />
              <span className="text-[8px] text-muted-foreground">
                {day.date.slice(8, 10)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnalyticsList title="Top Seiten 7 Tage" items={stats.topPages} />
        <AnalyticsList title="Bereiche 7 Tage" items={stats.routeGroups} />
        <AnalyticsList title="Geraete" items={stats.devices} />
        <AnalyticsList title="Traffic Quellen" items={stats.referrers} />
      </div>

      <div className="mt-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
        <div className="flex items-start gap-2">
          <MousePointer className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fuer Sponsoren spaeter wichtig: Unique Visitors, Sessions, Pageviews, Top-Seiten und Geraete. Die Zahlen sind besser fuer Werbepreise als rohe Klicks, weil Reloads und schnelle Doppelaufrufe reduziert werden.
          </p>
        </div>
      </div>
    </section>
  );
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

        <div className="rounded-2xl border border-border/50 bg-white px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Vorschau
          </p>

          <div className="relative h-16 rounded-xl bg-[#c20f1a] border border-red-900/20 overflow-hidden">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-24 items-center justify-start">
              {formData.header_icon_url ? (
                <img
                  src={getImageUrl(formData.header_icon_url)}
                  alt="The Yardline"
                  className="h-12 max-w-[96px] w-auto object-contain"
                />
              ) : (
                <span className="text-base font-black tracking-wide uppercase text-white">
                  Yardline
                </span>
              )}
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-28">
              <span
                className="whitespace-nowrap text-lg leading-none text-white"
                style={{
                  fontFamily: "var(--font-script)",
                  textShadow: "0 2px 0 rgba(0,0,0,0.22)",
                }}
              >
                Where Football Lives
              </span>
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center">
              <Menu className="w-6 h-6 text-black" strokeWidth={2.5} />
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
      const all = await base44.entities.AppUpdate.list('-created_date', 10000);
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

  const resetBannerForm = () => {
    setBannerForm(EMPTY_BANNER_FORM);
    setEditingBannerId(null);
  };

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

  const managedUsers = users.filter(user => user.status !== 'deleted');

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
      title: 'Nutzer & Logins',
      description: 'Logins fÃ¼r Dateneditoren erstellen und verwalten',
      route: '/admin/users',
      count: managedUsers.length,
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

      <AnalyticsDashboard stats={analyticsStats} />

      <div className="hidden rounded-2xl border border-primary/20 bg-card p-4 mb-6">
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
                  setShowBannerPlanner(false);
                  return;
                }

                if (section.route === '__ad_banners__') {
                  setShowBannerPlanner(current => !current);
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
