import { Navigation, Search } from "lucide-react";
import RadarMap from "@/components/RadarMap";

const LEGEND = [
  { c: "bg-red-500", t: "Critical" },
  { c: "bg-orange-500", t: "Needs help" },
  { c: "bg-brand", t: "Rescuers" },
];

export default function Radar() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0">
        <RadarMap />
      </div>

      <div className="relative space-y-3 px-5 pt-6">
        <h1 className="text-[26px] text-navy">RescueRadar</h1>
        <div className="pill flex items-center gap-2 px-4 py-3 text-sm text-ink">
          <Search size={16} /> Search areas or evacuation centres
        </div>
        <div className="flex gap-2">
          {LEGEND.map((l) => (
            <span key={l.t} className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold">
              <span className={`size-2.5 rounded-full ${l.c}`} /> {l.t}
            </span>
          ))}
        </div>
      </div>

      <div className="glass absolute inset-x-4 bottom-3 rounded-[28px] p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand text-white">
            <Navigation size={20} />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg leading-tight">Team Alpha · 12 min</p>
            <p className="text-xs font-semibold text-ink">Rerouted around flooded Jalan Sentosa</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">Assigned</span>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-ink/80">
          Map refreshes when new reports arrive. Routes depend on reported flood data and can&apos;t guarantee safe passage.
        </p>
      </div>
    </div>
  );
}
