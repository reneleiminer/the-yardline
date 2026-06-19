/**
 * Canonical league sort order.
 * continent â†’ country â†’ regionState â†’ level (0 = highest) â†’ name
 *
 * Supports both old field names (stateRegion, tierLevel) for backwards compat.
 */
export function sortLeagues(leagues) {
  return [...leagues].sort((a, b) => {
    const contA = a.continent || 'ZZZ', contB = b.continent || 'ZZZ';
    if (contA !== contB) return contA.localeCompare(contB, 'de');
    const cA = a.country || 'ZZZ', cB = b.country || 'ZZZ';
    if (cA !== cB) return cA.localeCompare(cB, 'de');
    // level first (national leagues come before regional)
    const lvA = a.level ?? (a.tierLevel ?? 99);
    const lvB = b.level ?? (b.tierLevel ?? 99);
    if (lvA !== lvB) return lvA - lvB;
    // within same level: no region first, then alphabetical region
    const sA = a.regionState || a.stateRegion || '';
    const sB = b.regionState || b.stateRegion || '';
    if (!sA && sB) return -1;
    if (sA && !sB) return 1;
    if (sA !== sB) return sA.localeCompare(sB, 'de');
    return a.name.localeCompare(b.name, 'de');
  });
}

/**
 * Groups a sorted league list into nested structure:
 * { country â†’ { regionState â†’ league[] } }
 */
/**
 * Groups leagues by country only (flat list per country).
 * Returns: [{ country, leagues }]
 */
export function groupLeagues(sortedLeagues) {
  const grouped = [];
  const countryMap = new Map();

  for (const league of sortedLeagues) {
    const country = league.country || 'Unbekannt';
    if (!countryMap.has(country)) {
      const entry = { country, leagues: [] };
      countryMap.set(country, entry);
      grouped.push(entry);
    }
    countryMap.get(country).leagues.push(league);
  }

  return grouped;
}

/**
 * Groups leagues by country â†’ region (used when a region filter is active).
 * Returns: [{ country, regions: [{ region, leagues }] }]
 */
export function groupLeaguesByRegion(sortedLeagues) {
  const grouped = [];
  const countryMap = new Map();

  for (const league of sortedLeagues) {
    const country = league.country || 'Unbekannt';
    const region = league.regionState || league.stateRegion || '';

    if (!countryMap.has(country)) {
      const entry = { country, regions: [] };
      countryMap.set(country, { entry, regionMap: new Map() });
      grouped.push(entry);
    }

    const { entry, regionMap } = countryMap.get(country);

    if (!regionMap.has(region)) {
      const regionEntry = { region, leagues: [] };
      regionMap.set(region, regionEntry);
      entry.regions.push(regionEntry);
    }

    regionMap.get(region).leagues.push(league);
  }

  return grouped;
}

// â”€â”€ Location constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Frankreich',
  'Italien',
  'Niederlande',
  'Europa / International',
];

export const CONTINENTS = ['Europa', 'Nordamerika', 'Südamerika', 'Asien', 'Afrika', 'Ozeanien'];

export const DE_BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

/** Returns predefined region list for a country, or null if free-text. */
export function getRegionsForCountry(country) {
  if (country === 'Deutschland') return DE_BUNDESLAENDER;
  return null; // free-text for others
}