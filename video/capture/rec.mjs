// Tiny headless-Chrome recorder: drive a page with scripted actions, save a smooth screencast as mp4.
// Frames come from Chrome's compositor (real GPU), timestamps are kept, then ffmpeg resamples to constant 30 fps.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let port = 9400;

export async function launch({ width, height, dpr = 1, mobile = false, gpu = true }) {
  const dir = fs.mkdtempSync("/private/tmp/claude-501/lb-prof-");
  const p = port++;
  const args = [
    "--headless=new", `--remote-debugging-port=${p}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`,
    "--no-first-run", "--hide-scrollbars", "--disable-features=TranslateUI", "--autoplay-policy=no-user-gesture-required",
    ...(gpu ? ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
    "about:blank",
  ];
  const chrome = spawn(CHROME, args, { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${p}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map(), listeners = [], logs = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? {}); pending.delete(m.id); }
    else if (m.method) {
      listeners.forEach((l) => l(m));
      if (m.method === "Runtime.exceptionThrown") logs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
  if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });

  const api = {
    send, logs,
    goto: async (url, wait = 2500) => { await send("Page.navigate", { url }); await sleep(wait); },
    eval: async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value,
    /** click an element whose text contains `text` (buttons, links, role=button) */
    click: async (text, { nth = 0 } = {}) => {
      const r = await api.eval(`(() => { const all=[...document.querySelectorAll('button,a,[role=button]')].filter(x=>x.textContent.includes(${JSON.stringify(text)})||x.getAttribute('aria-label')===${JSON.stringify(text)}); const b=all[${nth}]; if(!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; })()`);
      if (!r) throw new Error("not found: " + text);
      await api.tap(r[0], r[1]);
    },
    tap: async (x, y) => {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    drag: async (x0, y0, x1, y1, ms = 900) => {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0, y: y0 });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", buttons: 1 });
      const n = Math.max(8, Math.round(ms / 16));
      for (let i = 1; i <= n; i++) {
        const k = i / n, e = k * k * (3 - 2 * k);
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e, buttons: 1 });
        await sleep(ms / n);
      }
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x1, y: y1, button: "left" });
    },
    scroll: (y) => api.eval(`document.querySelector('main')?.scrollTo({top:${y},behavior:'smooth'})`),
    offline: (on) => send("Network.emulateNetworkConditions", { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }),
    /** record until the returned stop() is awaited → writes `out` (mp4, 30 fps). */
    record: async (out, { quality = 92 } = {}) => {
      const frames = fs.mkdtempSync("/private/tmp/claude-501/lb-frames-");
      const stamps = [];
      let n = 0;
      const onMsg = (m) => {
        if (m.method !== "Page.screencastFrame") return;
        const f = String(n++).padStart(6, "0");
        fs.writeFileSync(path.join(frames, f + ".jpg"), Buffer.from(m.params.data, "base64"));
        stamps.push(m.params.metadata.timestamp);
        send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
      };
      listeners.push(onMsg);
      await send("Page.startScreencast", { format: "jpeg", quality, everyNthFrame: 1, maxWidth: Math.round(width * dpr), maxHeight: Math.round(height * dpr) });
      return async () => {
        const tail = Math.max(Date.now() / 1000 - (stamps.at(-1) ?? 0), 0.033); // static time after the last changed frame
        await send("Page.stopScreencast");
        listeners.splice(listeners.indexOf(onMsg), 1);
        const list = stamps.map((t, i) => `file '${String(i).padStart(6, "0")}.jpg'\nduration ${Math.max(i < stamps.length - 1 ? stamps[i + 1] - t : tail, 0.001).toFixed(4)}`).join("\n");
        fs.writeFileSync(path.join(frames, "list.txt"), list + `\nfile '${String(stamps.length - 1).padStart(6, "0")}.jpg'\n`);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(frames, "list.txt"), "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
        const secs = stamps.length ? stamps[stamps.length - 1] - stamps[0] + tail : 0;
        fs.rmSync(frames, { recursive: true, force: true });
        return { frames: stamps.length, seconds: +secs.toFixed(2), fps: +(stamps.length / Math.max(secs, 0.01)).toFixed(1) };
      };
    },
    close: () => { try { ws.close(); } catch {} chrome.kill(); },
  };
  return api;
}
