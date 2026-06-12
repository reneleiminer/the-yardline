import React, { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  arePushNotificationsDisabled,
  dismissPushPrompt,
  enablePushNotifications,
  getCurrentPushSubscription,
  isPushSupported,
  requestPushEventCheck,
  syncExistingPushSubscription,
  wasPushPromptDismissed,
} from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";

export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isPushSupported()) return;
      if (arePushNotificationsDisabled()) return;
      if (Notification.permission === "denied") return;

      if (Notification.permission === "granted") {
        try {
          await syncExistingPushSubscription();
          requestPushEventCheck("push_prompt_sync");
          return;
        } catch (error) {
          console.warn("PUSH SYNC ERROR:", error);
        }
      }

      if (wasPushPromptDismissed()) return;

      const existing = await getCurrentPushSubscription();
      if (cancelled || existing) return;

      window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 1800);
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    dismissPushPrompt();
    setVisible(false);
  };

  const enable = async () => {
    setSaving(true);

    try {
      await enablePushNotifications();
      requestPushEventCheck("push_enabled");
      dismissPushPrompt();
      setVisible(false);
      toast.success("Benachrichtigungen aktiviert");
    } catch (error) {
      toast.error(error.message || "Benachrichtigungen konnten nicht aktiviert werden");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed left-3 right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-2xl border border-primary/25 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={close}
        className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-secondary"
        aria-label="Schliessen"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-7">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black">
            Live aufs Handy
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Erhalte Pushs bei Live-Spielen, Game of the Week, Podcast-Folgen und Game Highlights.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={enable} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
          Aktivieren
        </Button>

        <Button type="button" variant="outline" onClick={close}>
          Spaeter
        </Button>
      </div>
    </div>
  );
}
