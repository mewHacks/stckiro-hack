"use client";

import { useSyncExternalStore } from "react";
import { fromLatLng, photoFor, REQUESTS, RESCUERS, type Request, type Rescuer, type Status } from "./data";
import { API } from "./net";

// Shapes returned by backend/models.py
type ApiVictim = { id: number; name: string; area: string; people: number; severity: number; last: number; status: Status; via: "internet" | "mesh"; lat: number | null; lng: number | null; bag?: string; reason?: string; battery?: number | null };
type ApiRescuer = { id: number; lat: number; lng: number };

export type Live = { victims: Request[]; rescuers: Rescuer[]; connected: boolean; error: string | null };
const DEMO: Live = { victims: REQUESTS, rescuers: RESCUERS, connected: false, error: null }; // offline fallback: built-in demo data
const TEAMS = ["Alpha", "Bravo", "Charlie", "Delta"];

const ago = (sec: number) => {
  const s = Math.max(Date.now() / 1000 - sec, 0);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
};
const toRequest = (v: ApiVictim): Request => {
  const has = v.lat != null && v.lng != null;
  const p = has ? fromLatLng(v.lat!, v.lng!) : { x: 200, y: 250 };
  return {
    id: `api-${v.id}`, apiId: v.id, name: v.name, people: v.people, severity: v.severity as 1 | 2 | 3, last: ago(v.last), status: v.status, via: v.via,
    area: v.area || (has ? `${v.lat!.toFixed(3)}°N, ${v.lng!.toFixed(3)}°E` : "No GPS fix"),
    reason: v.reason || undefined, lastSignal: /lastsignal/i.test(v.reason ?? ""), battery: v.battery ?? undefined,
    photo: photoFor(v.name), ts: v.last, noLoc: !has, x: p.x, y: p.y,
  };
};

let snap: Live = DEMO;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const set = (s: Live) => { snap = s; subs.forEach((f) => f()); };

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
export async function refresh() {
  try {
    const [v, r] = await Promise.all([get<ApiVictim[]>("/api/victims"), get<ApiRescuer[]>("/api/rescuers")]);
    set({ victims: v.map(toRequest), rescuers: r.map((t, i) => ({ id: TEAMS[i] ?? `Team ${t.id}`, ...fromLatLng(t.lat, t.lng) })), connected: true, error: null });
  } catch (e) {
    const error = e instanceof Error ? e.message : "offline";
    // keep the last live data through a blip; before the first success show the demo data
    set(snap.connected ? { ...snap, connected: false, error } : { ...DEMO, error });
  }
}
/** advance Pending → Assigned → Rescued on the server, then re-read */
export async function advanceVictim(apiId: number) {
  try { await fetch(`${API}/api/victims/${apiId}`, { method: "PATCH", signal: AbortSignal.timeout(4000) }); } catch {}
  await refresh();
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  if (subs.size === 1) { void refresh(); timer = setInterval(refresh, 3000); } // one shared poll for every component
  return () => { subs.delete(cb); if (!subs.size) clearInterval(timer); };
};
export const useLive = () => useSyncExternalStore(subscribe, () => snap, () => DEMO);
