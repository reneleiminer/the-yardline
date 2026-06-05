import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LegalPageTemplate from '@/components/layout/LegalPageTemplate';
import useSetHeader from '@/hooks/useSetHeader';
import { Loader2 } from 'lucide-react';

const TIPPSPIEL_FALLBACK_CONTENT = `
## Tippspiel-Regeln

Das Tippspiel von The Yardline ist ein kostenloses Fan-Feature zur Unterhaltung innerhalb der App.

### 1. Kostenloses Fan-Tippspiel

Die Teilnahme am Tippspiel ist kostenlos. Es wird kein Einsatz verlangt und es handelt sich nicht um eine Sportwette, ein Glücksspiel oder ein Angebot zur Gewinnerzielung.

### 2. Teilnahme

Nutzer können vor Beginn eines Spiels einen Tipp auf eines der beiden Teams abgeben. Pro Nutzer und Spiel ist nur ein Tipp möglich.

### 3. Tippabgabe

Ein Tipp kann nur abgegeben werden, solange das Spiel noch nicht live ist. Sobald das Spiel den Live-Status erreicht hat, ist die Tippabgabe gesperrt.

### 4. Keine Änderung nach Abgabe

Ein abgegebener Tipp kann nachträglich nicht geändert werden. Dadurch soll eine faire und transparente Auswertung gewährleistet werden.

### 5. Anzeige der Tippverteilung

Nach Beginn des Spiels können Prozentwerte oder Verteilungen angezeigt werden, die zeigen, wie Nutzer für die jeweiligen Teams getippt haben.

### 6. Keine Gewinne

Aktuell werden durch das Tippspiel keine Geldpreise, Sachpreise oder sonstigen Gewinne ausgeschüttet. Sollte The Yardline künftig Aktionen mit Gewinnen anbieten, gelten dafür separate Teilnahmebedingungen.

### 7. Manipulation und Missbrauch

Mehrfachaccounts, automatisierte Tippabgaben, technische Manipulationen oder sonstiger Missbrauch sind nicht erlaubt. The Yardline kann verdächtige Tipps ausschließen oder Nutzer von der Teilnahme ausschließen.

### 8. Technische Fehler

Bei technischen Störungen, fehlerhaften Spielinformationen, falschen Uhrzeiten oder sonstigen Problemen kann The Yardline Tipps korrigieren, löschen, ausblenden oder das Tippspiel für einzelne Spiele deaktivieren.

### 9. Keine Gewähr

The Yardline übernimmt keine Gewähr für die jederzeitige Verfügbarkeit des Tippspiels oder die vollständige Richtigkeit aller Spieldaten.

### 10. Datenschutz

Für die Durchführung des Tippspiels können nutzerbezogene Daten verarbeitet werden, insbesondere Nutzer-ID, Spiel-ID, abgegebener Tipp und Zeitpunkt der Tippabgabe. Weitere Informationen findest du in der Datenschutzerklärung.
`;

export default function CommunityGuidelines() {
  useSetHeader({ mode: 'back', title: 'Tippspiel-Regeln' });

  const { data: page, isLoading } = useQuery({
    queryKey: ['legalPage', 'tippspiel'],
    queryFn: async () => {
      const pages = await base44.entities.LegalPage.filter({ slug: 'tippspiel' });
      return pages[0];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LegalPageTemplate
      title={page?.title || 'Tippspiel-Regeln'}
      content={page?.content || TIPPSPIEL_FALLBACK_CONTENT}
    />
  );
}