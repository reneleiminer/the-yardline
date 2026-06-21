export const SCORE_PROVIDER_REGISTRY = [
  {
    providerKey: 'football_aktuell_gfl',
    name: 'football-aktuell GFL',
    sourceType: 'football_aktuell',
    enabledByDefault: false,
    status: 'disabled_until_mapped',
  },
  {
    providerKey: 'football_aktuell_gfl2',
    name: 'football-aktuell GFL2',
    sourceType: 'football_aktuell',
    enabledByDefault: false,
    status: 'disabled_until_mapped',
  },
  {
    providerKey: 'json_feed',
    name: 'Generic JSON Score Feed',
    sourceType: 'json_feed',
    enabledByDefault: false,
    status: 'configurable',
  },
  {
    providerKey: 'gfl_not_configured',
    name: 'GFL / GFL2 Connector',
    sourceType: 'not_configured',
    enabledByDefault: false,
    status: 'not_configured',
  },
  {
    providerKey: 'elf_not_configured',
    name: 'ELF / AFLE Connector',
    sourceType: 'not_configured',
    enabledByDefault: false,
    status: 'not_configured',
  },
];

export const SCORE_PROVIDER_SOURCE_TYPES = [
  'not_configured',
  'json_feed',
  'football_aktuell',
  'scoreboard_text',
];

export function getProviderDefinition(providerKey) {
  return SCORE_PROVIDER_REGISTRY.find(provider => provider.providerKey === providerKey) || null;
}
