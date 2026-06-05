import React from 'react';
import { MapPin, Calendar, Clock, Users, Cloud, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function MatchInfo({ game, league }) {
  const dateStr = game.date
    ? format(new Date(game.date), 'EEEE, dd. MMMM yyyy', { locale: de })
    : 'Termin offen';

  const kickoffStr = game.kickoffTime || game.time
    ? `${game.kickoffTime || game.time} Uhr`
    : 'Uhrzeit offen';

  const hasInfo =
    dateStr ||
    kickoffStr ||
    league?.name ||
    game.groupId ||
    game.week ||
    game.roundName ||
    game.venue ||
    game.city ||
    game.stadiumAddress ||
    game.weather ||
    game.attendance ||
    game.refereeCrew;

  if (!hasInfo) return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">
        Spielinfos
      </p>

      <div className="bg-card border border-border/50 rounded-2xl px-4">
        <InfoRow icon={Calendar} label="Datum" value={dateStr} />
        <InfoRow icon={Clock} label="Anpfiff" value={kickoffStr} />
        <InfoRow icon={Trophy} label="Liga" value={league?.name || league?.shortName} />
        <InfoRow icon={Trophy} label="Runde" value={game.roundName} />
        <InfoRow icon={Trophy} label="Gruppe" value={game.groupId} />
        {game.week && <InfoRow icon={Trophy} label="Spieltag" value={`Spieltag ${game.week}`} />}
        <InfoRow icon={MapPin} label="Stadion" value={game.venue} />
        <InfoRow icon={MapPin} label="Ort" value={game.city} />
        <InfoRow icon={MapPin} label="Adresse" value={game.stadiumAddress} />
        <InfoRow icon={Cloud} label="Wetter" value={game.weather} />
        {game.attendance && <InfoRow icon={Users} label="Zuschauer" value={Number(game.attendance).toLocaleString('de-DE')} />}
        <InfoRow icon={Users} label="Schiedsrichter" value={game.refereeCrew} />
      </div>
    </div>
  );
}