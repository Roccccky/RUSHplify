import { useState } from "react";
import { useAppStore } from "../stores/app-store";
import { Button, Input, Select } from "../components/ui";
import { ReflectionEditor } from "../components/system/reflection-editor";
import { MidiOutEditor } from "../components/system/midi-out-editor";
import { AboutPanel } from "../pages/about-panel";
import { deviceApi } from "../services/device-api";
import { deviceErrorDetail, deviceErrorMessage } from "../services/device-errors";
import { midiConnection, useMidiConnection } from "../services/midi-connection";
import { isIpAddress, primaryConnectionAddress } from "../domain/connection-address";
import { cn } from "../lib/utils";
import { Cloud, Footprints, Gauge, Info, Monitor, Music2, Pencil, Volume2, Wifi, type LucideIcon } from "lucide-react";
import { Segment } from "../components/rp/controls";
import "../styles/rp-settings.css";

/** SYSTEM · SETTINGS: category list left, plain rows right (HeadRush Global Settings layout, NAMplify look). */

type Section = "connection" | "pedal" | "audio" | "midi" | "expression" | "editing" | "interface" | "services" | "about";
const SECTIONS: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: "connection", label: "Connection", icon: Wifi }, { id: "pedal", label: "Pedal", icon: Gauge }, { id: "audio", label: "Audio", icon: Volume2 }, { id: "midi", label: "MIDI", icon: Music2 },
  { id: "expression", label: "Expression", icon: Footprints }, { id: "editing", label: "Editing", icon: Pencil }, { id: "interface", label: "Interface", icon: Monitor }, { id: "services", label: "Services", icon: Cloud }, { id: "about", label: "About", icon: Info },
];
const STORAGE_KEY = "rushplify-settings-section";
const readSection = (): Section => { try { const saved = localStorage.getItem(STORAGE_KEY); return SECTIONS.some((section) => section.id === saved) ? saved as Section : "connection"; } catch { return "connection"; } };

const KNOWN = [
  { id: "flex-prime", label: "Flex Prime", address: "headrushflexprime.local" },
  { id: "prime", label: "Prime", address: "headrushprime.local" },
  { id: "core", label: "Core", address: "headrushcore.local" },
] as const;

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="rp-set-row"><span className="rp-set-row__label">{label}{hint && <small>{hint}</small>}</span><div className="rp-set-row__control">{children}</div></div>;
}
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <Row label={label}><Segment label={label} value={checked ? "on" : "off"} options={[{ value: "on", text: "ON" }, { value: "off", text: "OFF" }]} onChange={(next) => onChange(next === "on")}/></Row>;
}
function Heading({ children }: { children: React.ReactNode }) { return <h3 className="rp-set-heading">{children}</h3>; }

export function SettingsPage() {
  const [section, setSection] = useState<Section>(readSection);
  const choose = (next: Section) => { setSection(next); try { localStorage.setItem(STORAGE_KEY, next); } catch { /* convenience only */ } };
  return <div className="rp-settings">
    <nav className="rp-settings__nav" aria-label="Settings">{SECTIONS.map((item) => <button key={item.id} aria-current={section === item.id ? "page" : undefined} className={cn(section === item.id && "on")} onClick={() => choose(item.id)}><item.icon size={15} aria-hidden="true"/>{item.label}</button>)}</nav>
    <section className="rp-settings__body" aria-label={SECTIONS.find((item) => item.id === section)?.label}>
      <h2 className="rp-settings__title">{SECTIONS.find((item) => item.id === section)?.label}</h2>
      {section === "connection" && <ConnectionSettings/>}
      {section === "pedal" && <DeviceObject path="/Evil/Engine/Settings/General" include={["ConfirmDirtyFlag", "AutoAssignments", "AutoAmpCab", "InvertTempoLED", "LooperFSAssignment", "TunerFSAssignment", "OnPressFS"]}/>}
      {section === "audio" && <DeviceObject path="/Evil/Engine/Settings/Audio" include={["RigInput", "MainOutLevel", "FXReturnLevel", "ExternalSendStereo", "ExternalReturnStereo"]}/>}
      {section === "midi" && <MidiSettings/>}
      {section === "expression" && <DeviceObject path="/Evil/Engine/Settings/ExpressionPedal"/>}
      {section === "editing" && <EditingSettings/>}
      {section === "interface" && <InterfaceSettings/>}
      {section === "services" && <ServiceSettings/>}
      {section === "about" && <AboutPanel/>}
    </section>
  </div>;
}

function DeviceObject({ path, include }: { path: string; include?: string[] }) {
  const object = useAppStore((store) => store.liveSubtree?.[path]);
  if (!object) return <p className="rp-set-off"><i/>OFFLINE</p>;
  return <div className="rp-set-reflect"><ReflectionEditor appearance="settings" path={path} object={object} include={include} refreshPage="settings"/></div>;
}

function ConnectionSettings() {
  const store = useAppStore(); const p = store.preferences;
  const initial = primaryConnectionAddress(p.address, p.modelAddress);
  const [address, setAddress] = useState(initial);
  const [scanning, setScanning] = useState(false); const [found, setFound] = useState<Awaited<ReturnType<typeof deviceApi.discover>>>([]); const [error, setError] = useState<string | null>(null);
  const known = KNOWN.find((item) => item.address === address.trim().toLowerCase());
  const connect = (target: string) => {
    const value = target.trim(); if (!value || store.connectionBusy) return;
    store.setPreference("address", value);
    if (KNOWN.some((item) => item.address === value.toLowerCase())) store.setPreference("modelAddress", value);
    if (isIpAddress(value)) store.setPreference("fallbackAddress", value);
    void store.connect(value);
  };
  const scan = async () => { setScanning(true); setError(null); setFound([]); try { const devices = await deviceApi.discover(); setFound(devices); if (!devices.length) setError("No HeadRush found"); } catch (failure) { setError(deviceErrorMessage(failure)); } finally { setScanning(false); } };

  return <>
    <Heading>DEVICE</Heading>
    <Row label={store.device?.name ?? "Not connected"} hint={store.device ? `${store.device.host} · FW ${store.device.firmware}` : undefined}>
      <i className={cn("rp-set-led", store.device && "on")} aria-hidden="true"/>
      {store.device && <Button size="sm" variant="outline" onClick={() => void store.disconnect()}>Disconnect</Button>}
    </Row>
    <Row label="Model">
      <Select aria-label="HeadRush model" value={known?.id ?? "custom"} onChange={(event) => { const item = KNOWN.find((entry) => entry.id === event.target.value); if (item) setAddress(item.address); else setAddress(""); }}>{KNOWN.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="custom">Custom address</option></Select>
    </Row>
    <form className="rp-set-row" onSubmit={(event) => { event.preventDefault(); connect(address); }}>
      <span className="rp-set-row__label">Address</span>
      <div className="rp-set-row__control"><Input aria-label="HeadRush address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="headrushflexprime.local"/><Button type="submit" size="sm" variant="primary" loading={store.connectionBusy} disabled={!address.trim()}>Connect</Button></div>
    </form>
    <Row label="Find on network"><Button size="sm" variant="outline" loading={scanning} disabled={store.connectionBusy} onClick={() => void scan()}>Scan</Button></Row>
    {found.map((device) => <Row key={`${device.id}:${device.host}`} label={device.name} hint={`${device.host} · ${device.model}`}><Button size="sm" onClick={() => connect(device.host)} disabled={store.connectionBusy}>Connect</Button></Row>)}
    {(error || store.connectionError) && <p className="rp-set-error" role="alert">{error ?? store.connectionError}</p>}
    <Heading>BEHAVIOUR</Heading>
    <SwitchRow label="Connect at startup" checked={p.autoDiscovery ?? true} onChange={(value) => store.setPreference("autoDiscovery", value)}/>
    <SwitchRow label="Reconnect after drop-outs" checked={p.autoReconnect ?? true} onChange={(value) => store.setPreference("autoReconnect", value)}/>
  </>;
}

function MidiSettings() {
  const midi = useMidiConnection(); const tree = useAppStore((store) => store.liveSubtree) ?? {};
  return <>
    <Heading>CONTROLLER INPUT</Heading>
    <Row label="Status"><i className={cn("rp-set-led", midi.ready && "on")} aria-hidden="true"/><span className="rp-set-value">{midi.ready ? "Ready" : midi.connecting ? "Connecting" : "Off"}{midi.bleDeviceName ? ` · ${midi.bleDeviceName}` : ""}</span></Row>
    <Row label="Receive from"><Select aria-label="MIDI input" value={midi.inputId} onChange={(event) => midiConnection.selectInput(event.target.value)}><option value="all">All inputs</option>{midi.inputs.map((input) => <option key={input.id} value={input.id}>{[input.manufacturer, input.name].filter(Boolean).join(" · ") || input.id}</option>)}</Select></Row>
    <Row label="Connect"><Button size="sm" variant="outline" loading={midi.connecting} onClick={() => void midiConnection.connect()}>{midi.enabled ? "Rescan" : "USB / Web MIDI"}</Button><Button size="sm" variant="outline" disabled={midi.connecting} onClick={() => void midiConnection.connectBluetooth()}>Bluetooth</Button>{midi.enabled && <Button size="sm" variant="ghost" onClick={() => midiConnection.disconnect()}>Disconnect</Button>}</Row>
    <Heading>PEDAL MIDI</Heading>
    <DeviceObject path="/Evil/Engine/Settings/Midi" include={["MIDIThrough", "MBCIn", "Channel", "SendProgramChange", "ReceiveProgramChange"]}/>
    {tree["/Evil/Engine/MIDIOutCtrl"] && <><Heading>RIG MIDI OUT</Heading><div className="rp-set-reflect"><MidiOutEditor object={tree["/Evil/Engine/MIDIOutCtrl"]}/></div></>}
  </>;
}

function EditingSettings() {
  const store = useAppStore(); const p = store.preferences;
  return <>
    <Row label="Write to pedal"><div className="rp-seg" role="radiogroup" aria-label="Write mode">{(["immediate", "staged", "ask"] as const).map((mode) => <button key={mode} role="radio" aria-checked={p.writeMode === mode} className={cn(p.writeMode === mode && "on")} onClick={() => store.setPreference("writeMode", mode)}>{mode === "immediate" ? "Live" : mode === "staged" ? "On apply" : "Ask"}</button>)}</div></Row>
    <SwitchRow label="Backup before destructive changes" checked={p.autoBackup} onChange={(value) => store.setPreference("autoBackup", value)}/>
    <SwitchRow label="Confirm rig replacement" checked={p.confirmRigReplacement ?? true} onChange={(value) => store.setPreference("confirmRigReplacement", value)}/>
    <SwitchRow label="Keep edit history" checked={p.keepHistory ?? true} onChange={(value) => store.setPreference("keepHistory", value)}/>
  </>;
}

function InterfaceSettings() {
  const store = useAppStore(); const p = store.preferences;
  return <>
    <Row label="Density"><Select aria-label="Density" value={p.density} onChange={(event) => store.setPreference("density", event.target.value as typeof p.density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="stage">Stage</option></Select></Row>
    <SwitchRow label="Reduce motion" checked={p.reduceMotion} onChange={(value) => store.setPreference("reduceMotion", value)}/>
    <SwitchRow label="High contrast" checked={p.highContrast} onChange={(value) => store.setPreference("highContrast", value)}/>
    <SwitchRow label="Keep display awake on stage" checked={p.keepAwake} onChange={(value) => store.setPreference("keepAwake", value)}/>
  </>;
}

/** Cloud sign-in is owned by the pedal: RUSHplify only starts or ends the pedal's own login. */
function ServiceSettings() {
  const store = useAppStore(); const live = store.liveSnapshot;
  const toggle = async (kind: "cloud" | "tone3000", signedIn: boolean) => {
    const path = kind === "cloud" ? "/Evil/Cloud/Master" : "/Evil/API/Tone3000"; const method = signedIn ? "logout" : kind === "cloud" ? "requestUserCodeForLogin" : "startLogin";
    try { const result = await deviceApi.callMethod(path, method); store.addDiagnostic({ level: "info", source: "Services", message: signedIn ? `Signed out of ${kind}` : `Started ${kind} sign-in`, detail: JSON.stringify(result.body) }); await store.refreshPage("settings", "manual"); }
    catch (error) { store.addDiagnostic({ level: "warning", source: "Services", message: `Could not manage ${kind}`, detail: deviceErrorDetail(error) }); }
  };
  const service = (kind: "cloud" | "tone3000", label: string, signedIn: boolean) => <Row label={label} hint="on the pedal"><i className={cn("rp-set-led", signedIn && "on")} aria-hidden="true"/><Button size="sm" variant="outline" disabled={!live} onClick={() => void toggle(kind, signedIn)}>{signedIn ? "Sign out" : "Sign in"}</Button></Row>;
  return <>
    {service("cloud", "HeadRush Cloud", live?.cloud.loggedIn ?? false)}
    {service("tone3000", "TONE3000", live?.tone3000.loggedIn ?? false)}
  </>;
}
