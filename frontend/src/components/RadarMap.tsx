"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { type Request, type Rescuer } from "@/lib/data";
import { useLive } from "@/lib/live";
import RadarGoogle from "./RadarGoogle";
import RadarSvg, { type Focus } from "./RadarSvg";

// Real Google map when a key is configured, otherwise the offline SVG sketch.
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export default function RadarMap(props: { requests?: Request[]; rescuers?: Rescuer[]; showRoute?: boolean; focus?: Focus }) {
  const live = useLive(); // backend data (or built-in demo data when the backend is down)
  const requests = props.requests ?? live.victims;
  const rescuers = props.rescuers ?? live.rescuers;
  const [error, setError] = useState<string | null>(null);

  const problem = !KEY ? "No key found: set NEXT_PUBLIC_GOOGLE_MAPS_KEY, then restart the dev server" : error;
  return (
    <div className="relative size-full">
      {KEY && !error ? <RadarGoogle apiKey={KEY} {...props} requests={requests} rescuers={rescuers} onError={setError} /> : <RadarSvg {...props} requests={requests} rescuers={rescuers} />}
      {problem && (
        <p className="absolute bottom-3 left-3 z-10 flex max-w-[85%] items-start gap-1.5 rounded-2xl bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800 shadow-md">
          <TriangleAlert size={14} className="mt-px shrink-0" /> {problem}. Showing the offline map.
        </p>
      )}
    </div>
  );
}
