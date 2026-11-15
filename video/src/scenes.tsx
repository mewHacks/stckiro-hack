import React from "react";
import { BookOpenCheck, Check, EyeOff, FileX, Radio, ShieldCheck, WifiOff } from "lucide-react";
import { AbsoluteFill, Bg, C, Cap, Clip, Count, Drop, FONT, Img, Phone, Pill, Vignette, Words, clamp, interpolate, prog, spring, staticFile, useCurrentFrame } from "./ui";

const fill: React.CSSProperties = { position: "absolute", inset: 0 };
const left: React.CSSProperties = { position: "absolute", left: 130, top: "50%", transform: "translateY(-50%)", maxWidth: 1100 };

// ───────── 1. HOOK (570 f) ─────────
export const Hook = () => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, 570], [1.02, 1.14], clamp);
  return (
    <AbsoluteFill style={{ background: "#0a2a5e" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}><Clip src="flood.mp4" from={1} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg,rgba(4,16,52,.82) 0%,rgba(4,16,52,.4) 58%,rgba(4,16,52,.05) 100%)" }} />
      <Vignette strength={0.5} />
      <Cap a={24} b={132}><div style={left}><Words text="Every monsoon, Malaysia floods." size={112} /></div></Cap>
      <Cap a={148} b={292}>
        <div style={left}>
          <div style={{ fontFamily: FONT, fontSize: 300, fontWeight: 900, color: "#fff", lineHeight: 1, textShadow: "0 6px 40px rgba(4,16,52,.5)" }}><Count to={4.82} decimals={1} suffix="M" dur={55} /></div>
          <Words text="people live in flood-prone areas" at={14} size={66} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: "rgba(255,255,255,.7)", marginTop: 22 }}>About 22% of Malaysians · ADRC / DID estimate</div>
        </div>
      </Cap>
      <Cap a={308} b={444}><div style={left}><Words text="When it floods, three things fail at once." size={104} /></div></Cap>
      <Cap a={458} b={560} out={14}><div style={left}><Words text="Documents. Signal. Visibility." size={116} stagger={16} /></div></Cap>
    </AbsoluteFill>
  );
};

// ───────── 2. PROBLEM (855 f) ─────────
const cards = [
  { Icon: FileX, color: C.red, title: "Documents are lost", text: "IC, passport and medical records are ruined or left behind." },
  { Icon: WifiOff, color: C.amber, title: "Communication breaks", text: "No signal. No way to call for help or share where you are." },
  { Icon: EyeOff, color: C.deep, title: "Rescuers are blind", text: "They can't see who needs help, or where." },
];
const Card = ({ i }: { i: number }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - 18 - i * 52, fps: 30, config: { damping: 200 } });
  const { Icon, color, title, text } = cards[i];
  return (
    <div style={{ width: 520, height: 520, borderRadius: 48, background: "rgba(255,255,255,.78)", backdropFilter: "blur(20px)", border: "1px solid #fff", boxShadow: "0 30px 80px rgba(37,72,212,.2)", padding: 44, opacity: p, transform: `translateY(${(1 - p) * 90}px) scale(${0.94 + p * 0.06})` }}>
      <div style={{ width: 110, height: 110, borderRadius: 32, background: `${color}22`, display: "grid", placeItems: "center" }}><Icon size={56} color={color} strokeWidth={2.4} /></div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 56, color: C.navy, marginTop: 34, lineHeight: 1.05 }}>{title}</div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.ink, marginTop: 20, lineHeight: 1.25 }}>{text}</div>
    </div>
  );
};
const Stat = ({ at, value, label, sub, color = C.deep }: { at: number; value: React.ReactNode; label: string; sub?: string; color?: string }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 24);
  return (
    <div style={{ width: 540, opacity: p, transform: `translateY(${(1 - p) * 50}px)`, textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, color: C.navy, marginTop: 14 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.ink, marginTop: 6 }}>{sub}</div>}
    </div>
  );
};
export const Problem = () => (
  <AbsoluteFill>
    <Bg />
    <Cap a={0} b={290} out={16}>
      <div style={{ position: "absolute", top: 90, width: "100%", display: "flex", justifyContent: "center" }}><Words text="Three things fail at once." size={92} color={C.navy} shadow={false} /></div>
      <div style={{ position: "absolute", top: 290, left: 120, display: "flex", gap: 60 }}>{[0, 1, 2].map((i) => <Card key={i} i={i} />)}</div>
    </Cap>
    <Cap a={300} b={565} out={16}>
      <div style={{ position: "absolute", top: 100, width: "100%", display: "flex", justifyContent: "center" }}><Words text="The December 2021 floods" size={74} color={C.navy} shadow={false} /></div>
      <div style={{ position: "absolute", top: 380, left: 90, display: "flex", gap: 0 }}>
        <Stat at={20} value={<Count to={54} at={20} />} label="lives lost" sub="20 in Selangor alone" color={C.red} />
        <Stat at={44} value={<Count to={125000} at={44} dur={60} />} label="people displaced" />
        <Stat at={68} value={<>RM <Count to={5.3} decimals={1} at={68} />–6.5B</>} label="in damage" sub="government estimate" color={C.amber} />
      </div>
    </Cap>
    <Cap a={575} b={855} out={15}>
      <div style={{ position: "absolute", top: 100, width: "100%", display: "flex", justifyContent: "center" }}><Words text="And it keeps happening" size={74} color={C.navy} shadow={false} /></div>
      <div style={{ position: "absolute", top: 380, left: 90, display: "flex" }}>
        <Stat at={20} value={<><Count to={122} at={20} />k+</>} label="evacuated" sub="November 2024, a record" color={C.red} />
        <Stat at={44} value={<Count to={5648} at={44} dur={60} />} label="flood-prone sites" sub="identified nationwide, 2023" />
        <Stat at={68} value={<Count to={4.8} decimals={1} at={68} suffix="M" />} label="people at risk" sub="in flood-prone areas" color={C.amber} />
      </div>
    </Cap>
    <div style={{ position: "absolute", bottom: 44, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink }}>
      Sources: Wikipedia (Dec 2021 floods) · ReliefWeb · Malay Mail / Bomba · ADRC. Figures differ by agency; shown as reported.
    </div>
  </AbsoluteFill>
);

// ───────── 3. REVEAL (375 f) ─────────
export const Reveal = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 375], [1.12, 1.0], clamp);
  const flash = interpolate(f, [8, 14, 38], [0, 0.9, 0], clamp);
  const pop = spring({ frame: f - 10, fps: 30, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: "#0a2a5e" }}>
      <AbsoluteFill style={{ transform: `scale(${z * (0.94 + 0.06 * pop)})`, opacity: Math.min(pop * 1.4, 1) }}><Img src={staticFile("cover.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg,rgba(4,16,52,.85) 0%,rgba(4,16,52,.0) 42%)" }} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Cap a={70} b={375} out={1}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Words text="A waterproof backpack that keeps your documents dry," size={60} align="center" />
          <Words text="and sends your SOS even when the network is down." size={60} align="center" at={34} />
        </div>
      </Cap>
      <Cap a={225} b={375} out={1}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
          <Drop size={34} /><Words text="Protect what matters. Stay connected when it matters most." size={38} weight={800} color={C.teal} align="center" shadow={false} />
        </div>
      </Cap>
    </AbsoluteFill>
  );
};

// ───────── 4. THE BAG (1155 f) ─────────
const Part = ({ a, b, children }: { a: number; b: number; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 14, b - 14, b], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const Bag = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#eaf1ff" }}>
      <Part a={0} b={510}>
        <Clip src="bag-hero.mp4" rate={1.15} />
        <Cap a={20} b={150}><Pill text="Waterproof leather. Sealed roll-top." /></Cap>
        <Cap a={165} b={335}><Pill text="Tap to open. Every document has a place." /></Cap>
        <Cap a={350} b={500}><Pill text="Spin it, inspect it. It's all real, in 3D." /></Cap>
      </Part>
      <Part a={495} b={870}>
        <Clip src="bag-items.mp4" from={2.3} rate={1.15} />
        <Cap a={20} b={150}><Pill text="Tap any document for its details." /></Cap>
        <Cap a={165} b={262}><Pill text="The SOS beacon is built into the front." /></Cap>
        <Cap a={272} b={360}><Pill text="Swap its battery in seconds." /></Cap>
      </Part>
      <Part a={855} b={1155}>
        <div style={{ ...fill, transform: `scale(${interpolate(f, [855, 1155], [1.0, 1.1], clamp)})` }}><Clip src="flood.mp4" from={8} /></div>
        <Vignette strength={0.35} />
        <Cap a={885} b={1130}><Pill text="Water test: afloat in the flood, sealed shut." /></Cap>
        <div style={{ position: "absolute", top: 36, right: 46, fontFamily: FONT, fontWeight: 700, fontSize: 24, color: "rgba(255,255,255,.85)", background: "rgba(4,16,52,.5)", padding: "8px 18px", borderRadius: 999 }}>3D simulation</div>
      </Part>
    </AbsoluteFill>
  );
};

// ───────── 5. PHONE APP (1425 f) ─────────
const Bullet = ({ at, text }: { at: number; text: string }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 20);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
      <div style={{ width: 54, height: 54, borderRadius: 18, background: C.green, display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={32} color="#fff" strokeWidth={3.4} /></div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, color: C.navy, lineHeight: 1.15 }}>{text}</div>
    </div>
  );
};
const Step = ({ n, title, bullets }: { n: string; title: string; bullets: string[] }) => (
  <div style={{ position: "absolute", left: 900, top: "50%", transform: "translateY(-50%)", width: 900 }}>
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.brand, letterSpacing: ".08em" }}>{n}</div>
    <Words text={title} size={84} color={C.navy} shadow={false} />
    <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 44 }}>{bullets.map((b, i) => <Bullet key={i} at={26 + i * 18} text={b} />)}</div>
  </div>
);
const PhoneClip = ({ a, b, src, from = 0, rate = 1 }: { a: number; b: number; src: string; from?: number; rate?: number }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 12, b - 12, b], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}><Clip src={src} from={from} rate={rate} /></AbsoluteFill>;
};
export const PhoneApp = () => {
  const f = useCurrentFrame();
  const enter = spring({ frame: f, fps: 30, config: { damping: 200 } });
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: "absolute", left: 230, top: 104, transform: `translateY(${(1 - enter) * 120}px) rotate(${(1 - enter) * -4}deg)`, opacity: enter }}>
        <Phone>
          <PhoneClip a={0} b={267} src="app-checklist.mp4" from={0.6} rate={1.45} />
          <PhoneClip a={255} b={702} src="sos-online.mp4" from={0.8} />
          <PhoneClip a={690} b={867} src="connect.mp4" rate={0.95} />
          <PhoneClip a={855} b={1425} src="sos-offline.mp4" rate={0.72} />
        </Phone>
      </div>
      <Cap a={0} b={267}><Step n="01" title="Know what's packed" bullets={["Every document on one checklist", "Tap for details: blood type, passport, battery"]} /></Cap>
      <Cap a={255} b={702}><Step n="02" title="One tap. A reason. Everything sent." bullets={["The reason sets the alert priority", "3-second cancel window. No false alarms", "Medical info, location, battery, contacts: all together"]} /></Cap>
      <Cap a={690} b={867}><Step n="03" title="It checks the network for you" bullets={["Internet? Sent over Wi-Fi or data", "No signal? Relayed through FloodMesh"]} /></Cap>
      <Cap a={855} b={1425} out={14}><Step n="04" title="Phone dying? One last signal." bullets={["At 5% battery, LastSignal sends a final alert", "All your data goes with it", "The bag's beacon keeps broadcasting"]} /></Cap>
    </AbsoluteFill>
  );
};

// ───────── 6. RESCUER MAP (675 f) ─────────
export const Rescuer = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#dbe8ff" }}>
      <div style={{ ...fill, transform: `scale(${interpolate(f, [0, 675], [1.0, 1.05], clamp)})` }}><Clip src="admin.mp4" rate={0.82} /></div>
      <Cap a={10} b={96}><Pill text="Every victim on one live map." bottom={46} /></Cap>
      <Cap a={100} b={212}><Pill text="A new SOS lands the instant it's sent." bottom={46} /></Cap>
      <Cap a={222} b={360}><Pill text="Nearest first. Assign, then mark rescued." bottom={46} /></Cap>
      <Cap a={370} b={455}><Pill text="Switch teams. See who is in reach." bottom={46} /></Cap>
      <Cap a={462} b={570}><Pill text="Satellite view for flooded roads and rooftops." bottom={46} /></Cap>
      <Cap a={580} b={675} out={1}><Pill text="Documents safe. Signal sent. Rescuers know." bottom={46} /></Cap>
    </AbsoluteFill>
  );
};

// ───────── 7. HONEST STATUS (315 f) ─────────
const Row = ({ at, tag, color, title, text }: { at: number; tag: string; color: string; title: string; text: string }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 22);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 34, padding: "26px 36px", borderRadius: 36, background: "rgba(255,255,255,.82)", border: "1px solid #fff", boxShadow: "0 20px 60px rgba(37,72,212,.16)", opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: "#fff", background: color, borderRadius: 20, padding: "12px 24px", minWidth: 190, textAlign: "center" }}>{tag}</div>
      <div><div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 46, color: C.navy }}>{title}</div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: C.ink, marginTop: 4 }}>{text}</div></div>
    </div>
  );
};
export const Status = () => (
  <AbsoluteFill>
    <Bg />
    <div style={{ position: "absolute", left: 140, top: 120 }}><Words text="Honest status." size={96} color={C.navy} shadow={false} /></div>
    <div style={{ position: "absolute", left: 140, top: 290, width: 1640, display: "flex", flexDirection: "column", gap: 26 }}>
      <Row at={24} tag="WORKING" color={C.green} title="App, dashboard and 3D product" text="Priority SOS, auto internet-or-mesh routing, live rescuer map" />
      <Row at={52} tag="SIMULATED" color={C.amber} title="Mesh relay and beacon hardware" text="Shown in software today; real hardware needs a prototype" />
      <Row at={80} tag="NEXT" color={C.deep} title="Prototype beacon + a pilot community" text="Funded by councils, insurers and employers for high-risk households" />
    </div>
  </AbsoluteFill>
);

// ───────── 8. END CARD (135 f) ─────────
export const End = () => {
  const f = useCurrentFrame();
  const p = spring({ frame: f, fps: 30, config: { damping: 16, stiffness: 90 } });
  return (
    <AbsoluteFill>
      <Bg dark />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
        <div style={{ width: 190, height: 190, borderRadius: 60, background: "#fff", display: "grid", placeItems: "center", transform: `scale(${p})`, boxShadow: "0 40px 100px rgba(0,0,0,.35)" }}><Img src={staticFile("logo.png")} style={{ width: 150, height: 150 }} /></div>
        <Words text="LiveBuoy" size={150} at={8} stagger={4} />
        <Words text="Protect what matters. Stay connected when it matters most." size={46} weight={800} color="#bcd7ff" at={22} align="center" shadow={false} />
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, color: "rgba(255,255,255,.75)", opacity: prog(f, 60, 20), marginTop: 10 }}>github.com/mewHacks/stckiro-hack</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
