import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X, Globe } from 'lucide-react';

function buildGrouped(leagues) {
  // Group leagues by country, then region within country
  const groups = {};
  leagues.forEach(l => {
    const country = l.country || 'Unbekannt';
    if (!groups[country]) groups[country] = {};
    const region = l.regionState || '__none__';
    if (!groups[country][region]) groups[country][region] = [];
    groups[country][region].push(l);
  });
  return groups;
}

export default function LeagueFilter({ leagues = [], filter = {}, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const grouped = useMemo(() => buildGrouped(leagues), [leagues]);
  const countries = Object.keys(grouped).sort();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLeague = filter.leagueId ? leagues.find(l => l.id === filter.leagueId) : null;
  const hasFilter = !!filter.leagueId;

  const select = (leagueId) => {
    onFilterChange({ continent: null, country: null, region: null, leagueId: leagueId || null });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-3 py-2 mt-1">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
          hasFilter
            ? 'bg-primary/10 border-primary/40 text-primary'
            : 'bg-secondary border-border/50 text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {selectedLeague?.logo && (
          <img src={selectedLeague.logo} alt="" className="w-4 h-4 object-contain rounded" />
        )}
        <span className="max-w-[160px] truncate">
          {selectedLeague ? (selectedLeague.shortName || selectedLeague.name) : 'Liga filtern'}
        </span>
        {hasFilter ? (
          <button
            onClick={(e) => { e.stopPropagation(); select(null); }}
            className="ml-0.5 hover:opacity-70"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-3 top-full mt-1.5 z-50 w-72 max-h-80 overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-2xl py-1"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* Alle Ligen */}
          <button
            onClick={() => select(null)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-secondary/60 transition-colors ${
              !hasFilter ? 'text-primary font-bold' : 'text-foreground font-semibold'
            }`}
          >
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">Alle Ligen</span>
          </button>

          <div className="my-1 border-t border-border/30" />

          {/* Grouped leagues */}
          {countries.map(country => {
            const regionMap = grouped[country];
            const regions = Object.keys(regionMap).sort((a, b) => {
              if (a === '__none__') return -1;
              if (b === '__none__') return 1;
              return a.localeCompare(b);
            });

            return (
              <div key={country}>
                {/* Country label */}
                <p className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {country}
                </p>

                {regions.map(region => {
                  const regionLeagues = regionMap[region].sort((a, b) => (a.level ?? 99) - (b.level ?? 99));

                  return (
                    <div key={region}>
                      {/* Region sub-label (only if named) */}
                      {region !== '__none__' && (
                        <p className="px-5 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                          {region}
                        </p>
                      )}

                      {regionLeagues.map(league => {
                        const isSelected = filter.leagueId === league.id;
                        return (
                          <button
                            key={league.id}
                            onClick={() => select(league.id)}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-secondary/60 text-foreground'
                            } ${region !== '__none__' ? 'pl-5' : ''}`}
                          >
                            {/* Logo */}
                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                              {league.logo ? (
                                <img
                                  src={league.logo}
                                  alt=""
                                  loading="lazy"
                                  className="w-5 h-5 object-contain rounded"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-4 h-4 rounded bg-secondary" />
                              )}
                            </div>
                            <span className="text-sm font-medium truncate">{league.name}</span>
                            {league.tierLabel && (
                              <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{league.tierLabel}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}