import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { loadFont } from "@remotion/google-fonts/Nunito";

export const { fontFamily: FONT } = loadFont("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin"] });
export const C = { navy: "#0b1530", brand: "#3f6df0", deep: "#2548d4", sky: "#dbe8ff", ink: "#5b6b8c", teal: "#12d6c3", red: "#ef4444", amber: "#f59e0b", green: "#10b981" };
export const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const prog = (f: number, a: number, len = 18) => interpolate(f, [a, a + len], [0, 1], { ...clamp, easing: ease });

/** light (app sky) or dark (night-blue) animated background with drifting soft orbs */
export const Bg = ({ dark = false }: { dark?: boolean }) => {
  const f = useCurrentFrame();
  const orbs = [{ x: 200, y: 120, r: 620, c: "#7fa6ff" }, { x: 1250, y: 520, r: 700, c: "#9dd8ff" }, { x: 700, y: 780, r: 540, c: dark ? "#2b5bd6" : "#c7d7ff" }];
  return (
    <AbsoluteFill style={{ background: dark ? "linear-gradient(160deg,#0a1b52,#12349a 60%,#1b5cd6)" : "radial-gradient(130% 60% at 50% -5%,#5d8cff 0%,#9dbdff 38%,#e4edff 72%,#f4f7ff 100%)" }}>
      {orbs.map((o, i) => (
        <div key={i} style={{ position: "absolute", left: o.x + noise2D(`x${i}`, f / 170, 0) * 110, top: o.y + noise2D(`y${i}`, 0, f / 170) * 90, width: o.r, height: o.r, borderRadius: "50%", background: o.c, filter: "blur(90px)", opacity: dark ? 0.35 : 0.5 }} />
      ))}
    </AbsoluteFill>
  );
};

/** word-by-word reveal (fade up + deblur) */
export const Words = ({ text, at = 0, size = 84, color = "#fff", weight = 900, stagger = 3, align = "left", shadow = true }: { text: string; at?: number; size?: number; color?: string; weight?: number; stagger?: number; align?: "left" | "center"; shadow?: boolean }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.1, textAlign: align, letterSpacing: "-0.01em", textShadow: shadow ? "0 4px 30px rgba(5,20,60,.45)" : undefined }}>
      {text.split(" ").map((w, i) => {
        const p = prog(f, at + i * stagger, 16);
        return <span key={i} style={{ display: "inline-block", marginRight: "0.27em", opacity: p, transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - p) * 9}px)` }}>{w}</span>;
      })}
    </div>
  );
};

/** show children between local frames a..b of the parent, fading out at the end */
export const Cap = ({ a, b, children, out = 10 }: { a: number; b: number; children: React.ReactNode; out?: number }) => (
  <Sequence from={a} durationInFrames={b - a} layout="none">
    <OutFade dur={b - a} out={out}>{children}</OutFade>
  </Sequence>
);
const OutFade = ({ dur, out, children }: { dur: number; out: number; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [dur - out, dur], [1, 0], clamp) }}>{children}</AbsoluteFill>;
};

export const Count = ({ to, at = 0, dur = 45, decimals = 0, prefix = "", suffix = "" }: { to: number; at?: number; dur?: number; decimals?: number; prefix?: string; suffix?: string }) => {
  const f = useCurrentFrame();
  const v = to * interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <>{prefix}{decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US")}{suffix}</>;
};

export const Drop = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2C12 2 5 10.2 5 15a7 7 0 0014 0C19 10.2 12 2 12 2z" fill={C.teal} /></svg>
);

/** dark glass caption pill, bottom centre */
export const Pill = ({ text, bottom = 70 }: { text: string; bottom?: number }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f, fps: FPS, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, display: "flex", alignItems: "center", gap: 18, padding: "22px 46px", borderRadius: 999, background: "rgba(11,21,48,.8)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.18)", boxShadow: "0 20px 60px rgba(5,20,60,.35)", color: "#fff", fontSize: 46, fontWeight: 800, opacity: p, transform: `translateY(${(1 - p) * 44}px)` }}>
        <Drop />{text}
      </div>
    </div>
  );
};

export const Clip = ({ src, from = 0, rate = 1, fit = "cover" }: { src: string; from?: number; rate?: number; fit?: "cover" | "contain" }) => (
  <OffthreadVideo src={staticFile(`footage/${src}`)} startFrom={Math.round(from * FPS)} playbackRate={rate} muted style={{ width: "100%", height: "100%", objectFit: fit }} />
);

export const Vignette = ({ strength = 0.4 }: { strength?: number }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(4,14,44,${strength}) 100%)` }} />
);

export const Phone = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 418, height: 872, borderRadius: 70, background: C.navy, padding: 14, boxShadow: "0 60px 120px rgba(11,21,48,.45), inset 0 0 0 2px rgba(255,255,255,.22)" }}>
    <div style={{ position: "relative", width: 390, height: 844, borderRadius: 56, overflow: "hidden", background: "#fff" }}>
      {children}
      <div style={{ position: "absolute", top: 9, left: 147, width: 96, height: 26, borderRadius: 16, background: C.navy }} />
    </div>
  </div>
);

export { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, clamp };
