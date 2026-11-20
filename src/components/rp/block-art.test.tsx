import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEMO_BLOCK_TYPES } from "../../rig/block-catalogue";
import { BLOCK_CATEGORY_COLORS } from "../../domain/block-categories";
import { BlockArt } from "./block-art";
import { BlockPicture } from "./block-picture";

// Every module name the Flex Prime reflects (FW 5.1 category lists) plus the demo list.
const REFLECTED = ["Amp", "ReValver Amp", "Cab", "ReValver Cab", "IR", "IR (1024)", "Amp Clone", "Neural Amp Modeler", "Neural Amp Modeler 2", "Pedal Clone", "SuperClone",
  "Anxiety OD", "Anxiety OD V2", "B2 Drive", "Budda OM OD", "Budda ZenMan", "D250 Drive", "Glorious Drive", "Green JRC-OD", "Greener", "Greener Lite", "Grinder Bass OD", "Jimmy OD", "K Drive", "Palace OD", "S1 Drive", "Sher'ff", "Treble Booster", "White Boost",
  "8-Bit Crush", "B Dist 7000", "Black Death", "Black Op", "D1 Dist", "DC Distort", "MX Dist", "Oct Fuzz", "Round Fuzz", "Slab O Meat", "Tri Fuzz",
  "Acoust Sim", "Acoustic Pre", "Auto Q 8 Band EQ", "Bass EQ", "G EQ", "Graphic Bass EQ", "Graphic EQ", "Para EQ", "Promise EQ", "Ten Freq EQ",
  "Budda Comp", "DynIII Comp", "Gray Comp", "Pressor", "Side Comp", "Slammer",
  "AIR Delay", "Again Delay", "BBD Delay", "Budda Samsara Delay", "Dyn Delay", "Grain Delay", "M104 Analog Delay", "Multi Delay", "Pitch Delay", "Reso Delay", "Reverse Delay", "Stereo Doubler", "Tape Echo", "Time Warp",
  "AIR Reverb", "Ambi Verb", "C-Verb", "Eleven Reverb", "Party Verb", "Shimmer", "Spring Guru", "Spring Reverb",
  "Budda Karma Chorus", "C2 Bass Chorus", "C2 Chorus", "Chorus", "Detune", "Dim Chorus", "Multi Chorus",
  "AIR Flanger", "Analog Flanger", "Digital Flanger", "Flanger", "Orange Phaser", "Ring Mod", "Square-Phase", "Stone Phaser", "Tron Phaser", "Vibe Phaser",
  "AIR Vibrato", "Panner", "Rotary", "Tremolo", "Tube Tremolo", "Vibrato",
  "AIR Filter", "Black Wah", "Bud Wah", "Env Filter", "More Wah", "Shine Wah", "Tron Filter", "White Bass Wah",
  "Chord Wham", "Drop Tune", "Harm", "Octaves", "Octaves Up", "Smart Harm", "Up Tune", "Wham",
  "Auto Swell", "Feedback", "Hold", "Sustain", "Volume", "Kill Seq", "Splicer", "DB-33", "Electric", "Hybrid", "Gate", "Kaften Gate", "Noise Filter", "FX-Loop"];

describe("own block pictograms", () => {
  it("draws every demo and reflected block as an SVG enclosure in its own colour", () => {
    for (const name of new Set([...DEMO_BLOCK_TYPES, ...REFLECTED])) {
      const { container, unmount } = render(<BlockPicture name={name} size={36}/>);
      const svg = container.querySelector("svg.rp-art");
      expect(svg, name).not.toBeNull();
      expect(container.querySelector("img"), name).toBeNull();
      expect(svg!.querySelector(".rpa-body"), name).not.toBeNull();
      expect(svg!.querySelector(".rpa-body")!.getAttribute("fill"), name).toMatch(/^#[0-9a-f]{6}$/i);
      unmount();
    }
  });

  it("mirrors the model's look: enclosure, colour, knob rows, faders", () => {
    expect(render(<BlockArt name="Black Wah"/>).container.querySelector("svg")!.dataset.shape).toBe("wah");
    const green = render(<BlockArt name="Green JRC-OD"/>).container;
    expect(green.querySelector(".rpa-body")!.getAttribute("fill")).toBe("#3aa64a");
    expect(green.querySelectorAll(".rpa-knob")).toHaveLength(3);
    expect(render(<BlockArt name="Ten Freq EQ"/>).container.querySelectorAll(".rpa-cap")).toHaveLength(10);
    expect(render(<BlockArt name="B2 Drive"/>).container.querySelector(".rpa-plate")).not.toBeNull();
  });

  it("draws unknown models as a box in their category colour", () => {
    const art = render(<BlockArt name="Some Future Drive" category="overdrive"/>).container;
    expect(art.querySelector(".rpa-body")!.getAttribute("fill")).toBe(BLOCK_CATEGORY_COLORS.overdrive);
  });

  it("never loads the pedal's own block pictures", () => {
    const source = readFileSync(join(process.cwd(), "src/components/rp/block-picture.tsx"), "utf8");
    expect(source).not.toMatch(/blockImage|device_block_image|Blocks\/img/);
  });
});
