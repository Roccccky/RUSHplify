import { ChevronLeft, Download, FileJson, Folder, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { cn } from "../lib/utils";
import { createRushplifyArchive } from "../domain/backup";
import type { Snapshot } from "../domain/types";
import { deviceApi, type DeviceFileEntry, type DeviceFileKind } from "../services/device-api";
import { deviceErrorDetail, deviceErrorMessage } from "../services/device-errors";
import { openRushplifyArchive, readRushplifyArchiveFile, saveRushplifyArchive } from "../services/backup-file";
import { NameField } from "../components/rp/name-field";
import { ConfirmButton } from "../components/rp/confirm-button";
import { FILE_AREAS } from "../pages/library-backup";

/** Objects of a restore point that differ from the newest one (by path). */
function changedPaths(snapshot: Snapshot, newest?: Snapshot) {
  if (!snapshot.payload || !newest?.payload || snapshot.id === newest.id) return [];
  const keys = new Set([...Object.keys(snapshot.payload.objects), ...Object.keys(newest.payload.objects)]);
  return [...keys].filter((path) => JSON.stringify(snapshot.payload!.objects[path]) !== JSON.stringify(newest.payload!.objects[path]));
}

/** LIBRARY · BACKUP, flat like the setlists. Columns: restore points | the selected point | files on the pedal. */
export function BackupPage() {
  const store = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const newest = store.snapshots.find((snapshot) => snapshot.payload);
  const point = store.snapshots.find((snapshot) => snapshot.id === selectedId) ?? store.snapshots[0] ?? null;
  const changed = useMemo(() => point ? changedPaths(point, newest) : [], [point, newest]);

  const run = async (task: () => Promise<unknown>) => { setBusy(true); setError(null); try { await task(); } catch (failure) { setError(deviceErrorMessage(failure)); } finally { setBusy(false); } };
  const archive = () => createRushplifyArchive({
    device: store.device ? { name: store.device.name, model: store.device.model, firmware: store.device.firmware, host: store.device.host } : undefined,
    snapshots: store.snapshots,
    workspace: { favoriteRigIds: store.favoriteRigIds, favoriteToneIds: store.favoriteToneIds, favoriteBlockNames: store.favoriteBlockNames, liveLayout: store.liveLayout, liveStages: store.liveStages, selectedLiveStageId: store.selectedLiveStageId, testRigs: store.testRigs, testRigSets: store.testRigSets, selectedTestRigSetId: store.selectedTestRigSetId, preferences: store.preferences },
    deviceIndex: { rigs: store.rigs, setlists: store.setlists },
  });
  const exportArchive = () => run(async () => { const target = await saveRushplifyArchive(archive(), `rushplify-${store.device?.name ?? "workspace"}-${new Date().toISOString().slice(0, 10)}`); if (target) store.addDiagnostic({ level: "success", source: "Backup", message: "Archive saved", detail: target }); });
  const merge = (value: Parameters<typeof store.importBackupArchive>[0]) => { const added = store.importBackupArchive(value, false); store.addDiagnostic({ level: "success", source: "Backup", message: `Imported ${added} restore point${added === 1 ? "" : "s"}` }); };
  const importArchive = () => { if (!deviceApi.isNative()) { fileInput.current?.click(); return; } void run(async () => { const result = await openRushplifyArchive(); if (result) merge(result.archive); }); };

  return <div className="rp-lib rp-lib--three">
    <aside className="rp-lib__col" aria-label="Restore points">
      <header className="rp-lib__head"><span>BACKUPS</span>
        <button type="button" className="rp-ibtn" aria-label="New restore point" onClick={() => setNaming(true)}><Plus size={15}/></button>
        <button type="button" className="rp-ibtn" aria-label="Import archive" disabled={busy} onClick={importArchive}><Upload size={14}/></button>
        <button type="button" className="rp-ibtn" aria-label="Save archive" disabled={busy || !store.snapshots.length} onClick={() => void exportArchive()}><Download size={14}/></button>
        <input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(async () => merge(await readRushplifyArchiveFile(file))); event.target.value = ""; }}/>
      </header>
      {naming && <div className="rp-lib__naming"><NameField label="Restore point name" placeholder="Restore point" value="" initialText={`Backup ${new Date().toISOString().slice(0, 10)}`} onCancel={() => setNaming(false)} onSubmit={async (name) => { await store.createSnapshot(name); setNaming(false); setSelectedId(useAppStore.getState().snapshots[0]?.id ?? null); }}/></div>}
      <ol className="rp-lib__list">{store.snapshots.map((snapshot) => <li key={snapshot.id}>
        <button className={cn(snapshot.id === point?.id && "on")} aria-current={snapshot.id === point?.id || undefined} onClick={() => setSelectedId(snapshot.id)}>
          <em className={cn("rp-dot", snapshot.payload && "on")} aria-label={snapshot.payload ? "Restorable" : "Metadata only"}/><span>{snapshot.name}</span><small>{snapshot.createdAt.split(" · ")[0]}</small>
        </button>
      </li>)}</ol>
      {!store.snapshots.length && !naming && <div className="rp-lib__empty" aria-hidden="true"><Plus size={18}/></div>}
    </aside>
    <section className="rp-lib__col rp-lib__main" aria-label="Restore point">
      {point ? <>
        <header className="rp-lib__head rp-lib__head--main">
          <strong className="rp-lib__title"><span>{point.name}</span></strong>
          <ConfirmButton label={`Delete ${point.name}`} onConfirm={() => { store.deleteSnapshot(point.id); setSelectedId(null); }}><Trash2 size={14}/></ConfirmButton>
          <span className="rp-grow"/>
          <ConfirmButton className="rp-lib__restore" label={`Restore ${point.name}`} disabled={!point.payload || busy || !store.device} onConfirm={() => void run(() => store.restoreSnapshot(point.id))}><RotateCcw size={14}/><span>RESTORE</span></ConfirmButton>
        </header>
        <dl className="rp-lib__facts">
          <div><dt>SAVED</dt><dd>{point.createdAt}</dd></div>
          <div><dt>PEDAL</dt><dd>{point.device}</dd></div>
          <div><dt>RIGS</dt><dd>{point.rigCount}</dd></div>
          <div><dt>SETLISTS</dt><dd>{point.setlistCount}</dd></div>
          <div><dt>SIZE</dt><dd>{point.size}</dd></div>
        </dl>
        {error && <p className="rp-pcard__error" role="alert">{error}</p>}
        {changed.length > 0 && <><h3 className="rp-lib__sub">CHANGED SINCE {newest?.name.toUpperCase()}</h3>
          <ol className="rp-lib__rows rp-lib__rows--plain">{changed.map((path) => <li key={path}><span className="rp-lib__path">{path.replace("/Evil/Engine/", "")}</span></li>)}</ol></>}
      </> : <div className="rp-lib__empty" aria-hidden="true"/>}
    </section>
    <PedalFiles/>
  </div>;
}

/** Right column: what is on the pedal, one folder at a time (read only). */
function PedalFiles() {
  const [area, setArea] = useState<typeof FILE_AREAS[number] | null>(null);
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<DeviceFileEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = async (next: string, kind: DeviceFileKind) => {
    setBusy(true); setError(null);
    try { const result = await deviceApi.listDeviceDirectory(next, kind); setEntries(result.entries); setPath(result.path); }
    catch (failure) { setEntries([]); setError(deviceErrorMessage(failure)); useAppStore.getState().addDiagnostic({ level: "warning", source: "Backup", message: "Could not list folder", detail: deviceErrorDetail(failure) }); }
    finally { setBusy(false); }
  };
  const open = (item: typeof FILE_AREAS[number]) => { setArea(item); void list(item.path, item.kind); };
  const parent = path.split("/").slice(0, -1).join("/");
  return <aside className="rp-lib__col" aria-label="On pedal">
    <header className="rp-lib__head">
      {area ? <button type="button" className="rp-ibtn" aria-label="Up one folder" disabled={busy} onClick={() => { if (!path || path === area.path) { setArea(null); setEntries([]); } else void list(parent, area.kind); }}><ChevronLeft size={15}/></button> : null}
      <span className="rp-lib__crumb" title={path || undefined}>{area ? (path.split("/").pop() || area.label).toUpperCase() : "ON PEDAL"}</span>
    </header>
    {error && <p className="rp-pcard__error" role="alert">{error}</p>}
    {area
      ? <ol className="rp-lib__list">{entries.map((entry) => { const file = entry.type === "file"; return <li key={`${entry.type}:${entry.name}`}>
          <button disabled={file || busy} title={entry.name} onClick={() => void list([path, entry.name].filter(Boolean).join("/"), area.kind)}>{file ? <FileJson size={13}/> : <Folder size={13}/>}<span>{entry.name}</span></button>
        </li>; })}</ol>
      : <ol className="rp-lib__list">{FILE_AREAS.filter((item) => item.kind !== "folders").map((item) => <li key={item.label}><button onClick={() => open(item)}><Folder size={13}/><span>{item.label}</span></button></li>)}</ol>}
    {area && !busy && !entries.length && !error && <div className="rp-lib__empty" aria-hidden="true"><Folder size={18}/></div>}
  </aside>;
}
