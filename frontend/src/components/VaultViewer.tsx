"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Hand, Lock, LockOpen, ShieldCheck } from "lucide-react";
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
  const item = ITEMS.find((i) => i.id === selected);

  const pick = (id: Id) => {
    setOpen(true);
    setSelected((s) => (s === id ? null : id));
  };
  const toggle = () => {
    setSelected(null);
    setOpen((o) => !o);
  };

  const scene = (
    <BagScene open={open} selected={selected} onToggle={toggle} onSelect={setSelected} onSos={() => router.push("/sos")} />
  );

  const bubble = item
    ? `${item.name} — sealed & dry ✓`
    : open
      ? "Tap any item to take it out!"
      : "I'm sealed and ready. Tap me to open!";

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
    <div className="flex h-full flex-col">
      <div className="relative min-h-[320px] flex-1 touch-none">
        {scene}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-brand-deep shadow-md">
            <Hand size={14} className={open ? "" : "animate-bounce"} />
            {open ? "Tap an item · drag to rotate · pinch to zoom" : "Tap the bag to open · drag to spin"}
          </span>
        </div>
        {item && (
          <div className="glass absolute bottom-3 left-1/2 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-3xl p-3">
            <ItemIcon id={item.id} active />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base">{item.name}</p>
              <p className="truncate text-xs text-ink">{item.note}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck size={12} /> Dry
            </span>
          </div>
        )}
      </div>

      <div className="glass mx-auto mb-4 w-[calc(100%-2rem)] max-w-xl rounded-[28px] p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="font-display text-lg">In your vault</p>
          <button onClick={toggle} className="pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-brand-deep active:scale-95">
            {open ? <Lock size={14} /> : <LockOpen size={14} />} {open ? "Seal bag" : "Open bag"}
          </button>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
      </div>
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
