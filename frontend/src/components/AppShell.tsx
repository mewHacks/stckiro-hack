"use client";

import Link from "next/link";
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import { ArrowRight, Backpack, Radar, Siren, User, Wifi } from "lucide-react";

const NAV = [
  { href: "/app", icon: Backpack, label: "Backpack" },
  { href: "/radar", icon: Radar, label: "Radar" },
  { href: "/sos", icon: Siren, label: "SOS", center: true }, // manual emergency button
  { href: "/connect", icon: Wifi, label: "Connectivity" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="relative grid min-h-dvh place-items-center md:p-6">
      {/* desktop-only pitch panel beside the phone */}
      <aside className="absolute left-[max(2rem,calc(50%-560px))] top-1/2 hidden max-w-xs -translate-y-1/2 lg:block">
        <Logo size={72} />
        <p className="font-display mt-4 text-5xl text-brand-deep">LiveBuoy</p>
        <p className="mt-3 text-lg font-semibold text-ink">Protect what matters. Stay connected when it matters most.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin" className="btn-dark inline-flex items-center gap-2 px-5 py-3 text-sm">
            Rescuer dashboard <ArrowRight size={16} />
          </Link>
          <Link href="/" className="pill inline-flex items-center px-5 py-3 text-sm font-extrabold text-brand-deep">
            3D bag
          </Link>
        </div>
      </aside>

      <div className="app-bg relative flex h-dvh w-full flex-col overflow-hidden md:h-[min(860px,calc(100dvh-3rem))] md:w-[400px] md:rounded-[52px] md:border-[10px] md:border-white md:shadow-[0_30px_80px_rgba(37,72,212,0.35)]">
        <main className="no-scrollbar flex-1 overflow-y-auto pb-24">{children}</main>

        <nav className="glass absolute inset-x-4 bottom-4 flex items-center justify-around rounded-[28px] px-2 py-2">
          {NAV.map(({ href, icon: Icon, label, center }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`grid place-items-center transition active:scale-90 ${
                  center
                    ? `size-14 rounded-[20px] text-white shadow-lg shadow-brand/40 ${active ? "bg-brand-deep" : "bg-brand"}`
                    : `size-11 rounded-2xl ${active ? "bg-sky text-brand-deep" : "text-ink/70"}`
                }`}
              >
                <Icon size={center ? 24 : 21} strokeWidth={2.4} />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
