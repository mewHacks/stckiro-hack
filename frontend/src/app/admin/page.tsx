"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Database, DatabaseZap, EyeOff, Lock, Radio, Siren, Users, Wifi } from "lucide-react";
import Face from "@/components/Face";
import Logo from "@/components/Logo";
import RadarMap from "@/components/RadarMap";
import { avatar, LIVE_POS, type Request, type Status } from "@/lib/data";
import { advanceVictim, useLive } from "@/lib/live";
import { useLiveSosRaw, type LiveSos } from "@/lib/net";

const NEXT: Record<Status, Status | null> = { Pending: "Assigned", Assigned: "Rescued", Rescued: null };
const CHIP: Record<Status, string> = {
  Pending: "bg-red-100 text-red-700",
  Assigned: "bg-amber-100 text-amber-700",
  Rescued: "bg-emerald-100 text-emerald-700",
};
const NEARBY_KM = 2.5;
const km = (a: { x: number; y: number }, b: { x: number; y: number; noLoc?: boolean; reason?: string }) => (b.noLoc ? Infinity : Math.hypot(a.x - b.x, a.y - b.y) / 100);
const far = (n: number) => (Number.isFinite(n) ? n : 1e9);

export default function Admin() {
  const { victims, rescuers, connected, error } = useLive();
  const [overrides, setOverrides] = useState<Record<string, Status>>({}); // only for rows that don't live on the server
  const [teamId, setTeamId] = useState("Alpha");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [hidden, setHidden] = useState<Set<string> | null>(null); // demo: alerts that were on screen when "Clear view" was pressed
  const liveRaw = useLiveSosRaw();

  // everything we know about = backend rows (or demo data when offline) + a mesh SOS relayed by the phone app in this browser
  const all = useMemo(() => {
    const mesh = liveRaw ? (JSON.parse(liveRaw) as LiveSos) : null;
    const local: Request[] = mesh
      ? [{ id: `LIVE-${mesh.at}`, name: "Aisyah Rahman", photo: avatar("FS-2041"), area: "Taman Sri Muda", people: 1, severity: mesh.priority === "high" ? 2 : 3, last: "just now", status: "Pending", via: mesh.via, reason: mesh.reason, lastSignal: mesh.lastSignal, ...LIVE_POS }]
      : [];
    return [...local, ...victims]; // everyone is listed; only people who pressed SOS (an SOS always carries a reason) get a location, a map pin and a priority
  }, [liveRaw, victims]);
  // locations stay hidden until a victim sends an SOS: after "Clear view" only NEW alerts show
  const reqs = useMemo(
    () => all.filter((r) => !hidden?.has(r.id)).map((r) => (r.apiId === undefined ? { ...r, status: overrides[r.id] ?? r.status } : r)),
    [all, hidden, overrides],
  );

  const advance = (r: Request) => {
    if (r.apiId !== undefined) return void advanceVictim(r.apiId);
    const n = NEXT[r.status];
    if (n) setOverrides((o) => ({ ...o, [r.id]: n }));
  };

  const team = rescuers.find((t) => t.id === teamId) ?? rescuers[0] ?? { id: "Alpha", x: 200, y: 250 };
  const withDist = reqs
    .map((r) => ({ ...r, km: km(team, r) }))
    .sort((a, b) => Number(a.status === "Rescued") - Number(b.status === "Rescued") || Number(!!b.reason) - Number(!!a.reason) || b.severity - a.severity || far(a.km) - far(b.km)); // SOS first, by priority, then nearest
  const nearby = withDist.filter((r) => r.km <= NEARBY_KM && r.status !== "Rescued");
  const list = nearbyOnly ? nearby : withDist;

  const sosRows = reqs.filter((r) => r.reason); // people who pressed SOS
  const count = (s: Status) => sosRows.filter((r) => r.status === s).length;
  const stats = [
    { label: "Pending SOS", value: count("Pending"), tint: "text-red-500" },
    { label: "Assigned", value: count("Assigned"), tint: "text-amber-500" },
    { label: "Rescued", value: count("Rescued"), tint: "text-emerald-500" },
    { label: "People affected", value: reqs.reduce((n, r) => n + r.people, 0), tint: "text-brand" },
  ];
  const critical = sosRows.filter((r) => r.severity === 3 && r.status !== "Rescued").length;
  const high = sosRows.filter((r) => r.severity === 2 && r.status !== "Rescued").length;
  const viaMesh = sosRows.filter((r) => r.via === "mesh").length;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Back to 3D bag" className="pill grid size-10 place-items-center">
            <ArrowLeft size={18} />
          </Link>
          <Logo size={44} />
          <div>
            <h1 className="text-2xl md:text-3xl">LiveBuoy Rescue</h1>
            <p className="text-sm font-semibold text-ink">Command dashboard · Klang Valley flood</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-navy"><Siren size={14} className="text-red-500" /> Priority = pressed SOS</span>
          <button onClick={() => setHidden(hidden === null ? new Set(all.map((r) => r.id)) : null)} className="pill flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-brand-deep active:scale-95">
            <EyeOff size={14} /> {hidden === null ? "Clear view" : "Show all alerts"}
          </button>
          <span title={error ?? ""} className={`glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${connected ? "text-emerald-700" : "text-amber-700"}`}>
            {connected ? <DatabaseZap size={14} /> : <Database size={14} />} {connected ? "Live · backend" : "Demo data · backend offline"}
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold">
            <Wifi size={14} className="text-emerald-600" /> {sosRows.length - viaMesh} via internet
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold">
            <Radio size={14} className="text-amber-600" /> {viaMesh} via mesh
          </span>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-3xl p-4">
            <p className="text-xs font-bold text-ink">{s.label}</p>
            <p className={`font-display text-3xl ${s.tint}`}>{s.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="glass relative h-[380px] overflow-hidden rounded-[32px] md:h-[600px]">
          <RadarMap requests={reqs} focus={{ x: team.x, y: team.y, r: NEARBY_KM * 100 }} />
          <p className="glass absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold">
            {sosRows.length ? "Red / orange = pressed SOS" : "No SOS yet"} · grey = no SOS · ring = {NEARBY_KM} km around Team {team.id}
          </p>
        </section>

        <section className="glass flex flex-col rounded-[32px] p-4 lg:h-[600px]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-display text-lg leading-tight">People</p>
              <p className="flex gap-1.5 text-[11px] font-extrabold">
                <span className="text-red-600">{critical} critical</span><span className="text-ink">·</span><span className="text-amber-600">{high} high</span><span className="text-ink">·</span><span className="text-slate-500">{reqs.length - sosRows.length} not alerted</span>
              </p>
            </div>
            <div className="flex gap-1">
              {rescuers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeamId(t.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${t.id === teamId ? "bg-brand text-white" : "bg-white text-navy"}`}
                >
                  Team {t.id}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex rounded-full bg-white p-1 text-xs font-extrabold">
            {[
              { v: false, t: `Everyone (${withDist.length})` },
              { v: true, t: `Within ${NEARBY_KM} km (${nearby.length})` },
            ].map((o) => (
              <button
                key={o.t}
                onClick={() => setNearbyOnly(o.v)}
                className={`flex-1 rounded-full py-1.5 ${nearbyOnly === o.v ? "bg-navy text-white" : "text-ink"}`}
              >
                {o.t}
              </button>
            ))}
          </div>

          <ul className="no-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {list.map((r) => {
              const near = r.km <= NEARBY_KM;
              return (
                <li key={r.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 ${near ? "" : "opacity-60"} ${r.id.startsWith("LIVE") ? "ring-2 ring-red-400" : ""}`}>
                  <span className={`h-10 w-1.5 rounded-full ${!r.reason ? "bg-slate-300" : r.severity === 3 ? "bg-red-500" : r.severity === 2 ? "bg-orange-400" : "bg-sky"}`} />
                  <Face src={r.photo} name={r.name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-extrabold">
                      <span className="truncate">{r.name}</span>
                      {r.reason && r.status !== "Rescued" && (
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide ${r.severity === 3 ? "bg-red-500 text-white" : "bg-amber-400 text-navy"}`}>
                          <Siren size={10} /> {r.severity === 3 ? "CRITICAL" : "HIGH"} PRIORITY
                        </span>
                      )}
                    </p>
                    {r.reason && (
                      <p className="flex flex-wrap items-center gap-1 text-[11px] font-extrabold text-red-600">
                        {r.reason}
                        {r.lastSignal && <span className="rounded-full bg-navy px-1.5 py-0.5 text-white">LastSignal</span>}
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-1 text-xs font-semibold text-ink">
                        <span className="font-extrabold text-brand">{Number.isFinite(r.km) ? `${r.km.toFixed(1)} km` : "no GPS"}</span> · {r.area} · <Users size={12} /> {r.people} · {r.last}
                      {r.via === "mesh" ? <Radio size={12} className="text-amber-600" aria-label="via mesh" /> : <Wifi size={12} className="text-emerald-600" aria-label="via internet" />}
                    </p>
                  </div>
                  {r.reason && NEXT[r.status] ? (
                    <button
                      onClick={() => advance(r)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold active:scale-95 ${r.status === "Pending" ? "bg-brand text-white" : "bg-navy text-white"}`}
                    >
                      {r.status === "Pending" ? "Assign" : "Rescued ✓"}
                    </button>
                  ) : (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${r.reason ? CHIP[r.status] : "bg-slate-100 text-slate-500"}`}>{r.reason ? r.status : "No SOS"}</span>
                  )}
                </li>
              );
            })}
            {list.length === 0 && <li className="py-8 text-center text-sm font-bold text-ink">{reqs.length === 0 ? <span className="flex flex-col items-center gap-2"><Lock size={26} className="text-brand" />Nobody here yet.</span> : `No victims within ${NEARBY_KM} km`}</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
