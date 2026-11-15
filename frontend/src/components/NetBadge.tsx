"use client";

import { Radio, Wifi } from "lucide-react";
import { useOnline } from "@/lib/net";

export default function NetBadge({ className = "" }: { className?: string }) {
  const online = useOnline();
  return (
    <span
      className={`pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold ${online ? "text-emerald-600" : "text-amber-600"} ${className}`}
      title={online ? "SOS goes over the internet" : "SOS goes peer-to-peer over FloodMesh"}
    >
      {online ? <Wifi size={14} /> : <Radio size={14} />}
      {online ? "Online" : "Offline · Mesh"}
    </span>
  );
}
