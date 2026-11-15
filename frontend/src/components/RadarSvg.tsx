import { REQUESTS, RESCUERS, type Request, type Rescuer } from "@/lib/data";

// ponytail: stylised SVG map, swap for Mapbox/Leaflet when real coordinates arrive
export type Focus = { x: number; y: number; r: number };
export default function RadarSvg({
  requests = REQUESTS,
  rescuers = RESCUERS,
  you,
  showRoute = true,
  focus,
}: {
  requests?: Request[];
  rescuers?: Rescuer[];
  you?: { x: number; y: number };
  showRoute?: boolean;
  focus?: Focus; // "nearby" radius around the selected rescue team
}) {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid meet" className="size-full overflow-visible">
      <defs>
        <radialGradient id="heat">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <clipPath id="avatar" clipPathUnits="objectBoundingBox">
          <circle cx=".5" cy=".5" r=".5" />
        </clipPath>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#c9d9ff" strokeWidth="1" />
        </pattern>
      </defs>
      {/* oversized so the map fills any screen shape while all markers stay fully visible (meet, not slice) */}
      <rect x="-1500" y="-1500" width="3400" height="3500" fill="#eef4ff" />
      <rect x="-1500" y="-1500" width="3400" height="3500" fill="url(#grid)" />

      {/* river + flood zones */}
      <path d="M-10 120 C80 160 120 260 200 270 S330 330 420 420" fill="none" stroke="#9dbdff" strokeWidth="26" strokeLinecap="round" />
      <path d="M90 180 C140 150 230 200 220 260 S150 320 100 290 Z" fill="#3f6df0" opacity="0.22" />
      <path d="M220 270 C270 250 320 300 300 340 S220 350 215 310 Z" fill="#3f6df0" opacity="0.18" />

      {/* roads */}
      <g stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M0 400 L400 60" />
        <path d="M60 0 L140 500" />
        <path d="M0 330 L400 260" />
      </g>

      {focus && (
        <circle cx={focus.x} cy={focus.y} r={focus.r} fill="#3f6df0" fillOpacity="0.07" stroke="#3f6df0" strokeWidth="2" strokeDasharray="6 6">
          <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* heat */}
      {requests.filter((r) => r.status !== "Rescued" && !r.noLoc && r.reason).map((r) => (
        <circle key={`h${r.id}`} cx={r.x} cy={r.y} r={30 + r.severity * 14} fill="url(#heat)" />
      ))}

      {/* FloodWaze route */}
      {showRoute && (
        <path d="M90 380 L120 330 L150 300 L150 210" fill="none" stroke="#2548d4" strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1s" repeatCount="indefinite" />
        </path>
      )}

      {/* victims */}
      {requests.filter((r) => !r.noLoc).map((r) => {
        const c = r.status === "Rescued" ? "#10b981" : !r.reason ? "#64748b" : r.severity === 3 ? "#ef4444" : "#f97316";
        return (
          <g key={r.id}>
            {r.status === "Pending" && r.reason && (
              <circle cx={r.x} cy={r.y} r="8" fill={c} opacity="0.4">
                <animate attributeName="r" values="8;20;8" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={r.x} cy={r.y} r="15" fill="#fff" />
            {r.photo ? <image href={r.photo} x={r.x - 12} y={r.y - 12} width="24" height="24" clipPath="url(#avatar)" preserveAspectRatio="xMidYMid slice" /> : <><circle cx={r.x} cy={r.y} r="12" fill="#c7d7ff" /><text x={r.x} y={r.y + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#2548d4">{r.name[0]}</text></>}
            <circle cx={r.x} cy={r.y} r="13.5" fill="none" stroke={c} strokeWidth="3" />
            {r.id.startsWith("LIVE") && (
              <text x={r.x + 20} y={r.y + 4} fontSize="12" fontWeight="900" fill="#ef4444">LIVE SOS</text>
            )}
          </g>
        );
      })}

      {/* rescue teams */}
      {rescuers.map((t) => (
        <g key={t.id} transform={`translate(${t.x} ${t.y})`}>
          <rect x="-16" y="-16" width="32" height="32" rx="11" fill="#3f6df0" stroke="#fff" strokeWidth="3" />
          <text y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{t.id[0]}</text>
        </g>
      ))}
      {you && (
        <g>
          <circle cx={you.x} cy={you.y} r="10" fill="#3f6df0" opacity="0.35"><animate attributeName="r" values="10;26;10" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" /></circle>
          <circle cx={you.x} cy={you.y} r="9" fill="#3f6df0" stroke="#fff" strokeWidth="4" />
          <text x={you.x + 16} y={you.y + 5} fontSize="13" fontWeight="900" fill="#2548d4">You</text>
        </g>
      )}
    </svg>
  );
}
