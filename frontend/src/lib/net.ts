"use client";

import { useSyncExternalStore } from "react";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ---------- connectivity ----------
const subNet = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => {
    removeEventListener("online", cb);
    removeEventListener("offline", cb);
  };
};
/** Fast signal for the UI badge. `true` only means a network exists, not that the internet works. */
export const useOnline = () => useSyncExternalStore(subNet, () => navigator.onLine, () => true);

/** Real check before sending: flood shelters often have Wi-Fi with no working internet. */
export async function serverReachable() {
  if (!navigator.onLine) return false;
  try {
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

// ---------- live SOS shared with the rescuer dashboard ----------
// ponytail: localStorage stands in for the backend so phone tab → admin tab works live in the demo
export type Route = "internet" | "mesh";
export type LiveSos = { at: number; via: Route };
const KEY = "livebuoy:sos";
const EVT = "livebuoy-sos";

export function publishSos(via: Route) {
  localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), via } satisfies LiveSos));
  dispatchEvent(new Event(EVT));
}
export function clearSos() {
  localStorage.removeItem(KEY);
  dispatchEvent(new Event(EVT));
}
const subSos = (cb: () => void) => {
  addEventListener("storage", cb); // other tabs
  addEventListener(EVT, cb); // this tab
  return () => {
    removeEventListener("storage", cb);
    removeEventListener(EVT, cb);
  };
};
/** Returns the raw JSON string (stable between renders); parse it where used. */
export const useLiveSosRaw = () => useSyncExternalStore(subSos, () => localStorage.getItem(KEY), () => null);
