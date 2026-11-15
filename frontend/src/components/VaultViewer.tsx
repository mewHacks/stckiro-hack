"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BatteryCharging, ChevronDown, Droplets, Hand, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { ITEMS, type VaultItem } from "@/lib/data";
import { ICONS } from "@/lib/icons";

const BagScene = dynamic(() => import("./BagScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm font-bold text-brand/60">Unpacking your bag…</div>
  ),
});

type Id = VaultItem["id"];

// app=true: the phone-app version. The bag stays sealed (no opening) and the items are a plain list.
export default function VaultViewer({ compact = false, app = false }: { compact?: boolean; app?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Id | null>(null);
  const [battery, setBattery] = useState(82);
  const [swapping, setSwapping] = useState(false);
  const [flood, setFlood] = useState(false);
  const [dry, setDry] = useState(false); // result banner after the water test
  const item = ITEMS.find((i) => i.id === selected);

  // ponytail: simulated swap — cell slides out, then a fresh 100% cell slides in
  const swap = () => {
    if (swapping) return;
    setSwapping(true);
    setTimeout(() => {
      setBattery(100);
      setSwapping(false);
    }, 1100);
  };

  // Water test: the sea rises and the bag floats on a swimmer hugging it. Toggle on/off.
  const timers = useRef<number[]>([]);
  const waterTest = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (flood) {
      setFlood(false);
      setDry(false);
      return;
    }
    setSelected(null);
    const delay = open ? 700 : 50;
    setOpen(false); // seal the bag first so the test is fair
    timers.current.push(
      window.setTimeout(() => setFlood(true), delay),
      window.setTimeout(() => setDry(true), delay + 2600),
      window.setTimeout(() => setDry(false), delay + 9000),
    );
  };

  const pick = (id: Id) => {
    if (!app && id !== "beacon") setOpen(true); // the beacon is built into the front pocket, not stored inside
    setSelected((s) => (s === id ? null : id));
  };
  const toggle = () => {
    if (app) return; // sealed in the app
    setSelected(null);
    setOpen((o) => !o);
  };

  const scene = (
    <BagScene open={open} selected={app && selected !== "beacon" ? null : selected} onToggle={toggle} onSelect={setSelected} onSos={() => router.push("/sos")} battery={battery} swapping={swapping} flood={flood} />
  );

  const detail = (it: VaultItem, head: boolean) => (
    <div key={it.id} className="rounded-3xl bg-white p-4 shadow-sm">
            {head && <div className="flex items-center gap-3">
              <ItemIcon id={it.id} active />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight">{it.name}</p>
                <p className="text-xs font-semibold text-ink">{it.note}</p>
              </div>
            </div>}
            {it.id === "beacon" && (
              <div className="mt-3 rounded-2xl bg-sky/60 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-bold text-ink">Battery cell</p>
                  <p className={`font-display text-2xl ${low ? "text-red-500" : battery > 50 ? "text-emerald-600" : "text-amber-500"}`}>{Math.round(battery)}%</p>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white">
                  <div className={`h-full rounded-full transition-all ${low ? "bg-red-500" : battery > 50 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${battery}%` }} />
                </div>
                <label className="mt-3 block text-[11px] font-bold text-ink">
                  Simulate charge level
                  <input type="range" min={0} max={100} value={battery} disabled={swapping} onChange={(e) => setBattery(+e.target.value)} className="mt-1 w-full accent-brand" />
                </label>
                <button onClick={swap} disabled={swapping} className="btn-dark mt-2 flex h-11 w-full items-center justify-center gap-2 text-sm disabled:opacity-60">
                  <BatteryCharging size={16} /> {swapping ? "Swapping…" : "Swap battery"}
                </button>
                <p className="mt-2 text-[11px] font-semibold text-ink">
                  {low ? "Low: LastSignal will send one final location before shutdown." : "Hot-swappable cell. The chip keeps its mesh link while you change it."}
                </p>
              </div>
            )}
            <dl className="mt-3 divide-y divide-sky">
              {it.fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2 text-sm">
                  <dt className="font-semibold text-ink">{k}</dt>
                  <dd className="text-right font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck size={12} /> {it.id === "beacon" ? "Built in · sealed" : "Sealed & dry"}
            </span>
          </div>
  );

  const bubble = item
    ? `${item.name} — ${item.id === "beacon" ? `battery ${battery}%` : "sealed & dry ✓"}`
    : open
      ? "Tap any item to take it out!"
      : "I'm sealed and ready. Tap me to open!";
  const low = battery <= 20;

  if (compact)
    return (
      <div className="relative h-full touch-none">
        {scene}
        <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white/90 px-3 py-1.5 text-xs font-bold shadow-md">
          {bubble}
        </p>
      </div>
    );

  return (
    <div className={app ? "flex flex-col" : "flex h-full flex-col lg:flex-row lg:gap-4 lg:p-4"}>
      {/* 3D bag: 2/3 of the width on desktop */}
      <div className={`relative touch-none ${app ? "h-[320px]" : "min-h-[300px] flex-1 lg:w-2/3 lg:flex-none"}`}>
        {scene}
        {!app && (
          <button
            onClick={waterTest}
            className={`absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-extrabold shadow-lg transition active:scale-95 ${flood ? "bg-navy text-white" : "bg-white text-brand-deep"}`}
          >
            <Droplets size={16} className={flood ? "text-sky-300" : "text-sky-500"} /> {flood ? "End water test" : "Water test"}
          </button>
        )}
        {dry && (
          <div className="glass absolute inset-x-4 bottom-16 mx-auto flex max-w-sm animate-bounce items-center gap-3 rounded-3xl p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white">
              <ShieldCheck size={22} />
            </span>
            <p className="text-sm font-extrabold leading-tight">
              Ohhh, it&apos;s water resistant!
              <span className="block text-xs font-semibold text-ink">It floats and keeps them afloat. Not a drop got inside.</span>
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-brand-deep shadow-md">
            <Hand size={14} className={open ? "" : "animate-bounce"} />
            {app ? "Drag to spin · pinch to zoom" : open ? "Tap an item · drag to rotate · pinch to zoom" : "Tap the bag to open · drag to spin"}
          </span>
        </div>
      </div>

      {/* details + item tiles: 1/3 on desktop, under the bag on mobile */}
      <aside className={`glass mb-4 flex flex-col gap-3 rounded-[28px] p-4 ${app ? "mx-4" : "mx-4 lg:mx-0 lg:mb-0 lg:w-1/3 lg:overflow-y-auto"}`}>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">{app ? `In your backpack · ${ITEMS.length} items` : "In your vault"}</p>
          {!app && (
            <button onClick={toggle} className="pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-brand-deep active:scale-95">
              {open ? <Lock size={14} /> : <LockOpen size={14} />} {open ? "Seal bag" : "Open bag"}
            </button>
          )}
        </div>

        {app ? (
          <ul className="space-y-2">
            {ITEMS.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => pick(it.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition active:scale-[0.98] ${selected === it.id ? "bg-white shadow-md" : "bg-white/70"}`}
                >
                  <ItemIcon id={it.id} active={selected === it.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">{it.name}</span>
                    <span className="block truncate text-xs font-semibold text-ink">{it.note}</span>
                  </span>
                  <ChevronDown size={18} className={`text-ink transition ${selected === it.id ? "rotate-180" : ""}`} />
                </button>
                {selected === it.id && <div className="mt-2">{detail(it, false)}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
              {ITEMS.map((it) => (
                <button
                  key={it.id}
                  onClick={() => pick(it.id)}
                  className={`flex min-w-[74px] flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-bold transition active:scale-95 ${
                    selected === it.id ? "bg-brand text-white shadow-lg shadow-brand/30" : "bg-white text-navy"
                  }`}
                >
                  <ItemIcon id={it.id} active={selected === it.id} plain />
                  {it.name.split(" ")[0]}
                </button>
              ))}
            </div>
            {item ? (
              detail(item, true)
            ) : (
              <p className="rounded-3xl bg-white/60 p-4 text-center text-sm font-bold text-ink">
                {open ? "Tap a document to see its details" : "Open the bag, then tap a document, or tap FloodMesh for the built-in beacon"}
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function ItemIcon({ id, active, plain }: { id: Id; active?: boolean; plain?: boolean }) {
  const Icon = ICONS[id];
  if (plain) return <Icon size={20} />;
  return (
    <span className={`grid size-10 place-items-center rounded-2xl ${active ? "bg-brand text-white" : "bg-sky text-brand"}`}>
      <Icon size={20} />
    </span>
  );
}
