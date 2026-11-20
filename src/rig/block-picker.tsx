import { blockColour } from "../domain/block-inspiration";
import { ChevronLeft, Search, Star, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Rig } from "../domain/types";
import { BLOCK_CATEGORY_COLORS, BLOCK_CATEGORY_GROUPS, blockBelongsToCategoryGroup } from "../domain/block-categories";
import { inspiredBy, inspiredByLabel } from "../domain/block-inspiration";
import { isNamModule, parseNamModule } from "../domain/nam";
import { deviceApi } from "../services/device-api";
import { deviceErrorMessage } from "../services/device-errors";
import { useAppStore } from "../stores/app-store";
import { BlockPicture } from "../components/rp/block-picture";
import { inkFor } from "../components/rp/controls";
import { cn } from "../lib/utils";
import { CATEGORY_ICON, DEMO_BLOCK_TYPES, blockChoicesFromModuleTypes, type BlockChoice } from "./block-catalogue";

const WIDTH = 340;
type GroupId = (typeof BLOCK_CATEGORY_GROUPS)[number]["id"];

/** Pop-up over an empty slot's +: category → model (with the original it is inspired by) → into the slot. */
export function BlockPicker({ rig, slot, anchor, onClose, onPicked }: { rig: Rig; slot: number; anchor: DOMRect; onClose: () => void; onPicked: (slot: number) => void }) {
  const store = useAppStore();
  const reflected = (store.liveSubtree?.["/Evil/API/Blocks"]?.value?.ModuleTypes ?? []) as unknown[];
  const moduleTypes = reflected.length || deviceApi.isNative() ? reflected : DEMO_BLOCK_TYPES;
  const all = useMemo(() => blockChoicesFromModuleTypes(moduleTypes), [moduleTypes]);
  const [group, setGroup] = useState<GroupId | "favorites" | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: anchor.left, top: anchor.bottom + 8 });

  useLayoutEffect(() => {
    const height = box.current?.offsetHeight ?? 360;
    const left = Math.max(8, Math.min(window.innerWidth - WIDTH - 8, anchor.left + anchor.width / 2 - WIDTH / 2));
    const below = anchor.bottom + 8; const top = below + height > window.innerHeight - 8 ? Math.max(8, anchor.top - height - 8) : below;
    setPosition({ left, top });
  }, [anchor, group, query]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); if (group && !query) setGroup(null); else onClose(); } };
    const onDown = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) onClose(); };
    window.addEventListener("keydown", onKey); window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown, true); };
  }, [group, query, onClose]);

  const usedNam = new Set(rig.blocks.filter((block) => !block.empty && block.slot !== slot && isNamModule(block.model)).map((block) => parseNamModule(block.model)?.instance));
  const groups = BLOCK_CATEGORY_GROUPS.filter((candidate) => all.some((choice) => blockBelongsToCategoryGroup(choice.name, candidate.id)));
  const needle = query.trim().toLowerCase();
  const models = needle
    ? all.filter((choice) => `${choice.name} ${inspiredBy(choice.name) ?? ""}`.toLowerCase().includes(needle))
    : group === "favorites" ? all.filter((choice) => store.favoriteBlockNames.includes(choice.name))
    : group ? all.filter((choice) => blockBelongsToCategoryGroup(choice.name, group as GroupId)) : [];
  // One NAM entry: the first host that is still free (both taken → the first, shown disabled).
  const namHosts = models.filter((choice) => isNamModule(choice.name));
  const namPick = namHosts.find((choice) => !usedNam.has(parseNamModule(choice.name)?.instance)) ?? namHosts[0];
  const sorted = models.filter((choice) => !isNamModule(choice.name) || choice === namPick).sort((left, right) => left.name.localeCompare(right.name));
  const current = BLOCK_CATEGORY_GROUPS.find((candidate) => candidate.id === group);

  const pick = async (choice: BlockChoice) => {
    setBusy(true); setError(null);
    try { await store.addBlock({ ...choice, id: `slot-${slot + 1}`, slot, enabled: true, empty: false, parameters: [] }); onPicked(slot); onClose(); }
    catch (failure) { setError(deviceErrorMessage(failure)); }
    finally { setBusy(false); }
  };

  return createPortal(<div ref={box} className="rp-picker" role="dialog" aria-label={`Add block to slot ${slot + 1}`} style={{ left: position.left, top: position.top, width: WIDTH }}>
    <header className="rp-picker__head">
      {(group || needle) ? <button type="button" className="rp-ibtn rp-ibtn--sm" aria-label="Back to categories" onClick={() => { setGroup(null); setQuery(""); }}><ChevronLeft size={14}/></button> : <span className="rp-picker__slot">{slot + 1}</span>}
      <label className="rp-picker__search"><Search size={13}/><input autoFocus aria-label="Search blocks" value={query} placeholder={current?.label ?? "Search…"} onChange={(event) => setQuery(event.target.value)}/></label>
    </header>
    {error && <p className="rp-pcard__error" role="alert">{error}</p>}
    {!group && !needle
      ? <div className="rp-picker__cats" role="list">
        {store.favoriteBlockNames.length > 0 && <button type="button" role="listitem" className="rp-picker__cat" style={{ "--cat": "var(--rp-m4)" } as React.CSSProperties} onClick={() => setGroup("favorites")}><Star size={15}/><span>Favorites</span></button>}
        {groups.map((candidate) => { const colour = BLOCK_CATEGORY_COLORS[candidate.categories[0]]; const Icon = CATEGORY_ICON[candidate.categories[0]] ?? Zap;
          return <button key={candidate.id} type="button" role="listitem" className="rp-picker__cat" data-fg={inkFor(colour)} style={{ "--cat": colour } as React.CSSProperties} onClick={() => setGroup(candidate.id)}><Icon size={15}/><span>{candidate.label}</span></button>; })}
      </div>
      : <ul className="rp-picker__models" aria-label="Models">
        {sorted.map((choice) => { const taken = isNamModule(choice.name) && usedNam.has(parseNamModule(choice.name)?.instance); const by = inspiredByLabel(choice.name);
          return <li key={choice.moduleTypeId}><button type="button" className={cn("rp-picker__model")} disabled={busy || taken} onClick={() => void pick(choice)} style={{ "--cat": blockColour(choice.name, choice.category) } as React.CSSProperties}>
            <BlockPicture name={choice.name} size={36}/>
            <span className="rp-picker__text"><strong>{choice.name}</strong>{by && <small>{by}</small>}</span>
          </button></li>; })}
        {!sorted.length && <li className="rp-picker__none" aria-hidden="true"><Zap size={14}/></li>}
      </ul>}
  </div>, document.body);
}
