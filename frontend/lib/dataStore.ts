import type { ColumnRole, UploadResponse } from "./types";

const KEY = "statseed_dataset";
const MODE_KEY = "statseed_dataset_storage_mode";

export type DatasetStorageMode = "session" | "persistent";

function normalizeDataset(parsed: UploadResponse): UploadResponse {
  return {
    ...parsed,
    columns: parsed.columns.map((column) => ({
      ...column,
      role: column.role ?? (column.dtype as ColumnRole),
      cat_values:
        column.cat_values.length > 0
          ? column.cat_values
          : column.values.map((value) => (value === null ? null : String(value))),
    })),
  };
}

export function saveDataset(data: UploadResponse, mode: DatasetStorageMode): void {
  try {
    const serialized = JSON.stringify(data);
    if (mode === "persistent") {
      localStorage.setItem(KEY, serialized);
      localStorage.setItem(MODE_KEY, "persistent");
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, serialized);
      localStorage.removeItem(KEY);
      localStorage.removeItem(MODE_KEY);
    }
  } catch {
    // Storage が使えない・容量超過の場合は React の状態のみで継続する。
  }
}

export function loadDataset(): { dataset: UploadResponse | null; mode: DatasetStorageMode } {
  try {
    const sessionRaw = sessionStorage.getItem(KEY);
    if (sessionRaw) {
      return { dataset: normalizeDataset(JSON.parse(sessionRaw) as UploadResponse), mode: "session" };
    }

    const persistentRaw = localStorage.getItem(KEY);
    if (!persistentRaw) return { dataset: null, mode: "session" };

    const dataset = normalizeDataset(JSON.parse(persistentRaw) as UploadResponse);
    if (localStorage.getItem(MODE_KEY) === "persistent") {
      return { dataset, mode: "persistent" };
    }

    // 旧版が自動保存したデータは、初回読み込み時にセッション保存へ移す。
    sessionStorage.setItem(KEY, JSON.stringify(dataset));
    localStorage.removeItem(KEY);
    return { dataset, mode: "session" };
  } catch {
    return { dataset: null, mode: "session" };
  }
}

export function clearDataset(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(MODE_KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    // noop
  }
}
