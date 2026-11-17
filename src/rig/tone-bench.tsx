import { ArrowDown, ArrowUpDown, Cloud, Search, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CloudTone, RigBlock } from "../domain/types";
import { toneProviderReadiness } from "../domain/tone-analysis";
import { captureRole } from "../domain/cab-match";
import { TONE3000_SORTS, sortToneRows, tone3000SortMode, type Tone3000Sort } from "../domain/tone-catalogue";
import { useAppStore } from "../stores/app-store";
import { DEFAULT_TONE3000_FILTERS, deviceApi, type Tone3000SearchFilters } from "../services/device-api";
import { deviceErrorDetail } from "../services/device-errors";
import { Segment } from "../components/rp/controls";
import { cn } from "../lib/utils";
import { Card } from "./inspector";
import "../styles/rp-tones.css";

type Source = CloudTone["source"];
type Tab = "browse" | "fav";
type Category = "all" | "amp" | "fullrig" | "ir" | "pedal" | "outboard";

/** TONE3000 capture categories as NAMplify shows them (name + colour). */
const CATEGORIES: Array<{ id: Category; name: string; colour: string }> = [
  { id: "all", name: "ALL", colour: "var(--rp-ink)" },
  { id: "amp", name: "AMP", colour: "var(--rp-cap-amp)" },
  { id: "fullrig", name: "AMP+CAB", colour: "var(--rp-cap-fullrig)" },
  { id: "ir", name: "IR", colour: "var(--rp-cap-ir)" },
  { id: "pedal", name: "PEDALS", colour: "var(--rp-cap-pedal)" },
  { id: "outboard", name: "OUTBOARD", colour: "var(--rp-cap-outboard)" },
];
/** What the pedal can use from TONE3000: amps and full rigs. Its TONE3000 link has no IRs, and pedal /
 *  outboard captures do not work as a NAM slot on the pedal, so the browser does not offer them. */
const SLOT_CATEGORIES: Category[] = ["all", "amp", "fullrig"];
const SLOT_FILTERS: Tone3000SearchFilters = { ...DEFAULT_TONE3000_FILTERS, gear: ["amp", "full-rig"] };
const CATEGORY_HEX: Record<Category, string> = { all: "#8a8a8a", amp: "#e04a3a", fullrig: "#f0912a", ir: "#e8c34a", pedal: "#2fbf9c", outboard: "#b25ad0" };

export function categoryOf(tone: CloudTone): Exclude<Category, "all"> {
  const role = captureRole(tone);
  return role === "pedal" ? "pedal" : role;
}

/** Shared state of the tone browser (right column) and the tone card (centre): one list, one selection.
 *  With a NAM slot as target, picking a tone or a variant loads it into that slot of the current rig. */
export function useToneBench(active: boolean, target: RigBlock | null = null) {
  const store = useAppStore();
  const [chosen, setSource] = useState<Source>("Tone3000");
  // HeadRush Cloud items are whole rigs and clones, nothing a NAM slot takes: with a slot as target, TONE3000 only.
  const source: Source = target ? "Tone3000" : chosen;
  const [tab, setTab] = useState<Tab>("browse");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState(store.toneQuery);
  const [sort, setSort] = useState<Tone3000Sort>("trending");

  const sourceTones = useMemo(() => store.tones.filter((tone) => tone.source === source), [store.tones, source]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = sourceTones.filter((tone) => (tab !== "fav" || store.favoriteToneIds.includes(tone.id))
      && (category === "all" || categoryOf(tone) === category)
      && (tone.source !== "Tone3000" || SLOT_CATEGORIES.includes(categoryOf(tone)))
      && (!needle || `${tone.title} ${tone.author} ${tone.tags.join(" ")}`.toLowerCase().includes(needle)));
    return sortToneRows(matching, sort);
  }, [sourceTones, tab, category, query, sort, store.favoriteToneIds, Boolean(target)]);
  // The sort goes to TONE3000 with the search (`sortMode`); the rows above follow it locally meanwhile.
  const filters = useMemo<Tone3000SearchFilters>(() => ({ ...SLOT_FILTERS, sortMode: tone3000SortMode(sort) }), [sort]);
  const selected = store.tones.find((tone) => tone.id === store.selectedToneId) ?? null;
  const models = selected ? store.toneModels[selected.id] ?? [] : [];
  const model = models.find((item) => item.id === store.selectedToneModelId) ?? null;
  const host = target ? target.sourcePath ?? "/Evil/Engine/Patch/Neural_Amp_Modeler" : null;
  const loadedId = host ? store.slotCaptures[host]?.tone.id ?? null : source === "Tone3000" ? null : store.cloudPreviewId;

  // Opening a provider asks for its catalogue with the search and filters shown here. The store answers from
  // its cache when that is what it holds; a list kept from another search or filter set is replaced.
  useEffect(() => { if (active && deviceApi.isNative() && store.device && !store.toneLoading) void store.refreshToneServices(query, false, filters, source); }, [active, source, store.device?.id]);
  // Search goes to the provider after a pause; the list filters locally right away.
  useEffect(() => { const timer = window.setTimeout(() => { if (active && deviceApi.isNative() && store.device && query.trim() !== store.toneQuery) void store.refreshToneServices(query, false, filters, source); }, 450); return () => window.clearTimeout(timer); }, [query]);
  // A new sort is a new TONE3000 feed (cached per sort in the store).
  const sorted = useRef(sort);
  useEffect(() => { if (sorted.current === sort) return; sorted.current = sort; if (active && deviceApi.isNative() && store.device && source === "Tone3000") void store.refreshToneServices(query, false, filters, source); }, [sort]);

  const load = (tone: CloudTone, modelId?: string) => {
    if (tone.source !== "Tone3000") { void useAppStore.getState().previewCloudTone(tone); return; }
    if (target) void useAppStore.getState().loadToneIntoSlot(target.id, tone, modelId);
  };
  const pick = (tone: CloudTone) => {
    if (tone.id !== store.selectedToneId) store.selectTone(tone.id);
    if (tone.source === "Tone3000") void store.loadToneModels(tone);
    load(tone);
  };
  const step = (direction: -1 | 1) => { if (!rows.length) return; const index = rows.findIndex((tone) => tone.id === selected?.id); const next = rows[(index + direction + rows.length) % rows.length]; pick(next); document.getElementById(`tone-${next.id}`)?.scrollIntoView?.({ block: "nearest" }); };
  const pickModel = (id: string) => { store.selectToneModel(id); if (selected) load(selected, id); };
  const stepModel = (direction: -1 | 1) => { if (!models.length) return; const index = models.findIndex((item) => item.id === model?.id); pickModel(models[(index + direction + models.length) % models.length].id); };

  return { source, setSource: (next: Source) => { setSource(next); setCategory("all"); }, tab, setTab, category, setCategory, query, setQuery, rows, selected, models, model, target, loadedId, pick, step, pickModel, stepModel, sort, setSort };
}

export type ToneBench = ReturnType<typeof useToneBench>;

/** Centre card while TONES / CLOUD is open without a NAM slot selected: an info card of the selection (no
 *  display look, nothing to dial). A TONE3000 capture can be loaded into a NAM slot of the chain from here. */
export function ToneCard({ bench, namSlots = [], onLoad }: { bench: ToneBench; namSlots?: RigBlock[]; onLoad?: (block: RigBlock) => void }) {
  const store = useAppStore();
  const { selected, model, models, source } = bench;
  // HeadRush Cloud items are rigs and clones, not TONE3000 gear categories.
  const cat = selected && source === "Tone3000" ? categoryOf(selected) : "all";
  const cloudTitle = selected?.remoteKind === "clone" ? "CLONE" : "RIG";
  const favourite = Boolean(selected && store.favoriteToneIds.includes(selected.id));
  const loadedIn = (block: RigBlock) => Boolean(selected && block.sourcePath && store.slotCaptures[block.sourcePath]?.tone.id === selected.id);
  const load = (block: RigBlock) => { if (!selected) return; onLoad?.(block); void store.loadToneIntoSlot(block.id, selected, model?.id); };

  return <Card colour={CATEGORY_HEX[cat]} enabled={Boolean(selected)} caption={source === "Tone3000" ? "TONE3000" : "HEADRUSH CLOUD"} title={source !== "Tone3000" ? cloudTitle : cat === "all" ? "TONE" : CATEGORIES.find((item) => item.id === cat)!.name}
    tools={selected && <button type="button" className={cn("rp-ibtn rp-ibtn--sm", favourite && "rp-ibtn--on")} aria-label="Favourite" aria-pressed={favourite} onClick={() => store.toggleFavoriteTone(selected.id)}><Star size={14}/></button>}>
    {selected ? <div className="rp-tone__info">
      <div className="rp-tone__art" style={{ "--art": selected.imageColor ?? "#2a2a2a" } as React.CSSProperties}>{selected.imageUrl ? <img src={selected.imageUrl} alt=""/> : <span>{initials(selected.title)}</span>}</div>
      <div className="rp-tone__facts">
        <strong className="rp-tone__title">{selected.title}</strong>
        {selected.author && <span className="rp-tone__author">@{selected.author}</span>}
        <dl>
          {source === "Tone3000" && <><dt>Variant</dt><dd>{model?.name ?? (models.length ? `${models.length} variants` : "—")}</dd></>}
          {selected.tags.length > 0 && <><dt>Tags</dt><dd>{selected.tags.slice(0, 4).join(" · ")}</dd></>}
        </dl>
      </div>
    </div> : <div className="rp-tone__info rp-tone__info--empty" aria-hidden="true"><div className="rp-tone__art"/></div>}
    {selected && source === "Tone3000" && namSlots.length > 0 && <div className="rp-tone__load" role="group" aria-label="Load into NAM slot">
      {namSlots.map((block) => { const here = loadedIn(block); return <button key={block.id} type="button" className={cn("rp-btn", !here && "rp-btn--pri")} disabled={here || store.slotBusy} onClick={() => load(block)}>{here ? `IN SLOT ${block.slot + 1}` : `LOAD INTO SLOT ${block.slot + 1}`}</button>; })}
    </div>}
    {store.slotError && <p className="rp-pcard__error" role="status">{store.slotError}</p>}
  </Card>;
}

/** Right column, TONES tab (TONE3000) or CLOUD tab (HeadRush Cloud): NAMplify rows, variants for TONE3000. */
export function ToneBrowser({ bench }: { bench: ToneBench }) {
  const store = useAppStore();
  const [open, setOpen] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const { source, rows, selected } = bench;
  const readiness = toneProviderReadiness({ native: deviceApi.isNative(), device: store.device, capabilities: store.capabilities, subtree: store.liveSubtree, source, remoteId: selected?.remoteId });
  const signedOut = readiness.authenticated === false;
  const signIn = async () => {
    setLoginBusy(true);
    try { await deviceApi.callMethod(source === "Tone3000" ? "/Evil/API/Tone3000" : "/Evil/Cloud/Master", source === "Tone3000" ? "startLogin" : "requestUserCodeForLogin"); await store.refreshPage("settings", "manual"); }
    catch (error) { store.addDiagnostic({ level: "warning", source: "Tones", message: `Could not start ${source} sign-in`, detail: deviceErrorDetail(error) }); }
    finally { setLoginBusy(false); }
  };
  const onListScroll = (event: React.UIEvent<HTMLOListElement>) => {
    const element = event.currentTarget; const key = source === "Tone3000" ? "tone3000" : "headRushCloud";
    if (element.scrollTop + element.clientHeight > element.scrollHeight - 160 && store.toneHasMoreBySource[key] && !store.toneLoadingMore) void store.loadMoreTones(source);
  };
  const keys = (event: React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest("input, select, textarea")) return;
    if (event.key === "ArrowDown") { event.preventDefault(); bench.step(1); } else if (event.key === "ArrowUp") { event.preventDefault(); bench.step(-1); }
  };

  return <div className="rp-drawer" aria-label="Tone browser" role="region" onKeyDown={keys}>
    <header className="rp-drawer__head">
      <div className="rp-drawer__tools">
        <Segment label="List" value={bench.tab} options={[{ value: "browse", text: "ALL" }, { value: "fav", text: "FAV" }]} onChange={bench.setTab}/>
      </div>
      <div className="rp-drawer__tools">
        <label className="rp-drawer__search"><Search size={13}/><input aria-label="Search tones" value={bench.query} onChange={(event) => bench.setQuery(event.target.value)} placeholder="Search"/></label>
        <label className="rp-drawer__sort"><ArrowUpDown size={12} aria-hidden="true"/><select aria-label="Sort" value={bench.sort} onChange={(event) => bench.setSort(event.target.value as Tone3000Sort)}>{TONE3000_SORTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {source === "Tone3000" && <nav className="rp-drawer__cats" aria-label="Category">{CATEGORIES.filter((item) => SLOT_CATEGORIES.includes(item.id)).map((item) => <button key={item.id} type="button" data-on={bench.category === item.id} aria-pressed={bench.category === item.id} style={{ "--cat-colour": item.colour } as React.CSSProperties} onClick={() => bench.setCategory(item.id)}>{item.name}</button>)}</nav>}
    </header>
    {signedOut
      ? <div className="rp-drawer__state">{source === "Tone3000" ? <img src="/brands/tone3000.svg" alt="TONE3000" height={22}/> : <Cloud size={26} aria-label="HeadRush Cloud"/>}<button type="button" className="rp-hbtn" disabled={loginBusy} onClick={() => void signIn()}>CONNECT</button></div>
      : <ol className="rp-drawer__list" onScroll={onListScroll}>
        {rows.map((tone) => {
          const on = tone.id === selected?.id; const toneModels = store.toneModels[tone.id] ?? []; const expanded = open === tone.id; const c = categoryOf(tone);
          const count = toneModels.length || tone.modelCount || 0;
          return <li key={tone.id} id={`tone-${tone.id}`} className={cn("rp-row", on && "on", tone.id === bench.loadedId && "live")}>
            <div className="rp-row__main">
              <button type="button" className="rp-row__pick" aria-label={`${tone.title} · ${tone.author}`} aria-current={on || undefined} onClick={() => bench.pick(tone)}>
                <span className="rp-row__thumb" style={{ "--art": tone.imageColor } as React.CSSProperties}>{tone.imageUrl ? <img src={tone.imageUrl} alt="" loading="lazy"/> : <span>{initials(tone.title)}</span>}</span>
                <span className="rp-row__text"><strong>{tone.title}</strong><small>{tone.source === "Tone3000" ? <><b style={{ color: CATEGORY_HEX[c] }}>{CATEGORIES.find((item) => item.id === c)!.name}</b> · </> : tone.remoteKind === "clone" ? <><b>CLONE</b> · </> : null}@{tone.author}{tone.downloads ? <> · <ArrowDown size={10}/>{tone.downloads.toLocaleString("de-DE")}</> : null}</small></span>
              </button>
              {tone.source === "Tone3000" && <button type="button" className={cn("rp-row__var", expanded && "on")} aria-expanded={expanded} aria-label={`Variants of ${tone.title}`} onClick={() => { setOpen(expanded ? null : tone.id); void store.loadToneModels(tone); }}>{count || ""} VAR</button>}
            </div>
            {expanded && <ul className="rp-row__vars">{toneModels.length ? toneModels.map((item) => <li key={item.id}><button type="button" className={cn(on && item.id === store.selectedToneModelId && "on")} onClick={() => { if (!on) bench.pick(tone); bench.pickModel(item.id); }}>{item.name}</button></li>) : <li className="rp-row__wait" aria-hidden="true"><i className="rp-dot"/></li>}</ul>}
          </li>;
        })}
        {store.toneLoading && <li className="rp-drawer__wait" aria-hidden="true"><i className="rp-dot"/></li>}
      </ol>}
  </div>;
}

/** Right column for an IR slot: the pedal's IR library by folder; a click loads the file into the slot. */
export function IrBrowser({ block }: { block: RigBlock }) {
  const store = useAppStore();
  const [query, setQuery] = useState("");
  useEffect(() => { void store.loadIrLibrary(); }, []);
  const current = block.sourcePath ? store.liveSubtree?.[block.sourcePath]?.value?.IR : undefined;
  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const path of store.irLibrary) {
      if (needle && !path.toLowerCase().includes(needle)) continue;
      const parts = path.split("/"); const folder = parts.length > 2 ? parts.slice(1, -1).join("/") : "—";
      map.set(folder, [...(map.get(folder) ?? []), path]);
    }
    return [...map.entries()];
  }, [store.irLibrary, needle]);
  return <div className="rp-drawer" aria-label="IR browser" role="region">
    <header className="rp-drawer__head">
      <div className="rp-drawer__tools">
        <label className="rp-drawer__search"><Search size={13}/><input aria-label="Search IRs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search"/></label>
      </div>
    </header>
    <ol className="rp-drawer__list">
      {groups.map(([folder, paths]) => <li key={folder} className="rp-ir__group"><span className="rp-ir__folder">{folder.toUpperCase()}</span>
        <ul>{paths.map((path) => { const on = path === current || (!current && block.presetName === fileStem(path)); return <li key={path} className={cn("rp-row", on && "on live")}>
          <div className="rp-row__main"><button type="button" className="rp-row__pick" aria-current={on || undefined} onClick={() => void store.loadIrIntoSlot(block.id, path)}><span className="rp-row__text"><strong>{fileStem(path)}</strong></span></button></div>
        </li>; })}</ul></li>)}
      {!store.irLibrary.length && <li className="rp-drawer__wait" aria-hidden="true"><i className="rp-dot"/></li>}
    </ol>
  </div>;
}

const fileStem = (path: string) => (path.split("/").at(-1) ?? path).replace(/\.wav$/i, "");

const initials = (title: string) => title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

/** Window event: show the HeadRush Cloud list (header cloud icon). */
export const SHOW_CLOUD = "rushplify:show-cloud";
let cloudPending = false;
/** Opens RIG with the tone browser on HeadRush Cloud, no slot targeted. Works before RIG is mounted. */
export function openCloud() { cloudPending = true; window.dispatchEvent(new Event(SHOW_CLOUD)); useAppStore.getState().setPage("tone-cloud"); }
/** True once after `openCloud` (read by RIG when it mounts or hears the event). */
export function takeCloudRequest() { const pending = cloudPending; cloudPending = false; return pending; }
