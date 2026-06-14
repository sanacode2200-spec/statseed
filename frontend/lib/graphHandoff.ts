import type { GraphHandoff } from "./types";

const KEY = "statseed_graph_handoff";

export function saveGraphHandoff(handoff: GraphHandoff): void {
  sessionStorage.setItem(KEY, JSON.stringify(handoff));
}

export function takeGraphHandoff(): GraphHandoff | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as GraphHandoff;
  } catch {
    return null;
  }
}
