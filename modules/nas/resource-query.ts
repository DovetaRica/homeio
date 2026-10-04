export type NasResult = {
  data: unknown;
  at?: string;
  errors?: Record<string, string>;
  offset?: number;
  limit?: number | null;
  total?: number;
  hasMore?: boolean;
};

export class NasRequestError extends Error {
  constructor(message: string, public code = 'request_failed', public status = 0) {
    super(message);
    this.name = 'NasRequestError';
  }
}

export async function fetchNasResource(
  resource: string,
  options: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<NasResult> {
  const params = new URLSearchParams({resource});
  for (const [key, value] of Object.entries(options)) params.set(key, String(value));
  const response = await fetch(`/api/nas?${params}`, {signal, cache: 'no-store'});
  let body;
  try { body = await response.json(); }
  catch { throw new NasRequestError('Invalid server response', 'invalid_response', response.status); }
  if (!response.ok) {
    throw new NasRequestError(body.error ?? 'TrueNAS unavailable', body.code ?? (response.status === 401 ? 'unauthorized' : 'request_failed'), response.status);
  }
  return body;
}

export async function requestNas(body: unknown) {
  let response;
  try {
    response = await fetch('/api/nas', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  } catch {
    // A lost response cannot establish whether the server submitted a write.
    throw new NasRequestError('Connection interrupted', 'unknown_outcome');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new NasRequestError('Invalid server response', 'unknown_outcome', response.status); }
  if (!response.ok) throw new NasRequestError(data.error ?? 'TrueNAS request failed', data.code ?? 'request_failed', response.status);
  return data;
}

export function formatNasTime(value: string | number, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale, {timeZone: 'Asia/Shanghai', hour12: false});
}
