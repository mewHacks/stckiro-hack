"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { BatteryCharging, BatteryWarning, Check, Cloud, Contact, Flag, HeartPulse, MapPin, Power, Radio, RadioTower, ShieldCheck, Smartphone, User, Wifi } from "lucide-react";
import NetBadge from "@/components/NetBadge";
import { LIVE_POS, SOS_REASONS, toLatLng, type SosReason } from "@/lib/data";
import { clearSos, postSos, publishSos, serverReachable, useOnline, type Route } from "@/lib/net";

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
const LAST_SIGNAL_AT = 5; // % battery where the phone sends its final alert by itself
const LASTSIGNAL_REASON: SosReason = { id: "battery", label: "Battery dying (LastSignal)", priority: "critical" };

// ponytail: profile is mock data until the backend serves it (same values as the Profile tab)
const PROFILE = {
  name: "Aisyah Rahman",
  medical: "Blood type O+ · Asthma · Penicillin allergy",
  contacts: ["Mum +60 12-345 6789", "Brother +60 17-222 1100"],
  bag: "FS-2041",
};

export default function Sos() {
  const online = useOnline();
  const [reasonId, setReasonId] = useState<string>(SOS_REASONS[0].id); // pre-selected: one tap is enough in a panic
  const [stage, setStage] = useState<Stage>("Idle");
  const [route, setRoute] = useState<Route | null>(null); // decided at send time
  const [countdown, setCountdown] = useState<number | null>(null); // tap → 3,2,1 → send; tap again cancels
  const [hop, setHop] = useState(0);
  const [sentReason, setSentReason] = useState<SosReason | null>(null);
  // battery simulation (client side only)
  const [battery, setBattery] = useState(82);
  const [draining, setDraining] = useState(false);
  const [off, setOff] = useState(false);
  const [lastSignal, setLastSignal] = useState(false);

  const reason = SOS_REASONS.find((r) => r.id === reasonId)!;

  // advance the timeline (waits until the route is known)
  useEffect(() => {
    const n = NEXT[stage];
    if (!n || !route) return;
    const t = setTimeout(() => setStage(n[0]), n[1]);
    return () => clearTimeout(t);
  }, [stage, route]);

  useEffect(() => {
    if (stage === "Delivered" && route === "mesh" && sentReason)
      publishSos(route, { reason: sentReason.label, priority: sentReason.priority === "critical" ? "critical" : "high", lastSignal: sentReason.id === "battery" }); // rescuer dashboard picks this up live
  }, [stage, route, sentReason]);

  useEffect(() => {
    if (stage !== "Sending" || !route) return;
    const t = setInterval(() => setHop((h) => Math.min(h + 1, 3)), 600);
    return () => clearInterval(t);
  }, [stage, route]);

  // Everything is sent together, whatever the reason: identity, medical, live location, battery, bag, contacts.
  const buildPayload = (r: SosReason, batteryNow: number) => ({
    bag: PROFILE.bag,
    at: Date.now(),
    reason: r.label,
    priority: r.priority,
    battery: batteryNow,
    profile: { name: PROFILE.name, medical: PROFILE.medical, contacts: PROFILE.contacts },
    location: { ...toLatLng(LIVE_POS.x, LIVE_POS.y), accuracyM: 3 },
    beacon: { connected: true, firmware: "v0.4.2" },
  });

  const send = async (r: SosReason, batteryNow: number) => {
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(200); // browsers block vibration before the first tap
    setHop(0);
    setRoute(null);
    setSentReason(r);
    setStage("Sending");
    // internet only counts once the backend has STORED the alert (202); anything else falls back to the mesh relay
    const stored = (await serverReachable()) && (await postSos(buildPayload(r, batteryNow)));
    setRoute(stored ? "internet" : "mesh");
  };

  const fire = useEffectEvent(() => send(reason, battery));
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

  // Dying battery: drains 1% per 250 ms from 18%. At 5% the phone sends LastSignal by itself, at 0% it powers off.
  const lastSignalNow = useEffectEvent(() => {
    setLastSignal(true);
    setCountdown(null);
    send(LASTSIGNAL_REASON, LAST_SIGNAL_AT);
  });
  useEffect(() => {
    if (!draining) return;
    let b = 18;
    const t = setInterval(() => {
      b = Math.max(b - 1, 0);
      setBattery(b);
      if (b === LAST_SIGNAL_AT) lastSignalNow();
      if (b === 0) {
        setOff(true);
        setDraining(false);
      }
    }, 250);
    return () => clearInterval(t);
  }, [draining]);

  const startDrain = () => {
    if (draining || off) return;
    setBattery(18);
    setLastSignal(false);
    setDraining(true);
  };
  const powerOn = () => {
    setOff(false);
    setBattery(82);
    setLastSignal(false);
    reset();
  };

  const reset = () => {
    setStage("Idle");
    setRoute(null);
    setCountdown(null);
    setHop(0);
    setSentReason(null);
    clearSos();
  };

  const active = stage !== "Idle";
  const arming = countdown !== null;
  const ring = active ? 1 : arming ? (COUNTDOWN - countdown + 1) / COUNTDOWN : 0;
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  const shownHop = stage === "Sending" ? (route ? hop : -1) : active ? 3 : -1;
  const hops = HOPS[route ?? (online ? "internet" : "mesh")];
  const label = stage === "Sending" && !route ? "Checking network…" : active ? stage : arming ? `Sending in ${countdown}… tap to cancel` : "Tap to send";
  const shown = sentReason ?? reason;
  const loc = toLatLng(LIVE_POS.x, LIVE_POS.y);

  const payloadRows = [
    { icon: Flag, label: "Reason", value: `${shown.label} · ${shown.priority.toUpperCase()}`, hot: true },
    { icon: User, label: "Who", value: PROFILE.name },
    { icon: HeartPulse, label: "Medical", value: PROFILE.medical },
    { icon: MapPin, label: "Live location", value: `${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E · ±3 m` },
    { icon: BatteryWarning, label: "Battery", value: `${battery}%` },
    { icon: Radio, label: "Bag + beacon", value: `${PROFILE.bag} · connected` },
    { icon: Contact, label: "Contacts", value: `${PROFILE.contacts.length} emergency contacts` },
  ];

  return (
    <div className="relative px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-white">Emergency SOS</h1>
        <NetBadge />
      </div>
      <p className="mt-1 rounded-2xl bg-white/85 px-3 py-2 text-sm font-extrabold text-red-600">
        Only press if it&apos;s very, very urgent. Tap SOS, and it sends after 3 seconds unless you tap again to cancel.
      </p>

      {/* reason = priority alert */}
      <section className="glass mt-4 rounded-[28px] p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">What&apos;s happening?</p>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${reason.priority === "critical" ? "bg-red-500 text-white" : "bg-amber-400 text-navy"}`}>
            {reason.priority === "critical" ? "CRITICAL" : "HIGH"} priority
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOS_REASONS.map((r) => (
            <button
              key={r.id}
              disabled={active || arming}
              onClick={() => setReasonId(r.id)}
              className={`rounded-full px-3 py-2 text-xs font-extrabold transition active:scale-95 disabled:opacity-60 ${
                reasonId === r.id ? "bg-navy text-white shadow-md" : "bg-white text-navy"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-semibold text-ink">Priority alerts jump to the top of rescuers&apos; lists. All your details go with every alert.</p>
      </section>

      <div className="mt-5 grid place-items-center">
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

      {/* everything that goes out with the alert */}
      <section className="glass mt-5 rounded-[28px] p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">{active ? "Sent to rescuers" : "Sent with your alert"}</p>
          {active && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">All data ✓</span>}
        </div>
        <ul className="mt-2 space-y-1.5">
          {payloadRows.map(({ icon: Icon, label, value, hot }) => (
            <li key={label} className={`flex items-center gap-3 rounded-2xl p-2.5 ${hot ? "bg-red-50" : "bg-white"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${hot ? "bg-red-500 text-white" : "bg-sky text-brand"}`}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-ink">{label}</span>
                <span className="block truncate text-sm font-extrabold">{value}</span>
              </span>
              {active && <Check size={16} className="shrink-0 text-emerald-500" />}
            </li>
          ))}
        </ul>
      </section>

      {lastSignal && (
        <div className="mt-3 flex items-center gap-3 rounded-3xl bg-navy p-4 text-white">
          <BatteryWarning className="shrink-0 text-amber-300" />
          <p className="text-sm font-extrabold leading-tight">
            LastSignal: battery hit {LAST_SIGNAL_AT}%, so the phone sent one final alert with all your data before shutting down.
          </p>
        </div>
      )}

      {/* delivery path */}
      <section className="glass mt-3 rounded-[28px] p-4">
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

      {/* demo: simulate the phone dying (client side only) */}
      <section className="glass mt-3 mb-4 rounded-[28px] p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">Battery test (demo)</p>
          <span className={`font-display text-2xl ${battery <= LAST_SIGNAL_AT ? "text-red-500" : battery <= 20 ? "text-amber-500" : "text-emerald-600"}`}>{battery}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
          <div className={`h-full rounded-full transition-all ${battery <= LAST_SIGNAL_AT ? "bg-red-500" : battery <= 20 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${battery}%` }} />
        </div>
        <button onClick={startDrain} disabled={draining} className="btn-dark mt-3 flex h-12 w-full items-center justify-center gap-2 text-sm disabled:opacity-60">
          <BatteryCharging size={16} /> {draining ? "Battery draining…" : "Simulate dying battery"}
        </button>
        <p className="mt-2 text-[11px] font-semibold text-ink">
          Drops to 18%, then at {LAST_SIGNAL_AT}% the phone sends a final alert with all your data on its own, and powers off at 0%.
        </p>
      </section>

      {/* phone powered off */}
      {off && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/95 px-8 text-center text-white md:absolute">
          <div>
            <Power className="mx-auto text-white/40" size={44} />
            <p className="font-display mt-4 text-2xl">Phone powered off</p>
            <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-emerald-300">
              {route ? `✓ Last signal delivered ${route === "internet" ? "over Wi-Fi / data" : "through FloodMesh"}. Rescuers have your location.` : "Sending last signal…"}
            </p>
            <p className="mt-2 text-xs font-semibold text-white/60">The bag&apos;s own beacon keeps broadcasting even after the phone dies.</p>
            <button onClick={powerOn} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-navy active:scale-95">
              Power on (reset demo)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
