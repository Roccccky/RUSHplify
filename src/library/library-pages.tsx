import { ArrowDownAZ, Copy, GripVertical, Palette, Pencil, Play, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { IconButton, Input } from "../components/ui";
import { useSlotPointerDrag } from "../hooks/use-slot-pointer-drag";
import { cn } from "../lib/utils";
import { EditableName, NameField } from "../components/rp/name-field";
import { ConfirmButton } from "../components/rp/confirm-button";
import { useRigNameSuggestion } from "../rig/use-rig-name-suggestion";
import { Segment } from "../components/rp/controls";
import { RIG_SORTS, TONE_FAMILIES, sortRigs, toneFamily, type RigSort, type ToneFamily } from "./rig-sort";
import "../styles/rp-library.css";
export { BackupPage } from "./backup-page";
export { FilesPage } from "./files-page";

const SORT_KEY = "rushplify-rig-sort";
const savedSort = (): RigSort => { try { const value = localStorage.getItem(SORT_KEY); if (RIG_SORTS.some((sort) => sort.value === value)) return value as RigSort; } catch { /* convenience only */ } return "pedal"; };

/** Sort (pedal order, A–Z, colour from clean to heavy, tempo) and filter by tone family, shared by both rig lists. */
function useRigSort<T extends { name: string; color: string; tempo?: number }>(rigs: T[], query: string) {
  const [sort, setSortState] = useState<RigSort>(savedSort);
  const [families, setFamilies] = useState<ToneFamily[]>([]);
  const setSort = (next: RigSort) => { setSortState(next); try { localStorage.setItem(SORT_KEY, next); } catch { /* convenience only */ } };
  const toggle = (family: ToneFamily) => setFamilies((current) => current.includes(family) ? current.filter((item) => item !== family) : [...current, family]);
  const present = new Set(rigs.map((rig) => toneFamily(rig.color)));
  const rows = sortRigs(rigs.filter((rig) => rig.name.toLowerCase().includes(query.toLowerCase()) && (!families.length || families.includes(toneFamily(rig.color)))), sort);
  const bar = <div className="rp-lib__sort">
    <Segment label="Sort rigs" value={sort} options={RIG_SORTS} onChange={(next) => setSort(next as RigSort)}/>
    <div className="rp-lib__families" role="group" aria-label="Filter by colour">{TONE_FAMILIES.filter((family) => present.has(family.id)).map((family) => <button key={family.id} type="button" title={family.label} aria-label={family.label} aria-pressed={families.includes(family.id)} style={{ "--family": family.colour } as React.CSSProperties} onClick={() => toggle(family.id)}/>)}</div>
  </div>;
  return { rows, bar };
}

/** Setlist order as a list of moves (the store moves one item at a time). */
/** Load a rig to hear it: on the pedal when connected, otherwise just select it. */
function useRigLoader() {
  const store = useAppStore();
  const live = store.liveSnapshot;
  const currentId = live?.rig.id ?? store.selectedRigId;
  const load = (rigId: string) => { const summary = live?.rigLibrary.find((rig) => rig.id === rigId); if (live) void store.loadRig(rigId, summary?.srId); else store.selectRig(rigId); };
  return { currentId, load };
}

function reorder(items: Array<{ id: string }>, target: Array<{ id: string }>, move: (from: number, to: number) => void) {
  const current = items.map((item) => item.id);
  target.forEach((item, to) => { const from = current.indexOf(item.id); if (from === to) return; move(from, to); current.splice(to, 0, ...current.splice(from, 1)); });
}

/** LIBRARY · SETLISTS in three columns: setlists | the selected setlist (ordered) | all rigs. */
export function SetlistsPage() {
  const store = useAppStore();
  const list = store.setlists.find((item) => item.id === store.selectedSetlistId) ?? null;
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const key = (items: Array<{ rigId: string; title: string }>) => items.map((item) => item.rigId || item.title).join("|");
  useEffect(() => { if (!store.selectedSetlistId && store.setlists[0]) store.selectSetlist(store.setlists[0].id); }, [store.setlists.length]);
  useEffect(() => { if (list && saved[list.id] === undefined) setSaved((map) => ({ ...map, [list.id]: key(list.items) })); }, [list?.id, list?.items.length]);
  const dirty = Boolean(list && saved[list.id] !== undefined && saved[list.id] !== key(list.items));
  const drag = useSlotPointerDrag<number>((from, to) => store.moveSetlistItem(from, to));
  const { rows: rigs, bar: sortBar } = useRigSort(store.rigs, query);
  const rigOf = (rigId: string, title: string) => store.rigs.find((rig) => rig.id === rigId) ?? store.rigs.find((rig) => rig.name === title);
  const colourOf = (rigId: string, title: string) => rigOf(rigId, title)?.color ?? "var(--rp-off)";
  const { currentId, load } = useRigLoader();
  const [rigNaming, setRigNaming] = useState<{ rigId: string; kind: "rename" | "copy" } | null>(null);
  const rigNames = store.rigs.map((rig) => rig.name);
  const suggest = useRigNameSuggestion(store.rigs.find((rig) => rig.id === currentId)?.name ?? "");
  const suggestCopy = useRigNameSuggestion();

  const save = async () => { if (!list) return; await store.saveSelectedSetlist(); setSaved((map) => ({ ...map, [list.id]: key(useAppStore.getState().setlists.find((item) => item.id === list.id)?.items ?? []) })); };
  const setlistNames = store.setlists.map((item) => item.name);
  const create = (name: string) => store.createSetlist(name);
  const rename = (name: string) => list ? store.renameSetlist(list.id, name) : undefined;
  const remove = () => { if (list) void store.deleteSetlist(list.id); };
  const sortList = (sort: RigSort) => { if (!list) return; const keyed = list.items.map((item) => ({ ...item, name: item.title, color: colourOf(item.rigId, item.title) })); reorder(list.items, sortRigs(keyed, sort), store.moveSetlistItem); };

  return <div className="rp-lib rp-lib--three">
    <aside className="rp-lib__col" aria-label="Setlists">
      <header className="rp-lib__head"><span>SETLISTS</span><IconButton label="New setlist" onClick={() => setNaming("new")}><Plus size={15}/></IconButton></header>
      {naming === "new" && <div className="rp-lib__naming"><NameField label="New setlist name" placeholder="Setlist" taken={setlistNames} value="" onSubmit={async (name) => { await create(name); setNaming(null); }} onCancel={() => setNaming(null)}/></div>}
      <ol className="rp-lib__list">{store.setlists.map((item) => <li key={item.id}><button className={cn(item.id === list?.id && "on")} aria-current={item.id === list?.id || undefined} onClick={() => store.selectSetlist(item.id)}><span>{item.name}</span><small>{item.items.length}</small></button></li>)}</ol>
    </aside>
    <section className="rp-lib__col rp-lib__main" aria-label="Setlist">
      {list ? <>
        <header className="rp-lib__head rp-lib__head--main">
          <strong className="rp-lib__title"><EditableName label="Setlist name" value={list.name} taken={setlistNames} editing={naming === "rename"} onEditingChange={(on) => setNaming(on ? "rename" : null)} onRename={rename}/></strong>
          <IconButton label="Rename setlist" onClick={() => setNaming("rename")}><Pencil size={14}/></IconButton>
          <ConfirmButton label="Delete setlist" onConfirm={remove}><Trash2 size={14}/></ConfirmButton>
          <span className="rp-grow"/>
          <IconButton label="Sort setlist A–Z" disabled={list.items.length < 2} onClick={() => sortList("name")}><ArrowDownAZ size={14}/></IconButton>
          <IconButton label="Sort setlist by colour" disabled={list.items.length < 2} onClick={() => sortList("colour")}><Palette size={14}/></IconButton>
          <button className={cn("rp-btn rp-lib__save", dirty ? "rp-btn--pri" : "rp-lib__save--clean")} disabled={!dirty} onClick={() => void save()}><Save size={14}/> SAVE</button>
        </header>
        <ol className="rp-lib__rows">{list.items.map((item, index) => { const rig = rigOf(item.rigId, item.title); const current = Boolean(rig && rig.id === currentId); return <li key={item.id} data-chain-slot={index} className={cn(current && "current", drag.dragTarget === index && "drop-target", drag.dragSource === index && "drag-source")}>
          <span className="rp-lib__grip" onPointerDown={(event) => drag.onPointerDown(event, index)} aria-hidden="true"><GripVertical size={14}/></span>
          <b>{String(index + 1).padStart(2, "0")}</b>
          <i style={{ background: colourOf(item.rigId, item.title) }}/>
          <span className="rp-lib__name">{item.title}</span>
          {current ? <em>LOADED</em> : <IconButton label={`Load ${item.title}`} disabled={!rig} onClick={() => rig && load(rig.id)}><Play size={13}/></IconButton>}
          <IconButton label={`Move ${item.title} up`} disabled={index === 0} onClick={() => store.moveSetlistItem(index, index - 1)}><span aria-hidden="true">↑</span></IconButton>
          <IconButton label={`Move ${item.title} down`} disabled={index === list.items.length - 1} onClick={() => store.moveSetlistItem(index, index + 1)}><span aria-hidden="true">↓</span></IconButton>
          <IconButton label={`Remove ${item.title}`} onClick={() => store.removeSetlistItem(item.id)}><X size={14}/></IconButton>
        </li>; })}</ol>
        {!list.items.length && <div className="rp-lib__empty" aria-hidden="true"><Plus size={18}/></div>}
      </> : <div className="rp-lib__empty" aria-hidden="true"/>}
    </section>
    <aside className="rp-lib__col" aria-label="All rigs">
      <header className="rp-lib__head"><span>RIGS</span><small>{store.rigs.length}</small></header>
      <label className="rp-search rp-lib__search"><Search size={13}/><Input aria-label="Search rigs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search"/></label>
      {sortBar}
      <ol className="rp-lib__list rp-lib__rigs">{rigs.map((rig) => { const current = rig.id === currentId; const naming = rigNaming?.rigId === rig.id ? rigNaming.kind : null; return <li key={rig.id} className={cn(current && "current")}>
        {naming === "copy"
          ? <NameField label="New rig name" taken={rigNames} value="" initialText={suggestCopy(0)} suggest={suggestCopy} placeholder={`${rig.name} copy`} onSubmit={async (name) => { await store.duplicateRig(name); setRigNaming(null); }} onCancel={() => setRigNaming(null)}/>
          : naming === "rename"
            ? <EditableName label="Rig name" value={rig.name} taken={rigNames} suggest={current ? suggest : undefined} editing onEditingChange={(on) => setRigNaming(on ? { rigId: rig.id, kind: "rename" } : null)} onRename={(name) => store.renameRig(rig.id, name)}/>
            : <button className="rp-lib__add" disabled={!list} onClick={() => store.addRigToSetlist(rig.id)} onDoubleClick={() => setRigNaming({ rigId: rig.id, kind: "rename" })} aria-label={`Add ${rig.name} to setlist`}><i style={{ background: rig.color }}/><span>{rig.name}</span><Plus size={13}/></button>}
        {!naming && <span className="rp-lib__rigtools">
          {current ? <em>LOADED</em> : <IconButton label={`Load ${rig.name}`} onClick={() => load(rig.id)}><Play size={13}/></IconButton>}
          <IconButton label={`Rename ${rig.name}`} onClick={() => setRigNaming({ rigId: rig.id, kind: "rename" })}><Pencil size={13}/></IconButton>
          <IconButton label={`Duplicate ${rig.name}`} disabled={!current} onClick={() => setRigNaming({ rigId: rig.id, kind: "copy" })}><Copy size={13}/></IconButton>
          <ConfirmButton label={`Delete ${rig.name}`} disabled={current} onConfirm={() => void store.deleteRig(rig.id)}><Trash2 size={13}/></ConfirmButton>
        </span>}
      </li>; })}</ol>
    </aside>
  </div>;
}

/** LIBRARY · RIGS, every rig on the pedal as a plain row. Actions: load, rename, duplicate (current), delete. */
