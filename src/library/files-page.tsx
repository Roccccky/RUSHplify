import { Folder, Play, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { IconButton, Input } from "../components/ui";
import { Segment } from "../components/rp/controls";
import { cn } from "../lib/utils";
import { isNamBlock } from "../domain/nam";
import { blockColour } from "../domain/block-inspiration";
import type { RigBlock } from "../domain/types";

export type FileKind = "nam" | "ir";
const ROOT: Record<FileKind, string> = { nam: "Neural Amp Modeler", ir: "Impulse Responses" };
const KINDS = [{ value: "nam" as const, text: "NAM" }, { value: "ir" as const, text: "IR" }];

export interface FolderNode { path: string; name: string; depth: number; count: number }

const folderOf = (path: string) => path.slice(0, path.lastIndexOf("/"));
const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1).replace(/\.(nam|wav)$/i, "");

/** Folder tree of a flat file list: every folder that holds files (directly or below), sorted by path. */
export function folderTree(paths: string[], root: string): FolderNode[] {
  const counts = new Map<string, number>([[root, 0]]);
  for (const path of paths) {
    let folder = folderOf(path);
    while (folder.length >= root.length) {
      counts.set(folder, (counts.get(folder) ?? 0) + 1);
      if (folder === root) break;
      folder = folderOf(folder);
    }
  }
  return [...counts.entries()]
    .filter(([path]) => !/\/\./.test(path))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, count]) => ({ path, count, name: path === root ? "All" : path.slice(path.lastIndexOf("/") + 1), depth: path === root ? 0 : path.slice(root.length + 1).split("/").length }));
}

/** What a slot plays now: the capture path (NAM) or the IR name. */
function playing(block: RigBlock, kind: FileKind) {
  if (kind === "ir") return block.presetName ?? "";
  return String(block.parameters.find((parameter) => parameter.id === "LoadedClone")?.value ?? "");
}

/** LIBRARY · FILES: the captures and IRs on the pedal, by folder; ▶ plays one in a slot of the current rig. */
export function FilesPage() {
  const store = useAppStore();
  const rig = store.liveSnapshot?.rig ?? store.rigs.find((item) => item.id === store.selectedRigId) ?? store.rigs[0];
  const [kind, setKind] = useState<FileKind>("nam");
  const [folder, setFolder] = useState<Record<FileKind, string>>({ nam: ROOT.nam, ir: ROOT.ir });
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  // Dot folders (".demo" previews) are the pedal's own scratch space, not the library.
  const files = useMemo(() => (kind === "nam" ? store.namLibrary : store.irLibrary).filter((path) => !/\/\./.test(path)), [kind, store.namLibrary, store.irLibrary]);
  const root = ROOT[kind];
  const current = folder[kind];

  useEffect(() => { void (kind === "nam" ? store.loadNamLibrary() : store.loadIrLibrary()); }, [kind]);
  const reload = () => void (kind === "nam" ? store.loadNamLibrary(true) : store.loadIrLibrary(true));

  const tree = useMemo(() => folderTree(files, root), [files, root]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((path) => (needle ? true : path.startsWith(`${current}/`)) && (!needle || path.toLowerCase().includes(needle)))
      .sort((a, b) => fileName(a).localeCompare(fileName(b)));
  }, [files, current, query]);

  const slots = (rig?.blocks ?? []).filter((block) => !block.empty && (kind === "nam" ? isNamBlock(block) : block.category === "ir"));
  const slot = slots.find((block) => block.id === target) ?? slots[0];
  const now = slot ? playing(slot, kind) : "";
  const isPlaying = (path: string) => kind === "nam" ? now === path : now === fileName(path);
  const play = (path: string) => { if (!slot) return; void (kind === "nam" ? store.loadLocalCapture(slot.id, path) : store.loadIrIntoSlot(slot.id, path)); };

  return <div className="rp-lib rp-lib--three rp-files">
    <aside className="rp-lib__col" aria-label="Folders">
      <header className="rp-lib__head"><span>FOLDERS</span><IconButton label="Reload files" onClick={reload}><RefreshCw size={14}/></IconButton></header>
      <div className="rp-files__kind"><Segment label="File type" value={kind} options={KINDS} onChange={(value) => { setKind(value); setQuery(""); }}/></div>
      <ol className="rp-lib__list">{tree.map((node) => <li key={node.path}><button className={cn(node.path === current && "on")} aria-current={node.path === current || undefined} style={{ paddingLeft: 8 + node.depth * 12 }} onClick={() => { setFolder((map) => ({ ...map, [kind]: node.path })); setQuery(""); }}>
        <Folder size={13}/><span>{node.name}</span><small>{node.count}</small>
      </button></li>)}</ol>
    </aside>
    <section className="rp-lib__col rp-lib__main" aria-label="Files">
      <header className="rp-lib__head rp-lib__head--main">
        <strong className="rp-lib__title">{query ? "Search" : current === root ? root : current.slice(root.length + 1)}</strong><small>{rows.length}</small>
        <span className="rp-grow"/>
        <label className="rp-search rp-lib__search rp-lib__search--inline"><Search size={13}/><Input aria-label="Search files" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search"/></label>
      </header>
      <ol className="rp-lib__rows">{rows.map((path) => { const on = isPlaying(path); return <li key={path} className={cn(on && "current")} onDoubleClick={() => play(path)}>
        <span className="rp-lib__name">{fileName(path)}</span>
        {(query || folderOf(path) !== current) && <small className="rp-files__where">{folderOf(path).slice(root.length + 1)}</small>}
        {on ? <em>LOADED</em> : <IconButton label={`Play ${fileName(path)}`} disabled={!slot || store.slotBusy} onClick={() => play(path)}><Play size={13}/></IconButton>}
      </li>; })}</ol>
      {!rows.length && <div className="rp-lib__empty" aria-hidden="true"><Folder size={18}/></div>}
    </section>
    <aside className="rp-lib__col" aria-label="Slots">
      <header className="rp-lib__head"><span>{kind === "nam" ? "NAM SLOTS" : "IR SLOTS"}</span><small>{slots.length}</small></header>
      <ol className="rp-lib__list rp-files__slots">{slots.map((block) => <li key={block.id}><button className={cn(block.id === slot?.id && "on")} aria-pressed={block.id === slot?.id} aria-label={`Play in ${block.name}`} onClick={() => setTarget(block.id)}>
        <i style={{ background: blockColour(block.name, block.category) }}/>
        <span><b>{block.name}</b><small>{fileName(playing(block, kind)) || "—"}</small></span>
      </button></li>)}</ol>
      {store.slotError && <p className="rp-files__error" role="alert">{store.slotError}</p>}
    </aside>
  </div>;
}
