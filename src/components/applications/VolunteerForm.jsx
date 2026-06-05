import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function VolunteerForm({ card, appUser, onClose }) {
  const Icon = card.icon;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: appUser?.displayName || "",
    email: appUser?.email || "",
    experience: "",
    knownLeagues: "",
    reason: "",
    availability: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
  };

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.experience.trim() &&
    form.knownLeagues.trim() &&
    form.reason.trim() &&
    form.availability.trim();

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;

    try {
      setSaving(true);
      setError("");

      await base44.entities.RoleApplication.create({
        userId: appUser?.id || null,
        username: appUser?.username || form.name.trim(),
        applicationType: "volunteer",
        requestedRole: "data_editor",
        name: form.name.trim(),
        email: form.email.trim(),
        reason: form.reason.trim(),
        experience: form.experience.trim(),
        knownLeagues: form.knownLeagues.trim(),
        availability: form.availability.trim(),
        notes: form.notes.trim(),
        status: "pending",
      });

      qc.invalidateQueries({ queryKey: ["my-applications"] });
      setDone(true);
    } catch (submitError) {
      setError(
        submitError?.message ||
          "Die Bewerbung konnte nicht gesendet werden. Bitte versuche es später erneut oder melde dich über Support."
      );
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="px-4 pt-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>

        <div>
          <h2 className="text-xl font-black">Bewerbung gesendet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Danke. Wir prüfen deine Angaben und melden uns über die angegebene E-Mail-Adresse.
          </p>
        </div>

        <Button onClick={onClose} className="rounded-full mt-4">
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${card.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: card.color }} />
        </div>

        <div>
          <h2 className="font-black text-lg">Dateneditor</h2>
          <p className="text-xs text-muted-foreground">
            Bewerbung für Datenpflege
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 mb-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Dateneditoren pflegen Spielpläne, Ergebnisse, Tabellen, Streams, Teams und Ligen.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Vollständiger Name" required>
          <Input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="Max Mustermann"
          />
        </Field>

        <Field label="E-Mail" required>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="deine@email.de"
          />
        </Field>

        <Field label="Erfahrung mit American Football" required>
          <Textarea
            value={form.experience}
            onChange={(event) => set("experience", event.target.value)}
            className="bg-secondary border-border/50 resize-none"
            rows={3}
            placeholder="Fan, Spieler, Coach, Verein, Liga, Statistik, Liveticker..."
          />
        </Field>

        <Field label="Welche Ligen oder Regionen kennst du gut?" required>
          <Textarea
            value={form.knownLeagues}
            onChange={(event) => set("knownLeagues", event.target.value)}
            className="bg-secondary border-border/50 resize-none"
            rows={3}
            placeholder="GFL, ELF, Regionalliga, Jugend, lokale Teams..."
          />
        </Field>

        <Field label="Warum möchtest du helfen?" required>
          <Textarea
            value={form.reason}
            onChange={(event) => set("reason", event.target.value)}
            className="bg-secondary border-border/50 resize-none"
            rows={3}
            placeholder="Erzähl kurz, warum du Dateneditor werden möchtest."
          />
        </Field>

        <Field label="Verfügbarkeit pro Woche" required>
          <Input
            value={form.availability}
            onChange={(event) => set("availability", event.target.value)}
            className="bg-secondary border-border/50"
            placeholder="z.B. 1-2 Stunden, am Wochenende, nach Spieltagen..."
          />
        </Field>

        <Field label="Sonstige Hinweise optional">
          <Textarea
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            className="bg-secondary border-border/50 resize-none"
            rows={3}
            placeholder="Links, Referenzen oder besondere Kenntnisse."
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
          className="w-full rounded-full mt-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bewerbung absenden"}
        </Button>

        <Button variant="ghost" onClick={onClose} className="w-full rounded-full">
          Abbrechen
        </Button>
      </div>
    </div>
  );
}