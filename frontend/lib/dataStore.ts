import type { UploadResponse } from "./types";

const KEY = "statseed_dataset";

export function saveDataset(data: UploadResponse): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage が使えない・容量超過の場合は無視（セッション内の状態のみで継続）
  }
}

export function loadDataset(): UploadResponse | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UploadResponse) : null;
  } catch {
    return null;
  }
}

export function clearDataset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // noop
  }
}
