export const SCORE_PROVIDER_REGISTRY = [
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
  {
    providerKey: 'json_feed',
    name: 'Generic JSON Score Feed',
    sourceType: 'json_feed',
    enabledByDefault: false,
    status: 'disabled',
  },
];

export function getRegisteredProvider(providerKey) {
  return SCORE_PROVIDER_REGISTRY.find(provider => provider.providerKey === providerKey) || null;
}
