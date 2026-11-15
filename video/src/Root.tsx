import { Composition } from "remotion";
import { Demo } from "./Demo";
export const Root = () => <Composition id="Demo" component={Demo} durationInFrames={5400} fps={30} width={1920} height={1080} />;
