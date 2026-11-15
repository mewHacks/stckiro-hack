"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { REQUESTS, type Request } from "@/lib/data";
import RadarGoogle from "./RadarGoogle";
import RadarSvg, { type Focus } from "./RadarSvg";

// Real Google map when a key is configured, otherwise the offline SVG sketch.
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export default function RadarMap(props: { requests?: Request[]; showRoute?: boolean; focus?: Focus }) {
  const requests = props.requests ?? REQUESTS;
  const [error, setError] = useState<string | null>(null);

  const problem = !KEY ? "No key found: set NEXT_PUBLIC_GOOGLE_MAPS_KEY, then restart the dev server" : error;
  return (
    <div className="relative size-full">
      {KEY && !error ? <RadarGoogle apiKey={KEY} {...props} requests={requests} onError={setError} /> : <RadarSvg {...props} requests={requests} />}
      {problem && (
        <p className="absolute bottom-3 left-3 z-10 flex max-w-[85%] items-start gap-1.5 rounded-2xl bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800 shadow-md">
          <TriangleAlert size={14} className="mt-px shrink-0" /> {problem}. Showing the offline map.
        </p>
      )}
    </div>
  );
}
