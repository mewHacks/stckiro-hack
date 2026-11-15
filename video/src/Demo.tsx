import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Bag, End, Hook, PhoneApp, Problem, Reveal, Rescuer, Status } from "./scenes";
import { FONT } from "./ui";

const T = 15; // transition length
const scenes = [
  { C: Hook, d: 570 }, { C: Problem, d: 855 }, { C: Reveal, d: 375 }, { C: Bag, d: 1155 },
  { C: PhoneApp, d: 1425 }, { C: Rescuer, d: 675 }, { C: Status, d: 315 }, { C: End, d: 135 },
];
// global start frame of each scene (each transition overlaps by T)
const starts = scenes.reduce<number[]>((a, s, i) => (a.push(i === 0 ? 0 : a[i - 1] + scenes[i - 1].d - T), a), []);

const sfx = (name: string, at: number, volume = 0.6) => (
  <Sequence key={`${name}${at}`} from={Math.max(at, 0)} layout="none"><Audio src={staticFile(`audio/${name}.mp3`)} volume={volume} /></Sequence>
);

export const Demo = () => (
  <AbsoluteFill style={{ fontFamily: FONT, background: "#0a2a5e" }}>
    <TransitionSeries>
      {scenes.map(({ C, d }, i) => (
        <React.Fragment key={i}>
          {i > 0 && <TransitionSeries.Transition presentation={i === 5 ? slide({ direction: "from-right" }) : fade()} timing={linearTiming({ durationInFrames: T })} />}
          <TransitionSeries.Sequence durationInFrames={d}><C /></TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>

    <Audio src={staticFile("audio/music.mp3")} volume={(f) => interpolate(f, [0, 70, 1280, 1400, 1560, 5230, 5400], [0, 0.4, 0.4, 0.62, 0.46, 0.46, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    {starts.slice(1).map((s) => sfx("whoosh", s - 8, 0.45))}
    {sfx("riser", starts[2] - 96, 0.5)}
    {sfx("impact", starts[2] + 6, 0.8)}
    {[320, 344, 368].map((l) => sfx("ding", starts[1] + l, 0.28))}
    {[3207, 3237, 3267].map((g) => sfx("tick", g, 0.5))}
    {sfx("ding", 3378, 0.4)}
    {sfx("ding", 4088, 0.4)}
    {sfx("impact", 4138, 0.35)}
    {sfx("ding", starts[5] + 102, 0.4)}
    {sfx("ding", starts[7] + 14, 0.5)}
  </AbsoluteFill>
);
