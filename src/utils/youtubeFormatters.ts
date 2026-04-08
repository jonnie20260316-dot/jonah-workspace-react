import { pick } from "./i18n";

/** Status pill color map */
export function statusColor(status: string): string {
  switch (status) {
    case "live": return "#ff0000";
    case "testing": return "#ff9800";
    case "ready": return "#4caf50";
    case "created": return "#2196f3";
    default: return "#888";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "live": return pick("直播中", "LIVE");
    case "testing": return pick("測試中", "TESTING");
    case "ready": return pick("就緒", "READY");
    case "created": return pick("已建立", "CREATED");
    case "complete": return pick("已結束", "ENDED");
    default: return status.toUpperCase();
  }
}

export function healthLabel(status: string): string {
  switch (status) {
    case "good": return pick("良好", "Good");
    case "ok": return pick("尚可", "OK");
    case "bad": return pick("不佳", "Bad");
    case "noData": return pick("無數據", "No Data");
    default: return status;
  }
}

export function healthColor(status: string): string {
  switch (status) {
    case "good": return "#4caf50";
    case "ok": return "#ff9800";
    case "bad": return "#f44336";
    default: return "#888";
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
