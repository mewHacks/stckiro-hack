import Link from "next/link";
import { BatteryMedium, Bell, ChevronRight, MapPin, Pencil, Waves } from "lucide-react";
import Logo from "@/components/Logo";
import NetBadge from "@/components/NetBadge";
import VaultViewer from "@/components/VaultViewer";
import { ITEMS } from "@/lib/data";
import { ICONS } from "@/lib/icons";

const STATS = [
  { icon: BatteryMedium, label: "Battery", value: "82%", tint: "text-emerald-500" },
  { icon: Waves, label: "Mesh", value: "4 nodes", tint: "text-brand" },
  { icon: MapPin, label: "GPS", value: "Locked", tint: "text-rose-500" },
];

export default function Home() {
  return (
    <div className="px-5 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-sm font-bold text-white/80">Stay ready,</p>
            <h1 className="text-[28px] leading-tight text-white drop-shadow-sm">LiveBuoy</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <NetBadge />
          <button aria-label="Alerts" className="pill grid size-10 place-items-center text-navy">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* Hero bag card */}
      <section className="glass mt-5 overflow-hidden rounded-[32px] p-3">
        <div className="flex items-center gap-1.5 px-2 pt-1">
          <p className="font-display text-xl">My SafeVault</p>
          <Pencil size={14} className="text-ink" />
        </div>
        <div className="h-[270px]">
          <VaultViewer compact />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map(({ icon: Icon, label, value, tint }) => (
            <div key={label} className="rounded-2xl bg-white p-2.5 shadow-sm">
              <p className="flex items-center gap-1 text-[11px] font-bold text-ink">
                <Icon size={13} className={tint} /> {label}
              </p>
              <p className="font-display text-lg">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <Link href="/vault" className="btn-dark mt-4 flex h-14 items-center justify-center text-base">
        Open SafeVault
      </Link>
      <p className="mt-2 text-center text-xs font-semibold text-ink">Drag to spin · tap the red button for SOS</p>

      <section className="glass mt-5 rounded-[28px] p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg">Vault checklist</p>
          <Link href="/vault" className="flex items-center text-xs font-bold text-brand">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <ul className="mt-3 space-y-2.5">
          {ITEMS.slice(0, 3).map((it) => {
            const Icon = ICONS[it.id];
            return (
              <li key={it.id} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-sky text-brand">
                  <Icon size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold">{it.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-sky">
                    <div className="h-full w-full rounded-full bg-brand" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Sealed</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
