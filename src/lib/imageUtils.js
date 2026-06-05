const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect width="16" height="16" fill="transparent"/>
    </svg>
  `);

const imageCache = new Set();
const failedImageCache = new Set();

function isValidRemoteUrl(url) {
  return (
    typeof url === 'string' &&
    (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:image/')
    )
  );
}

export const validateImageUrl = (url, fallback = FALLBACK_IMAGE) => {
  if (!url || typeof url !== 'string') return fallback;

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  if (failedImageCache.has(trimmed)) return fallback;
  if (imageCache.has(trimmed)) return trimmed;

  if (isValidRemoteUrl(trimmed)) return trimmed;

  return fallback;
};

export const getImageUrl = (url, fallback = FALLBACK_IMAGE) => {
  return validateImageUrl(url, fallback);
};

export const preloadImage = (url) => {
  return new Promise((resolve) => {
    const src = validateImageUrl(url);

    if (!src || src === FALLBACK_IMAGE) {
      resolve(FALLBACK_IMAGE);
      return;
    }

    if (imageCache.has(src)) {
      resolve(src);
      return;
    }

    if (failedImageCache.has(src)) {
      resolve(FALLBACK_IMAGE);
      return;
    }

    const img = new Image();

    img.onload = () => {
      imageCache.add(src);
      resolve(src);
    };

    img.onerror = () => {
      failedImageCache.add(src);
      resolve(FALLBACK_IMAGE);
    };

    img.decoding = 'async';
    img.src = src;
  });
};

export const FALLBACK_IMAGE_URL = FALLBACK_IMAGE;