"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Check, Cloud, Radio, RadioTower, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import NetBadge from "@/components/NetBadge";
import { API, clearSos, publishSos, serverReachable, useOnline, type Route } from "@/lib/net";

// ponytail: rescue timeline after delivery is simulated; replace with backend status polling
const STAGES = ["Sending", "Delivered", "Assigned", "Rescued"] as const;
type Stage = (typeof STAGES)[number] | "Idle";
const NEXT: Partial<Record<Stage, [Stage, number]>> = {
  Sending: ["Delivered", 2600],
  Delivered: ["Assigned", 3000],
  Assigned: ["Rescued", 5000],
};
const HOPS: Record<Route, { icon: typeof Radio; label: string }[]> = {
  internet: [
    { icon: Smartphone, label: "Phone" },
    { icon: Wifi, label: "Wi-Fi / Data" },
    { icon: Cloud, label: "Server" },
    { icon: ShieldCheck, label: "Rescuers" },
  ],
  mesh: [
    { icon: Radio, label: "Bag" },
    { icon: Smartphone, label: "Phone" },
    { icon: RadioTower, label: "Relay" },
    { icon: ShieldCheck, label: "Gateway" },
  ],
};
const COUNTDOWN = 3; // seconds to cancel an accidental tap

export default function Sos() {
  const online = useOnline();
  const [stage, setStage] = useState<Stage>("Idle");
  const [route, setRoute] = useState<Route | null>(null); // decided at send time
  const [countdown, setCountdown] = useState<number | null>(null); // tap → 3,2,1 → send; tap again cancels
  const [hop, setHop] = useState(0);

  // advance the timeline (waits until the route is known)
  useEffect(() => {
    const n = NEXT[stage];
    if (!n || !route) return;
    const t = setTimeout(() => setStage(n[0]), n[1]);
    return () => clearTimeout(t);
  }, [stage, route]);

  useEffect(() => {
    if (stage === "Delivered" && route) publishSos(route); // rescuer dashboard picks this up live
  }, [stage, route]);

  useEffect(() => {
    if (stage !== "Sending" || !route) return;
    const t = setInterval(() => setHop((h) => Math.min(h + 1, 3)), 600);
    return () => clearInterval(t);
  }, [stage, route]);

  const send = async () => {
    navigator.vibrate?.(200);
    setHop(0);
    setRoute(null);
    setStage("Sending");
    const ok = await serverReachable();
    setRoute(ok ? "internet" : "mesh");
    if (ok)
      // ponytail: fire-and-forget until the backend has /api/sos; delivery UI doesn't wait on it
      fetch(`${API}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bag: "FS-2041", at: Date.now() }),
      }).catch(() => {});
  };

  const fire = useEffectEvent(() => send());
  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        fire();
      } else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const tap = () => {
    if (stage !== "Idle") return;
    if (countdown === null) {
      navigator.vibrate?.(60);
      setCountdown(COUNTDOWN);
    } else setCountdown(null); // cancel
  };

  const reset = () => {
    setStage("Idle");
    setRoute(null);
    setCountdown(null);
    setHop(0);
    clearSos();
  };

  const active = stage !== "Idle";
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  const shownHop = stage === "Sending" ? (route ? hop : -1) : active ? 3 : -1;
  const hops = HOPS[route ?? (online ? "internet" : "mesh")];
  const label = stage === "Sending" && !route ? "Checking network…" : active ? stage : countdown !== null ? `Sending in ${countdown}… tap to cancel` : "Tap to send";
  const arming = countdown !== null;
  const ring = active ? 1 : arming ? (COUNTDOWN - countdown + 1) / COUNTDOWN : 0;

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-white">Emergency SOS</h1>
        <NetBadge />
      </div>
      <p className="mt-1 rounded-2xl bg-white/85 px-3 py-2 text-sm font-extrabold text-red-600">
        Only press if it&apos;s very, very urgent. Tap SOS, and it sends after 3 seconds unless you tap again to cancel.
      </p>

      <div className="mt-6 grid place-items-center">
        <button
          onClick={tap}
          className="relative grid size-56 select-none place-items-center rounded-full transition-[background] duration-1000"
          style={{ background: `conic-gradient(#ef4444 ${ring * 360}deg, rgb(255 255 255 / .55) 0)` }}
          aria-label={arming ? "Cancel SOS" : "Send SOS"}
        >
          {(active || arming) && stage !== "Rescued" && <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />}
          <span
            className={`grid size-44 place-items-center rounded-full text-white shadow-2xl transition ${
              stage === "Rescued" ? "bg-emerald-500 shadow-emerald-500/40" : "bg-red-500 shadow-red-500/40"
            } ${arming ? "scale-95" : ""}`}
          >
            <span className="text-center">
              <span className="font-display block text-4xl">{stage === "Rescued" ? "Safe" : "SOS"}</span>
              <span className="block px-4 text-xs font-bold opacity-90">{label}</span>
            </span>
          </span>
        </button>
      </div>

      {/* delivery path */}
      <section className="glass mt-6 rounded-[28px] p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">{route === "internet" ? "Internet delivery" : route === "mesh" ? "Mesh relay" : "Delivery path"}</p>
          {route && (
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${route === "internet" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {route === "internet" ? "via Wi-Fi / data" : "via FloodMesh"}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {hops.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className={`grid size-11 place-items-center rounded-2xl transition ${i <= shownHop ? "bg-brand text-white shadow-lg shadow-brand/30" : "bg-white text-ink/50"}`}>
                  <Icon size={19} />
                </span>
                <span className="whitespace-nowrap text-[10px] font-bold text-ink">{label}</span>
              </div>
              {i < hops.length - 1 && <div className={`mx-1 mb-4 h-1 flex-1 rounded-full transition ${i < shownHop ? "bg-brand" : "bg-white"}`} />}
            </div>
          ))}
        </div>
      </section>

      {/* status timeline */}
      <section className="glass mt-3 rounded-[28px] p-4">
        <p className="font-display text-lg">Rescue status</p>
        <ol className="mt-2 space-y-2">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm font-bold">
              <span className={`grid size-6 place-items-center rounded-full ${i <= idx ? "bg-brand text-white" : "bg-white text-transparent"}`}>
                <Check size={14} />
              </span>
              <span className={i <= idx ? "text-navy" : "text-ink/50"}>{s}</span>
              {s === "Assigned" && i <= idx && <span className="ml-auto text-xs text-brand">Team Alpha · 12 min</span>}
            </li>
          ))}
        </ol>
        {active && (
          <button onClick={reset} className="pill mt-3 w-full py-2.5 text-sm font-extrabold text-brand-deep">
            Reset demo
          </button>
        )}
      </section>

      <p className="mt-3 px-2 text-center text-[11px] font-semibold text-ink">
        LastSignal: at 5% battery the beacon sends one final location before shutdown.
      </p>
    </div>
  );
}
