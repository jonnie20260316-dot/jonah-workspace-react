export interface SyncMeta {
  lastPushedAt: string | null;
  pushCount: number;
  lastPulledAt: string | null;
  lastPulledRemotePushedAt: string | null;
}

export interface SyncCategory {
  id: string;
  zhLabel: string;
  enLabel: string;
  globalKeys: string[];
  globalKeyPrefixes: string[];
}

export interface SyncPayload {
  syncFormatVersion: number;
  pushedAt: string;
  deviceId: string;
  pushCount: number;
  blockCount: number;
  data: Record<string, string>;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "conflict" | "error" | "offline";

export type GitSyncStatus = "idle" | "syncing" | "synced" | "error" | "conflict" | "auth-error";

export interface ConflictInfo {
  remote: SyncPayload;
  detectedAt: string;
}

export interface SyncQueueItem {
  id: string;
  op: "push" | "pull";
  queuedAt: string;
  retryCount: number;
}
