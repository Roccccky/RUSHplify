import { blockColour } from "../domain/block-inspiration";
import { Cable, Plus, Redo2, RotateCcw, Trash2, Undo2, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chainRouting, useAppStore } from "../stores/app-store";
import { IconButton } from "../components/ui";
import { RailToggle, Segment, Sep, inkFor } from "../components/rp/controls";
import { SlotDragPreview } from "../components/system/slot-drag-preview";
import type { Rig, RigBlock } from "../domain/types";
import { BLOCK_CATEGORY_COLORS } from "../domain/block-categories";
import { useSlotPointerDrag } from "../hooks/use-slot-pointer-drag";
import { cn } from "../lib/utils";
import { chainSlots } from "./block-catalogue";
import { ROUTING_NAMES, cablePath, chainLayout, mixAvailableForRouting, type Box, type ChainLayout } from "./chain-layout";
import { BlockInspector, FOOTSWITCH, NODE_PATH, SHOW_TONE_LIST, NodeInspector, PedalInspector, SwitchInspector, numeric, type RoutingNode } from "./inspector";
import { sceneChanges } from "./scene-editor";
import { AssignStrip } from "./assign-strip";
import { BlockBrowser, RigList } from "./rig-sidebar";
import { BlockPicker } from "./block-picker";
import { IrBrowser, SHOW_CLOUD, ToneBrowser, ToneCard, takeCloudRequest, useToneBench } from "./tone-bench";
import { isNamBlock } from "../domain/nam";
import { BlockArt } from "../components/rp/block-art";
import "../styles/rp-chain.css";

type Selection = { kind: "block" } | { kind: "node"; node: RoutingNode } | { kind: "empty"; slot: number } | { kind: "switch"; number: number } | { kind: "pedal"; pedal: 1 | 2 };

/** Right column tabs: BLOCKS, TONES (TONE3000; IR files for an IR slot), CLOUD (HeadRush Cloud). */
type Panel = "blocks" | "tones" | "cloud";

/** RIG: left what I play (rigs), centre the chain with the card of the selection and the pedal row,
 *  right what I put in (blocks, TONE3000). Same columns in every room. */
export function ChainPage() {
  const rig = useAppStore((store) => store.liveSnapshot?.rig ?? store.rigs.find((item) => item.id === store.selectedRigId) ?? store.rigs[0]);
  if (!rig) return <div className="rp-rig rp-rig--empty" aria-hidden="true"><span className="skeleton"/></div>;
  return <RigWorkspace rig={rig}/>;
}

function RigWorkspace({ rig }: { rig: Rig }) {
  const store = useAppStore();
  const slots = chainSlots(rig.blocks);
  const routingState = chainRouting(store);
  const routing = routingState.id;
  const layout = chainLayout(routing);
  const [selection, setSelection] = useState<Selection>({ kind: "block" });
  const [picker, setPicker] = useState<{ slot: number; anchor: DOMRect } | null>(null);
  // "tone-cloud" (old TONES room, context menu, dashboard) opens RIG with the tone browser.
  const [panel, setPanel] = useState<Panel>(store.page === "tone-cloud" ? "tones" : "blocks");
  useEffect(() => { if (store.page === "tone-cloud") setPanel("tones"); }, [store.page]);
  useEffect(() => { const show = () => setPanel("tones"); window.addEventListener(SHOW_TONE_LIST, show); return () => window.removeEventListener(SHOW_TONE_LIST, show); }, []);
  const footswitch = store.liveSubtree?.[FOOTSWITCH]?.value ?? {};
  // A selected scene switch marks in the chain what it turns on or off.
  const sceneMarks = selection.kind === "switch" && numeric(footswitch[`ModeNew${selection.number}`]) === 2 ? sceneChanges(footswitch, selection.number) : undefined;
  const selected = selection.kind === "block" ? slots.find((block) => block.id === store.selectedBlockId && !block.empty) ?? null : null;
  // A NAM slot takes TONE3000 captures, an IR slot takes IR files: the right column follows the slot.
  const namTarget = selected && isNamBlock(selected) ? selected : null;
  const irTarget = selected?.category === "ir" ? selected : null;
  const bench = useToneBench(panel !== "blocks", panel === "cloud" ? null : namTarget);
  // The tab decides the source: TONES = TONE3000, CLOUD = HeadRush Cloud.
  useEffect(() => { if (panel !== "blocks") bench.setSource(panel === "cloud" ? "HeadRush Cloud" : "Tone3000"); }, [panel]);
  // Header cloud icon: TONES on HeadRush Cloud, nothing targeted.
  useEffect(() => {
    const showCloud = () => { if (takeCloudRequest()) setPanel("cloud"); };
    showCloud(); window.addEventListener(SHOW_CLOUD, showCloud); return () => window.removeEventListener(SHOW_CLOUD, showCloud);
  }, []);
  // A cloud / TONE3000 audition runs on a demo rig of the pedal: the chain shows it read-only, marked PREVIEW.
  const previewTone = store.auditioningToneId ? store.testRigReturn?.audition?.tone ?? store.tones.find((tone) => tone.id === store.auditioningToneId) ?? null : null;
  const history = store.rigHistory[rig.id] ?? []; const latest = history[0];
  const targetSlot = selection.kind === "empty" ? selection.slot : selected?.slot ?? null;

  const selectBlock = (block: RigBlock) => { store.selectBlock(block.id); setSelection({ kind: "block" }); setPanel(isNamBlock(block) || block.category === "ir" ? "tones" : "blocks"); };
  const select = (next: Selection) => { store.selectBlock(null); setSelection(next); setPanel("blocks"); };
  const selectEmpty = (slot: number) => {
    select({ kind: "empty", slot });
    const tile = document.querySelector(`[data-chain-slot="${slot}"] .rp-tile`);
    if (tile) setPicker({ slot, anchor: tile.getBoundingClientRect() });
  };
  const changeRouting = (next: number) => { if (!mixAvailableForRouting(next) && selection.kind === "node" && selection.node === "mix") setSelection({ kind: "block" }); void store.updateRouting({ Routing: next }); };
  const onPicked = (slot: number) => { store.selectBlock(`slot-${slot + 1}`); setSelection({ kind: "block" }); };

  return <div className="rp-rig">
    <RigList/>
    <main className="rp-rig__centre">
      <section className={cn("rp-zone rp-zone--chain", previewTone && "rp-zone--preview")} aria-label="Chain">
        {previewTone && <div className="rp-preview" role="status">
          <i className="rp-dot on" aria-hidden="true"/><b>PREVIEW</b><span>{previewTone.title}</span>
          <span className="rp-grow"/>
          <button type="button" className="rp-btn" disabled={store.auditionBusy} onClick={() => void store.stopAudition().then(() => store.refreshPage("editor", "manual")).catch(() => undefined)}><RotateCcw size={14} aria-hidden="true"/>MY RIG</button>
        </div>}
        <header className="rp-chain-head" aria-label="Rig routing" inert={previewTone ? true : undefined}>
          <RoutingPicker value={routing} onChange={changeRouting}/>
          <span className="rp-chain-head__name">{ROUTING_NAMES[routing]?.toUpperCase()}</span>
          <span className="rp-grow"/>
          {layout.split && <PathReadout mix={store.liveSubtree?.[NODE_PATH.mix]?.value} chain={store.liveSubtree?.["/Evil/Engine/Patch/Chain"]?.value}/>}
          {layout.split && <button className={cn("rp-chip", selection.kind === "node" && selection.node === "mix" && "on")} onClick={() => select(selection.kind === "node" && selection.node === "mix" ? { kind: "block" } : { kind: "node", node: "mix" })}>MIX</button>}
          <RailToggle label="Effect tails" text="TAIL" on={routingState.tails} onChange={(next) => void store.updateRouting({ Tails: next })}/>
          <RailToggle label="Stereo" text="STEREO" on={routingState.stereo} onChange={(next) => void store.updateRouting({ RigIsStereo: next })}/>
          <Sep/>
          <IconButton disabled={!latest} label="Undo last edit" onClick={() => latest && void store.restoreHistory(latest.id, "before")}><Undo2 size={16}/></IconButton>
          <IconButton disabled={!latest} label="Redo last edit" onClick={() => latest && void store.restoreHistory(latest.id, "after")}><Redo2 size={16}/></IconButton>
        </header>
        <div className="rp-zone__chain" inert={previewTone ? true : undefined}><ChainCanvas stereo={routingState.stereo} activePath={layout.split ? pathState(store.liveSubtree?.[NODE_PATH.mix]?.value)?.path : undefined} layout={layout} slots={slots} selectedBlockId={selection.kind === "block" && (panel === "blocks" || ((namTarget || irTarget) && panel === "tones")) ? store.selectedBlockId : null} emptySlot={selection.kind === "empty" && panel === "blocks" ? selection.slot : null} node={selection.kind === "node" ? selection.node : null} scene={sceneMarks}
          onSelect={selectBlock} onEmpty={selectEmpty} onNode={(node) => select(selection.kind === "node" && selection.node === node ? { kind: "block" } : { kind: "node", node })} onMove={(from, to) => { const block = slots[from]; if (to < 0) { if (block && !block.empty) void store.removeBlock(block.id); } else void store.moveBlock(from, to); }}/></div>
      </section>
      <aside className="rp-zone rp-zone--card rp-rig__stage" aria-label="Inspector">
        {panel === "cloud" || (panel === "tones" && !namTarget && !irTarget) ? <ToneCard bench={bench} namSlots={slots.filter((block) => !block.empty && isNamBlock(block))} onLoad={(block) => { select({ kind: "block" }); store.selectBlock(block.id); }}/> : <>
          {selection.kind === "block" && (selected ? <BlockInspector key={selected.id} block={selected}/> : <Idle/>)}
          {store.slotError && (namTarget || irTarget) && <p className="rp-pcard__error" role="status">{store.slotError}</p>}
          {selection.kind === "empty" && <Idle add/>}
          {selection.kind === "node" && <NodeInspector node={selection.node} object={store.liveSubtree?.[NODE_PATH[selection.node]]}/>}
          {selection.kind === "switch" && <SwitchInspector key={selection.number} number={selection.number}/>}
          {selection.kind === "pedal" && <PedalInspector key={selection.pedal} pedal={selection.pedal}/>}
        </>}
      </aside>
      <AssignStrip selectedSwitch={selection.kind === "switch" ? selection.number : null} selectedPedal={selection.kind === "pedal" ? selection.pedal : null} onSwitch={(number) => select({ kind: "switch", number })} onPedal={(pedal) => select({ kind: "pedal", pedal })}/>
    </main>
    {picker && <BlockPicker rig={rig} slot={picker.slot} anchor={picker.anchor} onClose={() => setPicker(null)} onPicked={onPicked}/>}
    <aside className="rp-ingr" aria-label="Browser">
      <Segment label="Browser" value={panel} options={[{ value: "blocks", text: "BLOCKS", mark: <><TabMark d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M9 8.5a1.5 1.5 0 1 0 0 .01 M15 8.5a1.5 1.5 0 1 0 0 .01 M12 17.5a2 2 0 1 0 0 .01"/>BLOCKS</> }, { value: "tones", text: irTarget ? "IR" : "TONES", mark: irTarget ? undefined : <img src="/brands/tone3000.svg" alt="" height={11}/> }, { value: "cloud", text: "CLOUD", mark: <><TabMark d="M7 18a4 4 0 0 1 .8-7.9 5.5 5.5 0 0 1 10.6 1.4A3.5 3.5 0 0 1 17.5 18z"/>CLOUD</> }]} onChange={setPanel}/>
      {panel === "blocks" ? <BlockBrowser rig={rig} slot={targetSlot} onPicked={onPicked}/> : panel === "tones" && irTarget ? <IrBrowser key={irTarget.id} block={irTarget}/> : <ToneBrowser bench={bench}/>}
    </aside>
  </div>;
}

function Idle({ add = false }: { add?: boolean }) {
  return <div className="rp-insp__empty" aria-hidden="true">{add ? <Plus size={18}/> : <Zap size={18}/>}</div>;
}

const serial = (x: number) => [{ x, y: .5 }];
const branch = (x: number) => [{ x, y: 0 }, { x, y: 1 }];
/** Cells per routing: serial blocks sit centred, parallel paths stack. */
const ROUTING_PICTOGRAMS: Array<Array<{ x: number; y: number }>> = [
  [0, 1, 2, 3].flatMap(branch),
  [...serial(0), ...branch(1), ...branch(2), ...serial(3)],
  [...serial(0), ...serial(1), ...branch(2), ...branch(3), ...serial(4)],
  [...serial(0), ...serial(1), ...branch(2), ...serial(3)],
  [...branch(0), ...branch(1), ...serial(2), ...serial(3)],
];

/** Five routing pictograms ("Tetris" blocks), like the pedal's Signal Path picker, at the top of the chain zone. */
function RoutingPicker({ value, onChange }: { value: number; onChange: (routing: number) => void }) {
  return <div className="rp-routing" role="radiogroup" aria-label="Routing">{ROUTING_NAMES.map((name, index) => {
    const cells = ROUTING_PICTOGRAMS[index];
    const width = Math.max(...cells.map((cell) => cell.x)) + 1;
    return <button key={name} role="radio" aria-checked={value === index} aria-label={name} title={name} className={cn(value === index && "on")} onClick={() => onChange(index)}>
      <svg viewBox={`0 0 ${width * 10 - 2} 18`} width={width * 10 - 2} height={18} aria-hidden="true">{cells.map((cell, cellIndex) => <rect key={cellIndex} x={cell.x * 10} y={cell.y * 10} width={8} height={8} rx={1.5}/>)}</svg>
    </button>;
  })}</div>;
}

/** Small line sign in front of a browser tab name (own drawings, no brand logos). */
const TabMark = ({ d }: { d: string }) => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;

function ChainCanvas({ stereo, activePath, layout, slots, selectedBlockId, emptySlot, node, scene, onSelect, onEmpty, onNode, onMove }: { stereo: boolean; activePath?: "A" | "B" | "A+B"; layout: ChainLayout; scene?: Record<number, 1 | 2>; slots: RigBlock[]; selectedBlockId: string | null; emptySlot: number | null; node: RoutingNode | null; onSelect: (block: RigBlock) => void; onEmpty: (slot: number) => void; onNode: (node: RoutingNode) => void; onMove: (from: number, to: number) => void }) {
  const drag = useSlotPointerDrag<number>(onMove);
  const dragged = drag.dragSource === null ? null : slots[drag.dragSource];
  const canvas = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = canvas.current; if (!element) return;
    const measure = () => {
      const origin = element.getBoundingClientRect();
      const box = (target: Element | null): Box => { const rect = target?.getBoundingClientRect(); return rect ? { left: rect.left - origin.left, top: rect.top - origin.top, right: rect.right - origin.left, bottom: rect.bottom - origin.top } : { left: 0, top: 0, right: 0, bottom: 0 }; };
      const tiles = [...element.querySelectorAll("[data-chain-slot] .rp-tile")].map(box);
      setSize({ width: origin.width, height: origin.height });
      setPath(origin.width ? cablePath(layout, box(element.querySelector(".rp-io--in")), box(element.querySelector(".rp-io--out")), tiles) : "");
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [layout.routing, slots.map((slot) => `${slot.id}:${slot.category}`).join("|")]);

  // While a block is dragged the rest of the centre greys out and a trash target sits in its middle.
  const [centre, setCentre] = useState<HTMLElement | null>(null);
  useEffect(() => setCentre(canvas.current?.closest<HTMLElement>(".rp-rig__centre") ?? null), []);
  const removing = Boolean(dragged && !dragged.empty);
  useEffect(() => { if (!centre) return; centre.toggleAttribute("data-dragging", removing); return () => centre.removeAttribute("data-dragging"); }, [centre, removing]);
  const ioRow = (row: number | null) => row === null ? "1 / span 2" : String(row);
  return <div className={cn("rp-chain", layout.split ? "rp-chain--split" : "rp-chain--straight")} data-path={activePath} ref={canvas} style={{ "--rp-chain-cols": layout.columns } as React.CSSProperties}>
    <svg className="rp-chain__cable" width={size.width} height={size.height} aria-hidden="true"><path d={path}/></svg>
    <button className={cn("rp-io rp-io--in", node === "input" && "on")} style={{ gridColumn: 1, gridRow: ioRow(layout.inRow) }} onClick={() => onNode("input")} aria-label="Input"><Cable size={15}/><span className="rp-io__name">IN</span></button>
    {layout.slots.map((placement) => {
      const block = slots[placement.slot];
      return <div key={block.id} data-chain-slot={placement.slot} data-lane={placement.lane} className={cn("chain-item rp-slot", placement.rowSpan === 2 && "rp-slot--span", drag.dragSource !== null && drag.dragSource !== placement.slot && "drop-ready", drag.dragTarget === placement.slot && "drop-target", drag.dragSource === placement.slot && "drag-source")} style={{ gridColumn: placement.column, gridRow: placement.rowSpan === 2 ? `${placement.row} / span 2` : String(placement.row) }}>
        <Tile block={block} index={placement.slot} scene={scene?.[placement.slot]} selected={block.empty ? emptySlot === placement.slot : selectedBlockId === block.id} onSelect={() => { if (drag.consumeClick()) return; if (block.empty) onEmpty(placement.slot); else onSelect(block); }} onPointerDown={(event) => drag.onPointerDown(event, placement.slot, block.empty)} onKeyboardMove={(direction) => { const target = Math.max(0, Math.min(13, placement.slot + direction)); if (target !== placement.slot) onMove(placement.slot, target); }}/>
      </div>;
    })}
    <button className={cn("rp-io rp-io--out", node === "output" && "on")} style={{ gridColumn: layout.columns + 2, gridRow: ioRow(layout.outRow) }} onClick={() => onNode("output")} aria-label="Output" data-channels={stereo ? "stereo" : "mono"}><ChannelMark stereo={stereo}/><span className="rp-io__name">OUT</span></button>
    {dragged && !dragged.empty && centre && createPortal(<div className={cn("rp-trash", drag.dragTarget === -1 && "on")} data-chain-slot={-1} aria-label="Drop here to remove"><Trash2 size={28}/></div>, centre)}
    <SlotDragPreview position={drag.pointerPosition} targetSlot={drag.dragTarget} label={dragged?.name} detail={dragged?.presetName || dragged?.model} color={dragged ? blockColour(dragged.name, dragged.category) : undefined}/>
  </div>;
}

/** Mono = one circle, stereo = two overlapping circles (like the pedal's output sign). */
function ChannelMark({ stereo }: { stereo: boolean }) {
  return <svg className="rp-io__chan" width={18} height={10} viewBox="0 0 18 10" aria-hidden="true">
    {stereo ? <><circle cx={6} cy={5} r={4}/><circle cx={12} cy={5} r={4}/></> : <circle cx={9} cy={5} r={4}/>}
  </svg>;
}

function Tile({ block, index, scene, selected, onSelect, onPointerDown, onKeyboardMove }: { block: RigBlock; index: number; scene?: 1 | 2; selected: boolean; onSelect: () => void; onPointerDown: (event: React.PointerEvent<HTMLElement>) => void; onKeyboardMove: (direction: -1 | 1) => void }) {
  if (block.empty) return <button className="rp-ptile rp-ptile--add rp-tile block-node block-node--empty" data-selected={selected} onClick={onSelect} aria-label={`Empty slot ${index + 1}`}><span className="rp-ptile__mark"><Plus size={16}/></span><span className="rp-ptile__name">{index + 1}</span></button>;
  const colour = blockColour(block.name, block.category);
  return <button aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Delete" aria-label={`${block.name}, slot ${index + 1}. Drag to move.`} aria-pressed={selected}
    className="rp-ptile rp-tile block-node" data-selected={selected} data-enabled={block.enabled} data-fg={inkFor(colour)} title={block.presetName ? `${block.name} · ${block.presetName}` : block.name}
    style={{ "--tile-colour": colour } as React.CSSProperties}
    onPointerDown={onPointerDown} onClick={onSelect}
    onKeyDown={(event) => { if ((event.key === "Delete" || event.key === "Backspace") && !event.altKey) { event.preventDefault(); void useAppStore.getState().removeBlock(block.id); return; } if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); onKeyboardMove(event.key === "ArrowLeft" ? -1 : 1); }}>
    <span className="rp-ptile__mark"><BlockArt name={block.name} category={block.category} size={36}/></span>
    <span className="rp-ptile__name">{tileName(block.name)}</span>
    {scene && <span className="rp-ptile__scene" data-scene={scene === 1 ? "on" : "off"}>{scene === 1 ? "ON" : "OFF"}</span>}
  </button>;
}

/** Which path of a split plays: the Mix crossfade (0 = A, 1 = B, between = both) and the doubling switch.
 *  A footswitch on Signal Chain (Path Mix, Doubling) moves these; nothing is shown without a pedal. */
export function pathState(mix?: Record<string, unknown>, chain?: Record<string, unknown>): { path: "A" | "B" | "A+B"; doubling: boolean } | null {
  const fade = mix?.ParaXFade;
  if (typeof fade !== "number") return null;
  return { path: fade <= 0.02 ? "A" : fade >= 0.98 ? "B" : "A+B", doubling: chain?.DoubleSwitch === true };
}
function PathReadout({ mix, chain }: { mix?: Record<string, unknown>; chain?: Record<string, unknown> }) {
  const state = pathState(mix, chain);
  if (!state) return null;
  return <span className="rp-path" aria-label={`Path ${state.path}${state.doubling ? ", doubling B" : ""}`}><small>PATH</small><b>{state.path}</b>{chain && "DoubleSwitch" in chain && <i data-on={state.doubling}>X2 {state.doubling ? "B" : "A"}</i>}</span>;
}

/** Chain tiles are 60 px wide: the long NAM host name becomes NAM (NAM 2 for the second host). */
const tileName = (name: string) => name.replace(/^Neural Amp Modeler/i, "NAM");
