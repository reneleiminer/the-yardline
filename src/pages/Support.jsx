import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  HelpCircle,
  Loader2,
  MessageSquare,
  Radio,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import useSetHeader from "@/hooks/useSetHeader";

const CATEGORIES = {
  score_error: "Falscher Score / Ergebnis",
  game_error: "Spiel fehlt oder ist falsch",
  standings_error: "Tabellenfehler",
  team_error: "Team- oder Ligadaten falsch",
  stream_error: "Stream-Link falsch oder fehlt",
  app_bug: "Technisches App-Problem",
  data_editor_application: "Dateneditor-Bewerbung",
  initiative: "Initiativbewerbung",
  other: "Sonstiges",
};

const CATEGORY_ICONS = {
  score_error: Trophy,
  game_error: Clock,
  standings_error: BarChart3,
  team_error: ShieldCheck,
  stream_error: Radio,
  app_bug: AlertCircle,
  data_editor_application: Database,
  initiative: MessageSquare,
  other: HelpCircle,
};

export default function Support() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: searchParams.get("category") || "score_error",
    subject: "",
    message: "",
  });

  useSetHeader({
    mode: "back",
    title: "Support",
    onBack: () => navigate(-1),
  });

  const selectedCategoryIcon = CATEGORY_ICONS[form.category] || HelpCircle;
  const CategoryIcon = selectedCategoryIcon;

  const set = (key, value) => {
    setForm(previous => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Bitte alle erforderlichen Felder ausfüllen.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await base44.entities.SupportTicket.create({
        userId: null,
        userName: form.name.trim(),
        userEmail: form.email.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: "open",
        ticketType: "support",
        createdAtUtc: new Date().toISOString(),
      });

      setSubmitted(true);
      setForm({
        name: "",
        email: "",
        category: searchParams.get("category") || "score_error",
        subject: "",
        message: "",
      });
    } catch (submitError) {
      console.error("CREATE SUPPORT TICKET ERROR:", submitError);
      setError("Fehler beim Senden. Bitte versuche es später erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 max-w-3xl mx-auto space-y-5">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-blue-950/70 via-slate-950 to-background p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
            Hilfe & Datenkorrekturen
          </p>

          <h1 className="text-2xl font-black mb-2">
            Support
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Melde falsche Scores, fehlende Spiele, Tabellenfehler, Teamdaten, Streams oder technische Probleme.
          </p>
        </section>

        {submitted && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />

              <div>
                <h2 className="text-sm font-bold text-green-300">
                  Meldung eingereicht
                </h2>

                <p className="text-xs text-muted-foreground mt-1">
                  Danke. Wir prüfen deine Meldung so schnell wie möglich.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Meldung erstellen
              </h2>
              <p className="text-xs text-muted-foreground">
                Alle Felder sind erforderlich.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name <span className="text-destructive">*</span>
                </label>

                <Input
                  placeholder="Dein Name"
                  value={form.name}
                  onChange={event => set("name", event.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  E-Mail <span className="text-destructive">*</span>
                </label>

                <Input
                  type="email"
                  placeholder="deine@email.de"
                  value={form.email}
                  onChange={event => set("email", event.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Kategorie <span className="text-destructive">*</span>
              </label>

              <Select
                value={form.category}
                onValueChange={value => set("category", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Betreff <span className="text-destructive">*</span>
              </label>

              <Input
                placeholder="z.B. Falsches Ergebnis bei Team A vs Team B"
                value={form.subject}
                onChange={event => set("subject", event.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Beschreibung <span className="text-destructive">*</span>
              </label>

              <Textarea
                placeholder="Beschreibe möglichst genau, was falsch ist. Wenn möglich mit Liga, Team, Spiel, Datum oder Link."
                value={form.message}
                onChange={event => set("message", event.target.value)}
                disabled={loading}
                required
                className="min-h-36 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                "Meldung senden"
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}