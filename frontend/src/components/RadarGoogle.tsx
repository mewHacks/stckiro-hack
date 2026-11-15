"use client";

import { useEffect } from "react";
import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { avatar, MAP_CENTER, RESCUERS, toLatLng, type Request } from "@/lib/data";
import type { Focus } from "./RadarSvg";

const ROUTE = [[90, 380], [120, 330], [150, 300], [150, 210]].map(([x, y]) => toLatLng(x, y));
const color = (r: Request) => (r.status === "Rescued" ? "#10b981" : r.severity === 3 ? "#ef4444" : "#f97316");

// Route line + "nearby" ring drawn with the Maps API itself so they pan/zoom with the map
function Overlays({ showRoute, focus }: { showRoute: boolean; focus?: Focus }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const shapes: { setMap(m: null): void }[] = [];
    if (showRoute)
      shapes.push(new google.maps.Polyline({ map, path: ROUTE, strokeColor: "#2548d4", strokeWeight: 5, strokeOpacity: 0.9 }));
    if (focus)
      shapes.push(
        new google.maps.Circle({
          map,
          center: toLatLng(focus.x, focus.y),
          radius: focus.r * 10, // 100 map units = 1 km = 1000 m
          strokeColor: "#3f6df0",
          strokeWeight: 2,
          fillColor: "#3f6df0",
          fillOpacity: 0.08,
          clickable: false,
        }),
      );
    return () => shapes.forEach((s) => s.setMap(null));
  }, [map, showRoute, focus]);
  return null;
}

export default function RadarGoogle({ apiKey, requests, showRoute = true, focus, onError }: { apiKey: string; requests: Request[]; showRoute?: boolean; focus?: Focus; onError: (msg: string) => void }) {
  // Google calls this global when it rejects the key (wrong key, API not enabled, billing off, referrer not allowed)
  useEffect(() => {
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () =>
      onError("Google rejected the key. Check that Maps JavaScript API is enabled, billing is on, and the key allows this site (localhost:3000)");
  }, [onError]);

  return (
    <APIProvider apiKey={apiKey} onError={(e) => onError(`Google Maps failed to load (${(e as Error)?.message ?? "network or key problem"})`)}>
      <Map
        defaultCenter={MAP_CENTER}
        defaultZoom={14}
        mapId="DEMO_MAP_ID" // ponytail: swap for a styled Map ID from Google Cloud when you want custom styling
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        className="size-full"
      >
        <Overlays showRoute={showRoute} focus={focus} />

        {requests.map((r) => (
          <AdvancedMarker key={r.id} position={toLatLng(r.x, r.y)} zIndex={r.severity}>
            <div className="relative grid place-items-center">
              {r.status !== "Rescued" && (
                <span className="absolute size-24 rounded-full" style={{ background: `radial-gradient(${color(r)}66, transparent 70%)` }} />
              )}
              {r.status === "Pending" && <span className="absolute size-12 animate-ping rounded-full opacity-40" style={{ background: color(r) }} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar(r.id)} alt={r.name} className="relative size-11 rounded-full border-[3px] object-cover shadow-lg" style={{ borderColor: color(r) }} />
              {r.id.startsWith("LIVE") && <span className="absolute left-12 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white">LIVE SOS</span>}
            </div>
          </AdvancedMarker>
        ))}

        {RESCUERS.map((t) => (
          <AdvancedMarker key={t.id} position={toLatLng(t.x, t.y)} zIndex={10}>
            <div className="grid size-9 place-items-center rounded-xl border-[3px] border-white bg-brand font-black text-white shadow-lg">{t.id[0]}</div>
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
