"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UploadResponse } from "@/lib/types";
import { clearDataset, loadDataset, saveDataset } from "@/lib/dataStore";

interface DataContextValue {
  dataset: UploadResponse | null;
  setDataset: (data: UploadResponse) => void;
  clearDataset: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<UploadResponse | null>(null);

  useEffect(() => {
    setDatasetState(loadDataset());
  }, []);

  function setDataset(data: UploadResponse) {
    setDatasetState(data);
    saveDataset(data);
  }

  function clear() {
    setDatasetState(null);
    clearDataset();
  }

  return (
    <DataContext.Provider value={{ dataset, setDataset, clearDataset: clear }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataset(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataset は DataProvider 内で使用してください。");
  return ctx;
}
