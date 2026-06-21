export function detectStreamProvider(url) {
  const value = String(url || '').trim();
  if (!value) return { provider: '', providerLabel: '', embedUrl: '', valid: false };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { provider: '', providerLabel: '', embedUrl: '', valid: false };
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const videoId = host === 'youtu.be'
      ? parsed.pathname.split('/').filter(Boolean)[0]
      : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();

    return {
      provider: 'youtube',
      providerLabel: 'YouTube',
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : '',
      valid: Boolean(videoId),
    };
  }

  if (host.endsWith('twitch.tv')) {
    const channel = parsed.pathname.split('/').filter(Boolean)[0];

    return {
      provider: 'twitch',
      providerLabel: 'Twitch',
      embedUrl: channel ? `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parsed.hostname}` : '',
      valid: Boolean(channel),
    };
  }

  return {
    provider: 'custom',
    providerLabel: 'Custom',
    embedUrl: value,
    valid: /^https:\/\//i.test(value),
  };
}

export function getYardlineStreamProviderStatus(env = {}) {
  const provider = env.STREAM_PROVIDER || '';

  if (!provider) {
    return { configured: false, provider: '', message: 'Yardline Stream Provider nicht konfiguriert' };
  }

  if (provider === 'mux') {
    return {
      configured: Boolean(env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET),
      provider,
      message: env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET ? 'Mux konfiguriert' : 'Mux Env Vars fehlen',
    };
  }

  if (provider === 'cloudflare') {
    return {
      configured: Boolean(env.CLOUDFLARE_STREAM_TOKEN && env.CLOUDFLARE_ACCOUNT_ID),
      provider,
      message: env.CLOUDFLARE_STREAM_TOKEN && env.CLOUDFLARE_ACCOUNT_ID ? 'Cloudflare Stream konfiguriert' : 'Cloudflare Env Vars fehlen',
    };
  }

  return { configured: false, provider, message: 'Unbekannter Stream Provider' };
}
