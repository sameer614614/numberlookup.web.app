const RAW_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || '/api';
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;

function buildUrl(path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `${BASE_URL}${normalizedPath}` || normalizedPath;

  let url;
  if (/^https?:\/\//i.test(fullPath)) {
    url = new URL(fullPath);
  } else {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    url = new URL(fullPath, origin);
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  return url;
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message = payload?.detail || payload?.message || response.statusText;
    const error = new Error(message || 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function lookupNumber(number) {
  const url = buildUrl('/lookup', { number });
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  return handleResponse(response);
}

export async function listPosts() {
  const url = buildUrl('/posts');
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  return handleResponse(response);
}

export async function getPost(slug) {
  const url = buildUrl(`/posts/${encodeURIComponent(slug)}`);
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  return handleResponse(response);
}

export async function checkHealth() {
  const url = buildUrl('/healthz');
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  return handleResponse(response);
}

export const apiBaseUrl = BASE_URL;
