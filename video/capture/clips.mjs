// Records every clip of the demo from the running production app (frontend :3100, backend :5000).
// Usage: node capture/clips.mjs [clipName ...]   (no args = all)
import { launch, sleep } from "./rec.mjs";

const BASE = "http://localhost:3100";
const OUT = new URL("../public/footage/", import.meta.url).pathname;

// cinematic mode: hide all UI on the 3D page, bag fills the whole viewport (elements stay clickable at opacity 0)
const CINEMA = `(() => { const s = document.createElement('style'); s.textContent = 'header,aside,div.pointer-events-none.absolute{opacity:0!important;pointer-events:none!important} aside{display:none!important} div.touch-none{width:100%!important;flex:1 1 100%!important} div.glass.absolute{display:none!important} button.absolute{opacity:0!important}'; document.head.appendChild(s); })()`;
// bigger, still-crisp UI for 1080p: enlarge the panels instead of upscaling the video
const BIG_PANEL = `(() => { const s = document.createElement('style'); s.textContent = 'aside > *{zoom:1.35}'; document.head.appendChild(s); })()`;
const BIG_ADMIN = `(() => { const s = document.createElement('style'); s.textContent = '.max-w-7xl{max-width:1840px!important} .max-w-7xl>header,section.grid,section.flex-col{zoom:1.22} div.grid.lg\\:grid-cols-\\[1fr_420px\\]{grid-template-columns:1fr 512px!important} section.relative.h-\\[380px\\]{height:672px!important} section.flex-col{height:550px!important} body{overflow:hidden}'; document.head.appendChild(s); })()`;
const LIVE_SOS = `(() => { localStorage.setItem('livebuoy:sos', JSON.stringify({ at: Date.now(), via: 'mesh', reason: 'Trapped by rising water', priority: 'critical' })); dispatchEvent(new Event('livebuoy-sos')); })()`;

const clips = {
  // 1) hero: calm bag → the sea rises → bag floats held by its owner
  async flood() {
    const b = await launch({ width: 1920, height: 1080 });
    await b.goto(`${BASE}/`, 5500);
    await b.eval(CINEMA);
    await sleep(600);
    const stop = await b.record(OUT + "flood.mp4");
    await sleep(1800);
    await b.click("Water test");
    await sleep(3200);
    await b.drag(860, 700, 1160, 700, 5200); // slow orbit
    await sleep(2200);
    await b.drag(1100, 700, 940, 700, 3600);
    await sleep(1500);
    const r = await stop(); b.close(); return r;
  },

  // 2) the bag alone: drop-in, spin, tap to open, water splash, items pop out
  async bagHero() {
    const b = await launch({ width: 1920, height: 1080 });
    await b.goto(`${BASE}/`, 700);
    await b.eval(CINEMA);
    const stop = await b.record(OUT + "bag-hero.mp4");
    await sleep(5200); // intro drop + autorotate
    await b.tap(960, 600); // open the bag
    await sleep(3800);
    await b.drag(760, 700, 1060, 700, 3000);
    await sleep(2000);
    const r = await stop(); b.close(); return r;
  },

  // 3) vault panel: item details, built-in beacon, battery swap
  async bagItems() {
    const b = await launch({ width: 1920, height: 1080 });
    await b.goto(`${BASE}/`, 4500);
    await b.eval(BIG_PANEL);
    await sleep(500);
    const stop = await b.record(OUT + "bag-items.mp4");
    await sleep(1000);
    await b.click("Open bag");
    await sleep(2600);
    await b.click("Passport");
    await sleep(2600);
    await b.click("Emergency");
    await sleep(2300);
    await b.click("FloodMesh"); // built-in beacon: camera swings to the front pocket
    await sleep(3800);
    await b.click("Swap battery");
    await sleep(4200);
    const r = await stop(); b.close(); return r;
  },

  // 4) phone: backpack checklist
  async appChecklist() {
    const b = await launch({ width: 390, height: 844, dpr: 2, mobile: true });
    await b.goto(`${BASE}/app`, 3000);
    const stop = await b.record(OUT + "app-checklist.mp4");
    await sleep(1200);
    await b.click("Medical Record");
    await sleep(2200);
    await b.click("Passport");
    await sleep(2200);
    await b.click("FloodMesh Beacon");
    await sleep(2400);
    await b.scroll(500);
    await sleep(2400);
    const r = await stop(); b.close(); return r;
  },

  // 5) phone: priority SOS over the internet, everything sent together
  async sosOnline() {
    const b = await launch({ width: 390, height: 844, dpr: 2, mobile: true });
    await b.goto(`${BASE}/sos`, 3000);
    const stop = await b.record(OUT + "sos-online.mp4");
    await sleep(1200);
    await b.click("Medical emergency");
    await sleep(1400);
    await b.click("Send SOS"); // tap → 3-2-1 countdown (cancel window)
    await sleep(4200);
    await b.scroll(560);
    await sleep(3600);
    await b.scroll(1250);
    await sleep(4200);
    const r = await stop(); b.close(); return r;
  },

  // 6) phone: no internet → mesh; battery dies → LastSignal at 5%, then power off
  async sosOffline() {
    const b = await launch({ width: 390, height: 844, dpr: 2, mobile: true });
    await b.goto(`${BASE}/sos`, 3000);
    const stop = await b.record(OUT + "sos-offline.mp4");
    await sleep(1000);
    await b.offline(true);
    await sleep(2200); // badge flips to "Offline · Mesh"
    await b.scroll(2000);
    await sleep(1600);
    await b.click("Simulate dying battery");
    await sleep(7600);
    const r = await stop(); b.close(); return r;
  },

  // 7) phone: connectivity check
  async connect() {
    const b = await launch({ width: 390, height: 844, dpr: 2, mobile: true });
    await b.goto(`${BASE}/connect`, 800);
    const stop = await b.record(OUT + "connect.mp4");
    await sleep(5200);
    const r = await stop(); b.close(); return r;
  },

  // 8) rescuer dashboard: every victim, live SOS lands, assign, nearby, satellite
  async admin() {
    const b = await launch({ width: 1920, height: 1080 });
    await b.goto(`${BASE}/admin`, 5500);
    await b.eval(BIG_ADMIN);
    await sleep(2500); // map re-measures + tiles reload
    const stop = await b.record(OUT + "admin.mp4");
    await sleep(2800);
    await b.eval(LIVE_SOS);
    await sleep(3200);
    await b.click("Assign");
    await sleep(2200);
    await b.click("Within");
    await sleep(2400);
    await b.click("Team Bravo");
    await sleep(2400);
    await b.click("Satellite");
    await sleep(3600);
    await b.click("Map");
    await sleep(1500);
    const r = await stop(); b.close(); return r;
  },
};

const want = process.argv.slice(2);
for (const [name, fn] of Object.entries(clips)) {
  if (want.length && !want.includes(name)) continue;
  try {
    console.log(name, JSON.stringify(await fn()));
  } catch (e) {
    console.log(name, "FAILED:", e.message);
  }
}
process.exit(0);
