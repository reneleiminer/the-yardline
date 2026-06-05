import React from 'react';
import { Link } from 'react-router-dom';
import useSetHeader from '@/hooks/useSetHeader';
import {
  Building2,
  ChevronRight,
  FileCheck2,
  FileText,
  Lock,
  Trophy,
} from 'lucide-react';

const LEGAL_LINKS = [
  {
    title: 'Impressum',
    description: 'Anbieterkennzeichnung und Kontakt',
    path: '/legal/impressum',
    icon: Building2,
  },
  {
    title: 'Datenschutz',
    description: 'Umgang mit Daten und Privatsphäre',
    path: '/legal/datenschutz',
    icon: Lock,
  },
  {
    title: 'Nutzungsbedingungen',
    description: 'Regeln für die Nutzung der App',
    path: '/legal/nutzungsbedingungen',
    icon: FileCheck2,
  },
  {
    title: 'Tippspiel-Regeln',
    description: 'Regeln für kostenlose Fan-Tipps',
    path: '/legal/community-guidelines',
    icon: Trophy,
  },
];

export default function Legal() {
  useSetHeader({ mode: 'back', title: 'Rechtliches' });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-blue-950/70 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              The Yardline
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              Rechtliches
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Hier findest du Impressum, Datenschutz, Nutzungsbedingungen und die wichtigsten Hinweise zu kostenlosen Fan-Tipps in der App.
        </p>
      </section>

      <div className="rounded-2xl overflow-hidden bg-card border border-border/50">
        {LEGAL_LINKS.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-4 border-b border-border/30 last:border-0 active:bg-secondary/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {item.title}
                </p>

                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.description}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}