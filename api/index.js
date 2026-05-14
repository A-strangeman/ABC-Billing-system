// Vercel API proxy to Django backend
// Set DJANGO_API_URL to your deployed Django base URL (for example: https://your-django-app.com)

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function buildTargetUrl(req, baseUrl) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = requestUrl.pathname.replace(/^\/api/, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${baseUrl.replace(/\/$/, '')}/api${normalizedPath}${requestUrl.search}`;
}

async function readRawBody(req) {
  if (req.body == null) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return chunks.length ? Buffer.concat(chunks) : undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  return JSON.stringify(req.body);
}

function forwardHeaders(req) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!value) continue;
    const lowered = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowered)) continue;
    headers[key] = value;
  }
  return headers;
}

module.exports = async (req, res) => {
  const djangoBaseUrl = process.env.DJANGO_API_URL;

  if (!djangoBaseUrl) {
    return res.status(500).json({
      error: 'DJANGO_API_URL is not configured',
      message: 'Set DJANGO_API_URL to route API requests to Django.',
    });
  }

  try {
    const targetUrl = buildTargetUrl(req, djangoBaseUrl);
    const method = (req.method || 'GET').toUpperCase();
    const headers = forwardHeaders(req);

    const init = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await readRawBody(req);
    }

    const response = await fetch(targetUrl, init);
    const responseBody = await response.arrayBuffer();

    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
      res.setHeader(key, value);
    }

    return res.send(Buffer.from(responseBody));
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to reach Django backend',
      details: error?.message || 'Unknown proxy error',
    });
  }
};
