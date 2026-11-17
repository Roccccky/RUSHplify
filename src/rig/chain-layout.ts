/** Grid placement of the 14 Flex Prime slots, following the pedal's rig screen.
 *
 * Straight: two rows of seven, read as a Z (row 1 left→right, cable back to the left, row 2 left→right).
 * Splits: serial slots span both rows; the two parallel paths sit on top of each other.
 * Grid column 1 holds IN, the last column holds OUT; slot columns start at 2. */

export const ROUTING_NAMES = ["Straight", "Middle Split 3-4-3", "Middle Split 5-3-3", "Middle Split 7-2-3", "Immediate Split"] as const;

export interface SplitConfig { before: number; branch: number; after: number }

const SPLITS: Array<SplitConfig | null> = [null, { before: 3, branch: 4, after: 3 }, { before: 5, branch: 3, after: 3 }, { before: 7, branch: 2, after: 3 }, { before: 0, branch: 7, after: 0 }];

export type SlotLane = "row1" | "row2" | "serial" | "a" | "b";

export interface SlotPlacement { slot: number; column: number; row: number; rowSpan: 1 | 2; lane: SlotLane }

export interface ChainLayout {
  routing: number;
  split: SplitConfig | null;
  /** Number of slot columns (IN and OUT come on top). */
  columns: number;
  slots: SlotPlacement[];
  /** Grid row of IN and OUT; null means "spans both rows". */
  inRow: number | null;
  outRow: number | null;
}

export function splitForRouting(routing: number): SplitConfig | null {
  return SPLITS[routing] ?? null;
}

export function mixAvailableForRouting(routing: number) {
  return splitForRouting(routing) !== null;
}

export function chainLayout(routing: number): ChainLayout {
  const split = splitForRouting(routing);
  if (!split) {
    const slots = Array.from({ length: 14 }, (_, slot): SlotPlacement => slot < 7
      ? { slot, column: slot + 2, row: 1, rowSpan: 1, lane: "row1" }
      : { slot, column: slot - 7 + 2, row: 2, rowSpan: 1, lane: "row2" });
    return { routing: 0, split: null, columns: 7, slots, inRow: 1, outRow: 2 };
  }
  const { before, branch, after } = split;
  const slots: SlotPlacement[] = [];
  for (let slot = 0; slot < 14; slot += 1) {
    if (slot < before) slots.push({ slot, column: slot + 2, row: 1, rowSpan: 2, lane: "serial" });
    else if (slot < before + branch) slots.push({ slot, column: slot + 2, row: 1, rowSpan: 1, lane: "a" });
    else if (slot < before + branch * 2) slots.push({ slot, column: slot - branch + 2, row: 2, rowSpan: 1, lane: "b" });
    else slots.push({ slot, column: slot - branch + 2, row: 1, rowSpan: 2, lane: "serial" });
  }
  return { routing, split, columns: before + branch + after, slots, inRow: null, outRow: null };
}

export interface Point { x: number; y: number }
export interface Box { left: number; top: number; right: number; bottom: number }

const midY = (box: Box) => (box.top + box.bottom) / 2;

/** SVG path data for the cable, given the measured boxes of IN, OUT and every slot (container coordinates). */
export function cablePath(layout: ChainLayout, input: Box, output: Box, slots: Box[]): string {
  if (slots.length !== 14) return "";
  const line = (points: Point[]) => points.map((point, index) => `${index ? "L" : "M"}${Math.round(point.x)} ${Math.round(point.y)}`).join(" ");
  if (!layout.split) {
    const row1 = slots.slice(0, 7); const row2 = slots.slice(7);
    const y1 = midY(row1[0]); const y2 = midY(row2[0]);
    const turnY = (Math.max(...row1.map((box) => box.bottom)) + Math.min(...row2.map((box) => box.top))) / 2;
    const rightX = Math.max(row1[6].right, output.left - 8) + 10;
    const leftX = input.left + (input.right - input.left) / 2;
    return [
      line([{ x: input.right, y: midY(input) }, { x: row1[6].right, y: y1 }]),
      line([{ x: row1[6].right, y: y1 }, { x: rightX, y: y1 }, { x: rightX, y: turnY }, { x: leftX, y: turnY }, { x: leftX, y: y2 }, { x: row2[6].right, y: y2 }, { x: output.left, y: midY(output) }]),
    ].join(" ");
  }
  const { before, branch } = layout.split;
  const serialBefore = slots.slice(0, before); const pathA = slots.slice(before, before + branch); const pathB = slots.slice(before + branch, before + branch * 2); const serialAfter = slots.slice(before + branch * 2);
  const centreY = midY(input); const yA = midY(pathA[0]); const yB = midY(pathB[0]);
  const forkX = ((serialBefore.at(-1)?.right ?? input.right) + pathA[0].left) / 2;
  const mergeX = (pathA[branch - 1].right + (serialAfter[0]?.left ?? output.left)) / 2;
  const endX = serialAfter.at(-1)?.right ?? mergeX;
  return [
    line([{ x: input.right, y: centreY }, { x: forkX, y: centreY }]),
    line([{ x: forkX, y: centreY }, { x: forkX, y: yA }, { x: mergeX, y: yA }, { x: mergeX, y: centreY }]),
    line([{ x: forkX, y: centreY }, { x: forkX, y: yB }, { x: mergeX, y: yB }, { x: mergeX, y: centreY }]),
    line([{ x: mergeX, y: centreY }, { x: Math.max(endX, mergeX), y: centreY }, { x: output.left, y: midY(output) }]),
  ].join(" ");
}
