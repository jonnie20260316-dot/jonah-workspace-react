import type { YTTokens } from "../types";

const STORAGE_KEY = "yt-tokens";
const YT_API = "https://www.googleapis.com/youtube/v3";

// ─── Token storage ───────────────────────────────────────────────────────────

export function getStoredTokens(): YTTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as YTTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: YTTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Token refresh ───────────────────────────────────────────────────────────

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // Still valid (with 60s buffer already baked into expiry_date)
  if (Date.now() < tokens.expiry_date) {
    return tokens.access_token;
  }

  // Need refresh — route through Electron main process (has client_secret)
  const api = window.electronAPI;
  if (!api?.youtubeRefreshToken) return null;

  const result = await api.youtubeRefreshToken(tokens.refresh_token);
  if (!result) {
    clearTokens();
    return null;
  }

  const updated: YTTokens = {
    ...tokens,
    access_token: result.access_token,
    expiry_date: Date.now() + result.expires_in * 1000 - 60000,
  };
  saveTokens(updated);
  return updated.access_token;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function ytFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const res = await fetch(`${YT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    console.error(`YouTube API ${path} failed:`, res.status, await res.text());
    return null;
  }

  return res.json() as Promise<T>;
}

// ─── Broadcast types ─────────────────────────────────────────────────────────

export interface YTBroadcast {
  id: string;
  title: string;
  description: string;
  scheduledStartTime: string;
  thumbnail: string;
  lifeCycleStatus: string; // created | ready | testing | live | complete | revoked
  privacyStatus: string;
  boundStreamId: string | null;
  concurrentViewers: string | null;
}

export interface YTStreamHealth {
  status: string; // active | created | error | inactive | ready
  healthStatus: {
    status: string; // good | ok | bad | noData
    configurationIssues: { type: string; severity: string; reason: string; description: string }[];
  } | null;
  resolution: string | null;
  frameRate: string | null;
}

// ─── API calls ───────────────────────────────────────────────────────────────

interface YTListResponse<T> {
  items?: T[];
}

interface YTBroadcastItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    scheduledStartTime: string;
    thumbnails?: { default?: { url: string } };
  };
  status: {
    lifeCycleStatus: string;
    privacyStatus: string;
  };
  contentDetails?: {
    boundStreamId?: string;
  };
  statistics?: {
    concurrentViewers?: string;
  };
}

export async function listBroadcasts(): Promise<YTBroadcast[]> {
  // Fetch active + upcoming broadcasts
  const results: YTBroadcast[] = [];

  for (const broadcastStatus of ["active", "upcoming"]) {
    const data = await ytFetch<YTListResponse<YTBroadcastItem>>(
      `/liveBroadcasts?part=snippet,status,contentDetails,statistics&broadcastStatus=${broadcastStatus}&maxResults=10`
    );
    if (data?.items) {
      for (const item of data.items) {
        results.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          scheduledStartTime: item.snippet.scheduledStartTime,
          thumbnail: item.snippet.thumbnails?.default?.url ?? "",
          lifeCycleStatus: item.status.lifeCycleStatus,
          privacyStatus: item.status.privacyStatus,
          boundStreamId: item.contentDetails?.boundStreamId ?? null,
          concurrentViewers: item.statistics?.concurrentViewers ?? null,
        });
      }
    }
  }

  return results;
}

interface YTApiError {
  error?: {
    message?: string;
    errors?: { reason?: string }[];
  };
}

export async function transitionBroadcast(
  id: string,
  broadcastStatus: "testing" | "live" | "complete"
): Promise<{ ok: boolean; error?: string }> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, error: "Not authenticated" };

  const res = await fetch(
    `${YT_API}/liveBroadcasts/transition?broadcastStatus=${broadcastStatus}&id=${encodeURIComponent(id)}&part=status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.ok) return { ok: true };

  try {
    const body = (await res.json()) as YTApiError;
    const reason = body?.error?.errors?.[0]?.reason;
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    console.error("YouTube transition failed:", msg, reason);
    if (reason === "invalidTransition") {
      return {
        ok: false,
        error: "需先開始推流至 YouTube，串流就緒後才能切換狀態 / Start streaming first — wait for YouTube to confirm stream is ready",
      };
    }
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}

interface YTStreamItem {
  id: string;
  status: {
    streamStatus: string;
    healthStatus?: {
      status: string;
      configurationIssues?: { type: string; severity: string; reason: string; description: string }[];
    };
  };
  cdn?: {
    resolution?: string;
    frameRate?: string;
    ingestionInfo?: {
      ingestionAddress: string;
      streamName: string;
      backupIngestionAddress?: string;
    };
  };
}

export async function getStreamKey(streamId: string): Promise<{
  rtmpUrl: string;
  streamKey: string;
} | null> {
  const data = await ytFetch<YTListResponse<YTStreamItem>>(
    `/liveStreams?part=cdn&id=${encodeURIComponent(streamId)}`
  );
  const ingestion = data?.items?.[0]?.cdn?.ingestionInfo;
  if (!ingestion) return null;
  return {
    rtmpUrl: ingestion.ingestionAddress,
    streamKey: ingestion.streamName,
  };
}

export async function getStreamHealth(streamId: string): Promise<YTStreamHealth | null> {
  const data = await ytFetch<YTListResponse<YTStreamItem>>(
    `/liveStreams?part=status,cdn&id=${encodeURIComponent(streamId)}`
  );
  if (!data?.items?.[0]) return null;

  const item = data.items[0];
  return {
    status: item.status.streamStatus,
    healthStatus: item.status.healthStatus
      ? {
          status: item.status.healthStatus.status,
          configurationIssues: item.status.healthStatus.configurationIssues ?? [],
        }
      : null,
    resolution: item.cdn?.resolution ?? null,
    frameRate: item.cdn?.frameRate ?? null,
  };
}

// ─── Broadcast creation ───────────────────────────────────────────────────────

interface YTBroadcastInsertResponse {
  id: string;
}

export async function createBroadcast(
  title: string,
  privacyStatus: "public" | "private" | "unlisted"
): Promise<string | null> {
  const data = await ytFetch<YTBroadcastInsertResponse>(
    `/liveBroadcasts?part=snippet,status`,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title,
          scheduledStartTime: new Date().toISOString(),
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  return data?.id ?? null;
}

interface YTStreamInsertResponse {
  id: string;
  cdn?: {
    ingestionInfo?: {
      ingestionAddress: string;
      streamName: string;
    };
  };
}

export async function createLiveStream(
  title: string
): Promise<{ streamId: string; rtmpUrl: string; streamKey: string } | null> {
  const data = await ytFetch<YTStreamInsertResponse>(
    `/liveStreams?part=snippet,cdn`,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: { title },
        cdn: {
          ingestionType: "rtmp",
          resolution: "1080p",
          frameRate: "30fps",
        },
      }),
    }
  );
  const ingestion = data?.cdn?.ingestionInfo;
  if (!data?.id || !ingestion) return null;
  return {
    streamId: data.id,
    rtmpUrl: ingestion.ingestionAddress,
    streamKey: ingestion.streamName,
  };
}

interface YTBindResponse {
  id: string;
}

export async function bindBroadcast(
  broadcastId: string,
  streamId: string
): Promise<string | null> {
  const data = await ytFetch<YTBindResponse>(
    `/liveBroadcasts/bind?id=${encodeURIComponent(broadcastId)}&streamId=${encodeURIComponent(streamId)}&part=id`,
    { method: "POST" }
  );
  return data?.id ?? null;
}

// ─── Broadcast update / delete ────────────────────────────────────────────────

export async function updateBroadcastPrivacy(
  broadcast: YTBroadcast,
  privacyStatus: "public" | "private" | "unlisted"
): Promise<{ ok: boolean; error?: string }> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, error: "Not authenticated" };

  const res = await fetch(`${YT_API}/liveBroadcasts?part=snippet,status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: broadcast.id,
      snippet: {
        title: broadcast.title,
        description: broadcast.description,
        scheduledStartTime: broadcast.scheduledStartTime,
      },
      status: { privacyStatus },
    }),
  });

  if (res.ok) return { ok: true };

  try {
    const body = (await res.json()) as YTApiError;
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}

export async function deleteBroadcast(
  broadcastId: string
): Promise<{ ok: boolean; error?: string }> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, error: "Not authenticated" };

  const res = await fetch(
    `${YT_API}/liveBroadcasts?id=${encodeURIComponent(broadcastId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.ok) return { ok: true };

  try {
    const body = (await res.json()) as YTApiError;
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}
