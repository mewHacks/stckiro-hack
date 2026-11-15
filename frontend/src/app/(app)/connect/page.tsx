"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Loader2, MapPin, Radio, RadioTower, RefreshCw, Server, TriangleAlert, Wifi } from "lucide-react";
import NetBadge from "@/components/NetBadge";
import { serverReachable } from "@/lib/net";

type State = "checking" | "ok" | "warn";
type Row = { label: string; detail: string; state: State; icon: typeof Wifi };

const FRESH: Row[] = [
  { label: "Phone network", detail: "Checking…", state: "checking", icon: Wifi },
  { label: "Rescue server", detail: "Checking…", state: "checking", icon: Server },
  { label: "Backpack beacon", detail: "Checking…", state: "checking", icon: Radio },
  { label: "GPS location", detail: "Checking…", state: "checking", icon: MapPin },
  { label: "FloodMesh relays", detail: "Checking…", state: "checking", icon: RadioTower },
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ponytail: network + server are real; beacon, GPS and mesh are simulated until the hardware/backend report them
async function runChecks(set: Dispatch<SetStateAction<Row[]>>, alive: () => boolean) {
  const upd = (i: number, patch: Partial<Row>) => alive() && set((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  await sleep(500);
  const net = navigator.onLine;
  upd(0, { state: net ? "ok" : "warn", detail: net ? "Wi-Fi / mobile data connected" : "No network. Mesh only" });
  const srv = await serverReachable();
  upd(1, { state: srv ? "ok" : "warn", detail: srv ? "Reachable. SOS can go over the internet" : "Not reachable. SOS will use mesh" });
  await sleep(500);
  upd(2, { state: "ok", detail: "Connected · signal −58 dBm" });
  await sleep(400);
  upd(3, { state: "ok", detail: "Locked · accuracy ±3 m" });
  await sleep(400);
  upd(4, { state: "ok", detail: "4 devices in range" });
}

export default function Connect() {
  const [rows, setRows] = useState<Row[]>(FRESH);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let live = true;
    runChecks(setRows, () => live);
    return () => {
      live = false;
    };
  }, [run]);

  const again = () => {
    setRows(FRESH);
    setRun((n) => n + 1);
  };
  const done = rows.every((r) => r.state !== "checking");
  const viaInternet = rows[1].state === "ok";
  const allGood = done && rows.every((r) => r.state === "ok");

  return (
    <div className="space-y-3 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-white">Connectivity</h1>
        <NetBadge />
      </div>

      <section className="glass rounded-[28px] p-4">
        <div className="flex items-center gap-3">
          <span className={`grid size-12 place-items-center rounded-2xl text-white ${!done ? "bg-brand" : allGood ? "bg-emerald-500" : "bg-amber-500"}`}>
            {!done ? <Loader2 className="animate-spin" size={22} /> : allGood ? <Check size={22} /> : <TriangleAlert size={22} />}
          </span>
          <div className="flex-1">
            <p className="font-display text-xl leading-tight">{!done ? "Checking…" : allGood ? "You're ready" : "Limited connection"}</p>
            <p className="text-xs font-semibold text-ink">
              {!done ? "Testing every link to rescuers" : viaInternet ? "SOS will go over Wi-Fi / data" : "SOS will relay through FloodMesh"}
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-[28px] p-3">
        <ul className="space-y-2">
          {rows.map(({ label, detail, state, icon: Icon }) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky text-brand">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{label}</p>
                <p className="truncate text-xs font-semibold text-ink">{detail}</p>
              </div>
              {state === "checking" ? (
                <Loader2 size={18} className="animate-spin text-brand" />
              ) : state === "ok" ? (
                <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white"><Check size={14} /></span>
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-amber-500 text-white"><TriangleAlert size={13} /></span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button onClick={again} disabled={!done} className="btn-dark flex h-12 w-full items-center justify-center gap-2 text-sm disabled:opacity-60">
        <RefreshCw size={16} /> Check again
      </button>
      <p className="px-2 text-center text-[11px] font-semibold text-ink">
        Offline? That&apos;s fine. The backpack beacon relays your SOS through nearby LiveBuoy devices until a rescuer gateway is reached.
      </p>
    </div>
  );
}
