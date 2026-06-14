"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UploadResponse } from "@/lib/types";
import {
  clearDataset,
  loadDataset,
  saveDataset,
  type DatasetStorageMode,
} from "@/lib/dataStore";

interface DataContextValue {
  dataset: UploadResponse | null;
  storageMode: DatasetStorageMode;
  setDataset: (data: UploadResponse, mode?: DatasetStorageMode) => void;
  setStorageMode: (mode: DatasetStorageMode) => void;
  clearDataset: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<UploadResponse | null>(null);
  const [storageMode, setStorageModeState] = useState<DatasetStorageMode>("session");

  useEffect(() => {
    const stored = loadDataset();
    setDatasetState(stored.dataset);
    setStorageModeState(stored.mode);
  }, []);

  function setDataset(data: UploadResponse, mode = storageMode) {
    setDatasetState(data);
    setStorageModeState(mode);
    saveDataset(data, mode);
  }

  function setStorageMode(mode: DatasetStorageMode) {
    setStorageModeState(mode);
    if (dataset) saveDataset(dataset, mode);
  }

  function clear() {
    setDatasetState(null);
    setStorageModeState("session");
    clearDataset();
  }

  return (
    <DataContext.Provider value={{ dataset, storageMode, setDataset, setStorageMode, clearDataset: clear }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataset(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataset は DataProvider 内で使用してください。");
  return ctx;
}
