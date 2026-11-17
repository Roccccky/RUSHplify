import { blockColour } from "../domain/block-inspiration";
import { Activity, ArrowRightFromLine, AudioLines, AudioWaveform, Cable, Clock3, Copy, Filter, Flame, Mic2, Music2, Orbit, Repeat2, Route, ScanLine, Shrink, SlidersHorizontal, Speaker, Sparkles, Waves, Zap, type LucideIcon } from "lucide-react";
import type { BlockCategory, RigBlock } from "../domain/types";
import { BLOCK_CATEGORY_COLORS, categoryForBlockName } from "../domain/block-categories";
import { isNamModule } from "../domain/nam";

export const CATEGORY_ICON: Record<BlockCategory, LucideIcon> = { input: Cable, output: ArrowRightFromLine, vocal: Mic2, amp: AudioLines, cab: Speaker, ir: ScanLine, clone: Copy, overdrive: Flame, distortion: Zap, drive: Flame, eq: SlidersHorizontal, compressor: Shrink, delay: Clock3, reverb: Sparkles, chorus: Waves, phaser: Orbit, vibrato: Activity, modulation: Orbit, filter: Filter, pitch: Music2, dynamics: Activity, rhythmic: Repeat2, synth: AudioWaveform, utility: Route, "fx-loop": Cable };

/** Module types offered in the browser demo, where no pedal reflects `/Evil/API/Blocks`. */
export const DEMO_BLOCK_TYPES = ["Empty Slot", "Amp", "ReValver Amp", "Cab", "IR", "Amp Clone", "Pedal Clone", "Neural Amp Modeler", "Gray Comp", "DynIII Comp", "Bass EQ", "Graphic EQ", "Ten Freq EQ", "Para EQ", "AIR Reverb", "Spring Reverb", "Flora Verb", "AIR Delay", "Tape Echo", "BBD Delay", "Reverse Delay", "Noise Filter", "Gate", "Stereo Doubler", "Green JRC-OD", "White Boost", "Tri Fuzz", "D1 Dist", "Acoust Sim", "AIR Filter", "Chorus", "Multi Chorus", "Flanger", "Vibe Phaser", "Vibrato", "Rotary", "Tremolo", "Shine Wah", "Black Wah", "Wham", "Smart Harm", "Octaves", "Drop Tune", "Shimmer", "Pitch Delay", "Sustain", "Hold", "Multi Delay", "Pressor", "G EQ", "FX-Loop"];

export interface BlockChoice { name: string; model: string; category: BlockCategory; color: string; moduleTypeId: number }

/** Turns the reflected module type list into addable blocks. Index 0 is "Empty Slot"; doubled " 2" variants
 * are hidden except for NAM hosts, which are separate DSP instances. */
export function blockChoicesFromModuleTypes(moduleTypes: unknown[]): BlockChoice[] {
  return moduleTypes.flatMap((entry, moduleTypeId) => {
    const name = String(entry);
    if (!moduleTypeId || (name.endsWith(" 2") && !isNamModule(name))) return [];
    const category = categoryForBlockName(name);
    return [{ name, model: name, category, color: blockColour(name, category), moduleTypeId }];
  });
}

/** Fourteen slots, empty ones filled with placeholders so every position renders. Input/output are not slot
 * blocks on the Flex Prime (IN and OUT are drawn once, outside the slots), so they never occupy a slot here. */
export function chainSlots(blocks: RigBlock[]): RigBlock[] {
  return Array.from({ length: 14 }, (_, index) => blocks.find((block) => block.slot === index && block.category !== "input" && block.category !== "output") ?? { id: `slot-${index + 1}`, name: "Empty Slot", model: "Available", category: "utility" as const, color: "#4c4c4c", enabled: false, empty: true, slot: index, parameters: [] });
}

/** Amp and cab/IR blocks are drawn smaller than stomps, as on the pedal. */
export function isCompactBlock(category: BlockCategory) {
  return category === "amp" || category === "cab" || category === "ir";
}
