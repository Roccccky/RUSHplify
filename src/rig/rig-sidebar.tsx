import { ChevronDown, ChevronRight, Pencil, Search, Star, Zap } from "lucide-react";
import { BlockPicture } from "../components/rp/block-picture";
import { inspiredByLabel } from "../domain/block-inspiration";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { Input } from "../components/ui";
import type { Rig, RigBlock } from "../domain/types";
import { BLOCK_CATEGORY_COLORS, BLOCK_CATEGORY_GROUPS, blockBelongsToCategoryGroup, categoryGroupForBlock, type BlockCategoryGroupId } from "../domain/block-categories";
import { isNamModule, parseNamModule } from "../domain/nam";
import { deviceApi } from "../services/device-api";
import { deviceErrorMessage } from "../services/device-errors";
import { cn } from "../lib/utils";
import { NameField } from "../components/rp/name-field";
import { useRigNameSuggestion } from "./use-rig-name-suggestion";
import { CATEGORY_ICON, DEMO_BLOCK_TYPES, blockChoicesFromModuleTypes, type BlockChoice } from "./block-catalogue";

/** Left column of RIG: what I play. Setlist or all rigs; a click loads the rig. */
export function RigList() {
  const store = useAppStore();
  const [query, setQuery] = useState("");
  const [listId, setListId] = useState("");
  const live = store.liveSnapshot;
  const library = live?.rigLibrary ?? store.rigs.map((rig) => ({ id: rig.id, name: rig.name, color: rig.color, loaded: rig.id === store.selectedRigId }));
  const setlist = store.setlists.find((list) => list.id === listId);
  const rows = (setlist ? setlist.items.map((item) => { const match = library.find((rig) => rig.id === item.rigId || rig.name === item.title); return { key: item.id, id: match?.id ?? item.rigId, srId: (match as { srId?: string } | undefined)?.srId, name: match?.name ?? item.title, color: match?.color ?? "var(--rp-off)", loaded: Boolean(match?.loaded) }; }) : library.map((rig) => ({ key: rig.id, id: rig.id, srId: (rig as { srId?: string }).srId, name: rig.name, color: rig.color, loaded: rig.loaded })))
    .filter((row) => row.name.toLowerCase().includes(query.toLowerCase()));
  const open = (row: typeof rows[number]) => { if (!row.id || row.loaded) return; if (live) void store.loadRig(row.id, row.srId); else store.selectRig(row.id); };
  // Rename in place: the pencil on a row (or F2); double-click on the loaded row. Suggestions only for the loaded rig.
  const [naming, setNaming] = useState<string | null>(null);
  const names = library.map((rig) => rig.name);
  const suggest = useRigNameSuggestion(library.find((rig) => rig.loaded)?.name ?? "");

  return <aside className="rp-side" aria-label="Rigs"><div className="rp-side__body">
    <label className="rp-side__select"><select aria-label="Setlist" value={setlist ? listId : ""} onChange={(event) => { setListId(event.target.value); if (event.target.value) store.selectSetlist(event.target.value); }}><option value="">All rigs</option>{store.setlists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><ChevronDown size={14}/></label>
    <label className="rp-search"><Search size={13}/><Input aria-label="Search rigs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search"/></label>
    <ol className="rp-rig-list">{rows.map((row) => <li key={row.key}>{naming === row.key
      ? <div className="rp-rig-list__naming"><i style={{ background: row.color }}/><NameField label="Rig name" value={row.name} taken={names.filter((name) => name !== row.name)} suggest={row.loaded ? suggest : undefined} onCancel={() => setNaming(null)} onSubmit={async (name) => { await store.renameRig(row.id, name); setNaming(null); }}/></div>
      : <><button className={cn(row.loaded && "on")} aria-current={row.loaded || undefined} onClick={() => open(row)} onDoubleClick={row.loaded && row.id ? () => setNaming(row.key) : undefined} onKeyDown={row.id ? (event) => { if (event.key === "F2") { event.preventDefault(); setNaming(row.key); } } : undefined}><i style={{ background: row.color }}/><span>{row.name}</span></button>
        {row.id && <button type="button" className="rp-rig-list__edit" aria-label={`Rename ${row.name}`} title="Rename (F2)" onClick={() => setNaming(row.key)}><Pencil size={13}/></button>}</>}</li>)}</ol>
  </div></aside>;
}

type Category = "favorites" | BlockCategoryGroupId;

/** Right column of RIG, BLOCKS tab: categories (NAM first after Amp), models with presets. Follows the selected slot. */
export function BlockBrowser({ rig, slot, onPicked }: { rig: Rig; slot: number | null; onPicked: (slot: number) => void }) {
  const store = useAppStore();
  const reflected = (store.liveSubtree?.["/Evil/API/Blocks"]?.value?.ModuleTypes ?? []) as unknown[];
  const moduleTypes = reflected.length || deviceApi.isNative() ? reflected : DEMO_BLOCK_TYPES;
  const all = useMemo(() => blockChoicesFromModuleTypes(moduleTypes), [moduleTypes]);
  const current: RigBlock | undefined = slot === null ? undefined : rig.blocks.find((block) => block.slot === slot && !block.empty);
  const initialGroup = current ? categoryGroupForBlock(current.name, current.category)?.id : undefined;
  const [category, setCategory] = useState<Category>(initialGroup ?? "amp");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(current?.name ?? null);
  const [presets, setPresets] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (initialGroup) setCategory(initialGroup); setExpanded(current?.name ?? null); }, [slot, current?.name]);
  useEffect(() => { if (!expanded || presets[expanded]) return; let disposed = false; void deviceApi.blockPresets(expanded).then((items) => { if (!disposed) setPresets((map) => ({ ...map, [expanded]: items })); }).catch(() => undefined); return () => { disposed = true; }; }, [expanded]);

  const favorites = store.favoriteBlockNames;
  const usedNam = new Set(rig.blocks.filter((block) => !block.empty && block.slot !== slot && isNamModule(block.model)).map((block) => parseNamModule(block.model)?.instance));
  const visible = all.filter((block) => (query ? true : category === "favorites" ? favorites.includes(block.name) : blockBelongsToCategoryGroup(block.name, category)) && block.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const pick = async (choice: BlockChoice, preset?: string) => {
    if (slot === null) return;
    setBusy(true); setError(null);
    try {
      if (current?.name !== choice.name) await store.addBlock({ ...choice, id: `slot-${slot + 1}`, slot, enabled: true, empty: false, parameters: [] });
      if (preset !== undefined) await store.loadBlockPreset(`slot-${slot + 1}`, preset);
      onPicked(slot);
    } catch (failure) { setError(deviceErrorMessage(failure)); } finally { setBusy(false); }
  };

  return <div className="rp-side__body rp-blocks">
    <label className="rp-search"><Search size={13}/><Input aria-label="Search blocks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search"/></label>
    <div className="rp-blocks__cols">
      <nav className="rp-blocks__cats" aria-label="Block categories">
        <button className={cn(category === "favorites" && !query && "on")} onClick={() => { setCategory("favorites"); setQuery(""); }}><Star size={11}/> Favorites</button>
        {BLOCK_CATEGORY_GROUPS.map((group) => <button key={group.id} className={cn(category === group.id && !query && "on")} style={{ "--category-color": BLOCK_CATEGORY_COLORS[group.categories[0]] } as React.CSSProperties} onClick={() => { setCategory(group.id); setQuery(""); }}>{group.label}</button>)}
      </nav>
      <ul className="rp-models" aria-label="Models">
        {slot === null && <li className="rp-models__hint" aria-hidden="true"><Zap size={16}/></li>}
        {error && <li className="rp-models__error" role="alert">{error}</li>}
        {visible.map((block) => { const open = expanded === block.name; const taken = isNamModule(block.name) && usedNam.has(parseNamModule(block.name)?.instance); const list = presets[block.name]; const isCurrent = current?.name === block.name; const favorite = favorites.includes(block.name);
          return <li key={block.moduleTypeId} className={cn(open && "open", isCurrent && "current")} style={{ "--block-color": block.color } as React.CSSProperties}>
            <div className="rp-model">
              <button className="rp-model__name" disabled={busy || slot === null || taken} title={taken ? "This NAM host is already in the chain" : undefined} onClick={() => void pick(block)}><span className="rp-model__pic"><BlockPicture name={block.name} size={34}/></span><span className="rp-model__text"><span>{block.name}</span>{inspiredByLabel(block.name) && <small>{inspiredByLabel(block.name)}</small>}</span></button>
              <button className={cn("rp-model__fav", favorite && "on")} aria-label={`${favorite ? "Remove" : "Add"} ${block.name} ${favorite ? "from" : "to"} favorites`} onClick={() => store.toggleFavoriteBlock(block.name)}><Star size={11} fill={favorite ? "currentColor" : "none"}/></button>
              <button className="rp-model__more" aria-label={`${open ? "Hide" : "Show"} presets for ${block.name}`} aria-expanded={open} onClick={() => setExpanded(open ? null : block.name)}><ChevronRight size={13}/></button>
            </div>
            {open && <ul className="rp-presets" aria-label={`${block.name} presets`}>
              <li><button disabled={busy || slot === null || taken} className={cn(isCurrent && !current?.presetName && "on")} onClick={() => void pick(block, "")}>Default</button></li>
              {(list ?? []).map((preset) => <li key={preset}><button disabled={busy || slot === null || taken} className={cn(isCurrent && current?.presetName === preset && "on")} onClick={() => void pick(block, preset)}>{preset}</button></li>)}
            </ul>}
          </li>; })}
      </ul>
    </div>
  </div>;
}
