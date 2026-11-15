"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BatteryCharging, Hand, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { ITEMS, type VaultItem } from "@/lib/data";
import { ICONS } from "@/lib/icons";

const BagScene = dynamic(() => import("./BagScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm font-bold text-brand/60">Unpacking your bag…</div>
  ),
});

type Id = VaultItem["id"];

export default function VaultViewer({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Id | null>(null);
  const [battery, setBattery] = useState(82);
  const [swapping, setSwapping] = useState(false);
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

  const pick = (id: Id) => {
    if (id !== "beacon") setOpen(true); // the beacon is built into the front pocket, not stored inside
    setSelected((s) => (s === id ? null : id));
  };
  const toggle = () => {
    setSelected(null);
    setOpen((o) => !o);
  };

  const scene = (
    <BagScene open={open} selected={selected} onToggle={toggle} onSelect={setSelected} onSos={() => router.push("/sos")} battery={battery} swapping={swapping} />
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
    <div className="flex h-full flex-col lg:flex-row lg:gap-4 lg:p-4">
      {/* 3D bag: 2/3 of the width on desktop */}
      <div className="relative min-h-[300px] flex-1 touch-none lg:w-2/3 lg:flex-none">
        {scene}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-brand-deep shadow-md">
            <Hand size={14} className={open ? "" : "animate-bounce"} />
            {open ? "Tap an item · drag to rotate · pinch to zoom" : "Tap the bag to open · drag to spin"}
          </span>
        </div>
      </div>

      {/* details + item tiles: 1/3 on desktop, under the bag on mobile */}
      <aside className="glass mx-4 mb-4 flex flex-col gap-3 rounded-[28px] p-4 lg:mx-0 lg:mb-0 lg:w-1/3 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">In your vault</p>
          <button onClick={toggle} className="pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-brand-deep active:scale-95">
            {open ? <Lock size={14} /> : <LockOpen size={14} />} {open ? "Seal bag" : "Open bag"}
          </button>
        </div>

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
          <div key={item.id} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <ItemIcon id={item.id} active />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight">{item.name}</p>
                <p className="text-xs font-semibold text-ink">{item.note}</p>
              </div>
            </div>
            {item.id === "beacon" && (
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
              {item.fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2 text-sm">
                  <dt className="font-semibold text-ink">{k}</dt>
                  <dd className="text-right font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck size={12} /> {item.id === "beacon" ? "Built in · sealed" : "Sealed & dry"}
            </span>
          </div>
        ) : (
          <p className="rounded-3xl bg-white/60 p-4 text-center text-sm font-bold text-ink">
            {open ? "Tap a document to see its details" : "Open the bag, then tap a document, or tap FloodMesh for the built-in beacon"}
          </p>
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
