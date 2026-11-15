"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff, MapPin, Nfc, Phone } from "lucide-react";

const CONTACTS = [
  { name: "Mum", phone: "+60 12-345 6789" },
  { name: "Brother", phone: "+60 17-222 1100" },
];

// Drop the generated banner at frontend/public/profile-header.jpg; until it exists a gradient shows instead.
const HEADER = "/profile-header.jpg";

export default function Profile() {
  const [reveal, setReveal] = useState(false);
  const [noHeader, setNoHeader] = useState(false);
  return (
    <div>
      {/* big profile header */}
      <header className="relative h-80 overflow-hidden rounded-b-[40px] bg-gradient-to-br from-brand via-sky to-brand-deep">
        {!noHeader && <Image src={HEADER} alt="" fill priority sizes="400px" className="object-cover object-[50%_22%]" onError={() => setNoHeader(true)} />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
        <div className="absolute inset-x-5 bottom-4 flex items-end gap-4">
          <div className="min-w-0 pb-1 text-white">
            <h1 className="text-3xl leading-tight drop-shadow">Aisyah Rahman</h1>
            <p className="flex items-center gap-1 text-xs font-bold text-white/90">
              <MapPin size={12} /> Taman Sri Muda, Shah Alam
            </p>
            <span className="mt-1 inline-block rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-extrabold text-red-600">High-risk flood area</span>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-5 pt-4">
        <section className="glass flex items-center gap-3 rounded-[28px] p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white">
            <Nfc size={22} />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg leading-tight">Bag FS-2041</p>
            <p className="text-xs font-semibold text-ink">Paired · QR/NFC tag active</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">Online</span>
        </section>

        <section className="glass rounded-[28px] p-4">
          <p className="font-display text-lg">Emergency contacts</p>
          <ul className="mt-2 space-y-2">
            {CONTACTS.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <Phone size={16} className="text-brand" />
                <span className="flex-1 text-sm font-extrabold">{c.name}</span>
                <span className="text-xs font-semibold text-ink">{c.phone}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-[28px] p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg">Medical info</p>
            <button onClick={() => setReveal((r) => !r)} className="pill flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-brand-deep">
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? "Hide" : "Show"}
            </button>
          </div>
          <p className={`mt-2 text-sm font-semibold transition ${reveal ? "" : "select-none blur-sm"}`}>
            Blood type O+ · Asthma (inhaler in bag) · Allergic to penicillin
          </p>
          <p className="mt-2 text-[11px] font-semibold text-ink">Shared only with authorised responders when SOS is sent.</p>
        </section>
      </div>
    </div>
  );
}
