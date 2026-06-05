import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  LifeBuoy,
  Mail,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import useSetHeader from "@/hooks/useSetHeader";
import { useAppUser } from "@/lib/useAppUser.jsx";
import { base44 } from "@/api/base44Client";
import VolunteerForm from "@/components/applications/VolunteerForm";

const DATA_EDITOR_CARD = {
  role: "data_editor",
  label: "Dateneditor",
  icon: Database,
  color: "#3b82f6",
  desc: "Spielpläne, Ergebnisse, Tabellen, Streams und Teamdaten pflegen",
  tag: "Bewerbung",
  applicationType: "volunteer",
};

const STATUS_CONFIG = {
  pending: {
    label: "Ausstehend",
    icon: Clock,
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  under_review: {
    label: "In Prüfung",
    icon: Clock,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  approved: {
    label: "Genehmigt",
    icon: CheckCircle2,
    color: "text-green-400 bg-green-400/10 border-green-400/20",
  },
  rejected: {
    label: "Abgelehnt",
    icon: XCircle,
    color: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  info_requested: {
    label: "Info erbeten",
    icon: Zap,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, onClick, status }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] hover:border-primary/30"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
        </div>

        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {description}
        </div>
      </div>

      {status ? <StatusBadge status={status} /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

export default function Applications() {
  useSetHeader({ mode: "back", title: "Mitmachen" });

  const { appUser } = useAppUser();
  const [activeForm, setActiveForm] = useState(null);

  const { data: myApplications = [] } = useQuery({
    queryKey: ["my-applications", appUser?.id],
    queryFn: () => base44.entities.RoleApplication.filter({ userId: appUser?.id }),
    enabled: !!appUser?.id,
  });

  const existingDataEditorApplication = myApplications.find(
    (application) => application.requestedRole === "data_editor"
  );

  if (activeForm) {
    return (
      <VolunteerForm
        card={DATA_EDITOR_CARD}
        appUser={appUser}
        onClose={() => setActiveForm(null)}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>

        <h1 className="text-xl font-black">
          Mitmachen bei The Yardline
        </h1>

        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Hilf mit, Spiele, Ergebnisse, Tabellen und Football-Daten aktuell zu halten.
        </p>
      </div>

      <div className="space-y-3">
        <ActionCard
          icon={Database}
          title="Als Dateneditor bewerben"
          description="Spiele, Ergebnisse, Tabellen, Streams, Ligen und Teams pflegen."
          status={existingDataEditorApplication?.status}
          onClick={() => {
            if (!existingDataEditorApplication || existingDataEditorApplication.status === "rejected") {
              setActiveForm("data_editor");
            }
          }}
        />

        <ActionCard
          icon={LifeBuoy}
          title="Fehler melden"
          description="Falsche Scores, fehlende Spiele oder technische Probleme melden."
          onClick={() => {
            window.location.href = "/support";
          }}
        />

        <ActionCard
          icon={Mail}
          title="Sonstige Mitarbeit"
          description="Du möchtest anders helfen? Schreib uns über den Support."
          onClick={() => {
            window.location.href = "/support";
          }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border/50 bg-card/60 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Normale Nutzer brauchen keinen Login. Interne Zugänge sind nur für Admins und Dateneditoren.
        </p>
      </div>
    </div>
  );
}