import { useState } from "react";
import { Clipboard, Download, Trash2 } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import { ConnectionOrb } from "../components/system/controls";
import "../styles/settings-modern.css";
import "../styles/rp-diagnostics.css";

export { SettingsPage } from "../system/settings-page";

function exportDiagnostics(value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `rushplify-diagnostics-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

const LEVEL_COLOUR: Record<string, string> = { error: "var(--rp-hl)", warning: "var(--rp-warn)", success: "var(--rp-ok)", info: "var(--rp-m5)" };

/** DIAGNOSTICS: one status line (LED, host, firmware, reflection, latency), the event log with one LED per
 *  event, and what the firmware offers as LEDs. Copy and export in the head. */
export function DiagnosticsPage() {
  const store = useAppStore(); const { diagnostics, capabilities, device, addDiagnostic } = store; const [tab, setTab] = useState<"events" | "capabilities">("events");
  const publicCapabilities = capabilities ? { product: capabilities.product, firmware: capabilities.firmware, objectCount: capabilities.objectCount, propertyCount: capabilities.propertyCount, flags: capabilities.flags } : null;
  const report = { generatedAt: new Date().toISOString(), device, capabilities: publicCapabilities, diagnostics, sync: { source: store.lastSyncSource, objectCount: store.liveSnapshot?.objectCount } };
  const copy = () => { void navigator.clipboard?.writeText(JSON.stringify(report, null, 2)); addDiagnostic({ level: "success", source: "Diagnostics", message: "Diagnostics copied" }); };
  const stats: Array<[string, string]> = [["PEDAL", capabilities?.product ?? "—"], ["FIRMWARE", capabilities?.firmware ?? "—"], ["HOST", device?.host ?? "—"], ["OBJECTS", String(capabilities?.objectCount ?? 0)], ["PROPERTIES", (capabilities?.propertyCount ?? 0).toLocaleString("de-DE")], ["LATENCY", device?.latencyMs !== undefined ? `${device.latencyMs} ms` : "—"]];
  return <div className="rp-diag">
    <h1 className="rp-sr">Diagnostics</h1>
    <section className="rp-zone rp-diag__status" aria-label="Status">
      <ConnectionOrb status={device?.status ?? "offline"}/>
      <dl className="rp-diag__stats">{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <span className="rp-grow"/>
      <button type="button" className="rp-ibtn" aria-label="Copy report" title="Copy report" onClick={copy}><Clipboard size={14}/></button>
      <button type="button" className="rp-ibtn" aria-label="Export bundle" title="Export bundle" onClick={() => exportDiagnostics(report)}><Download size={14}/></button>
    </section>
    <section className="rp-zone rp-diag__main" aria-label={tab === "events" ? "Event log" : "Capabilities"}>
      <header className="rp-zone__head">
        <div role="tablist" className="rp-wellseg" aria-label="Diagnostics view">
          <button type="button" role="tab" aria-selected={tab === "events"} className={tab === "events" ? "on" : undefined} onClick={() => setTab("events")}>EVENT LOG {diagnostics.length > 0 && <small>{diagnostics.length}</small>}</button>
          <button type="button" role="tab" aria-selected={tab === "capabilities"} className={tab === "capabilities" ? "on" : undefined} onClick={() => setTab("capabilities")}>CAPABILITIES</button>
        </div>
        <span className="rp-grow"/>
        {tab === "events" && <button type="button" className="rp-ibtn" aria-label="Clear" title="Clear" disabled={!diagnostics.length} onClick={() => store.clearDiagnostics()}><Trash2 size={14}/></button>}
      </header>
      {tab === "events" && <ol className="rp-diag__log">{diagnostics.map((event) => <li key={event.id} className="rp-diag__event" data-level={event.level}>
        <i className="rp-dot on" style={{ "--block-color": LEVEL_COLOUR[event.level] ?? LEVEL_COLOUR.info } as React.CSSProperties} aria-label={event.level}/>
        <time>{event.time}</time><b>{event.source}</b>
        <span>{event.message}{event.detail && <small>{event.detail}</small>}</span>
      </li>)}{!diagnostics.length && <li className="rp-diag__none" aria-hidden="true"><i className="rp-dot"/></li>}</ol>}
      {tab === "capabilities" && <ul className="rp-diag__caps">{Object.entries(capabilities?.flags ?? {}).map(([key, available]) => <li key={key}><i className={available ? "rp-dot on" : "rp-dot"} aria-label={available ? "Yes" : "No"}/><span>{key.replace(/^supports/, "").replace(/([a-z])([A-Z])/g, "$1 $2")}</span></li>)}</ul>}
    </section>
  </div>;
}
