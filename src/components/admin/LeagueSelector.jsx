import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONTINENTS = ['Europa', 'Asien', 'Nordamerika', 'Südamerika', 'Afrika', 'Ozeanien'];

export default function LeagueSelector({
  leagues = [],
  selectedContinent,
  selectedCountry,
  selectedRegion,
  selectedLeagueId,
  onContinentChange,
  onCountryChange,
  onRegionChange,
  onLeagueChange,
}) {
  // Extract unique continents, countries, regions from leagues
  const continents = useMemo(() => {
    const unique = new Set(leagues.map(l => l.continent).filter(Boolean));
    return Array.from(unique).sort();
  }, [leagues]);

  const countries = useMemo(() => {
    if (!selectedContinent) return [];
    const filtered = leagues.filter(l => l.continent === selectedContinent);
    const unique = new Set(filtered.map(l => l.country).filter(Boolean));
    return Array.from(unique).sort();
  }, [leagues, selectedContinent]);

  const regions = useMemo(() => {
    if (!selectedContinent || !selectedCountry) return [];
    const filtered = leagues.filter(
      l => l.continent === selectedContinent && l.country === selectedCountry
    );
    const unique = new Set(filtered.map(l => l.regionState).filter(Boolean));
    return Array.from(unique).sort();
  }, [leagues, selectedContinent, selectedCountry]);

  const availableLeagues = useMemo(() => {
    let filtered = leagues;
    if (selectedContinent) {
      filtered = filtered.filter(l => l.continent === selectedContinent);
    }
    if (selectedCountry) {
      filtered = filtered.filter(l => l.country === selectedCountry);
    }
    if (selectedRegion) {
      filtered = filtered.filter(l => l.regionState === selectedRegion);
    }
    // Sort by level (ascending, so highest tier first)
    return filtered.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  }, [leagues, selectedContinent, selectedCountry, selectedRegion]);

  const hasRegion = selectedCountry && regions.length > 0;

  const handleContinentChange = (v) => {
    onContinentChange(v);
    // Reset downstream
    onCountryChange('');
    onRegionChange('');
    onLeagueChange('');
  };

  const handleCountryChange = (v) => {
    onCountryChange(v);
    // Reset downstream
    onRegionChange('');
    onLeagueChange('');
  };

  const handleRegionChange = (v) => {
    onRegionChange(v);
    // Reset downstream
    onLeagueChange('');
  };

  return (
    <div className="space-y-3">
      {/* Kontinent */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Kontinent
        </label>
        <Select value={selectedContinent || ''} onValueChange={handleContinentChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Kontinent wählen" />
          </SelectTrigger>
          <SelectContent>
            {continents.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Land */}
      {selectedContinent && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Land
          </label>
          <Select value={selectedCountry || ''} onValueChange={handleCountryChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Land wählen" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bundesland / Region */}
      {hasRegion && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Bundesland / Region
          </label>
          <Select value={selectedRegion || ''} onValueChange={handleRegionChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Region wählen (optional)" />
            </SelectTrigger>
            <SelectContent>
              {regions.map(r => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Liga */}
      {selectedCountry && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Liga
          </label>
          <Select value={selectedLeagueId || ''} onValueChange={onLeagueChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Liga wählen" />
            </SelectTrigger>
            <SelectContent>
              {availableLeagues.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex flex-col">
                    <span>{l.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[l.regionState, l.country, l.season].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}