const HTML_ESCAPE_LOOKUP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char]);
}

export function formatText(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

export function safeUrl(value) {
  if (!value) return '';

  try {
    const parsed = new URL(String(value), window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

export function buildYoutubeEmbedUrl(value) {
  const safeValue = safeUrl(value);
  if (!safeValue) return '';

  try {
    const parsed = new URL(safeValue);
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      }
    }

    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\/+/, '');
      if (videoId) {
        return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      }
    }
  } catch {
    return '';
  }

  return safeValue;
}

export function toDisplayNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}
