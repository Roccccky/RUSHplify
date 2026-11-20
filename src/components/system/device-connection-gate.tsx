import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Network, Radar, Router } from "lucide-react";
import { deviceApi } from "../../services/device-api";
import { deviceErrorMessage } from "../../services/device-errors";
import { useAppStore } from "../../stores/app-store";
import { Button, Input, Select } from "../ui";
import { isIpAddress, primaryConnectionAddress } from "../../domain/connection-address";
import { Brand } from "./brand";

type DeviceProfileId = "flex-prime" | "prime" | "core" | "custom";

const DEVICE_PROFILES: Array<{ id: Exclude<DeviceProfileId, "custom">; label: string; address: string }> = [
  { id: "flex-prime", label: "HeadRush Flex Prime", address: "headrushflexprime.local" },
  { id: "prime", label: "HeadRush Prime", address: "headrushprime.local" },
  { id: "core", label: "HeadRush Core", address: "headrushcore.local" },
];

function profileForAddress(address: string): DeviceProfileId {
  return DEVICE_PROFILES.find((profile) => profile.address.toLowerCase() === address.trim().toLowerCase())?.id ?? "custom";
}

export function DeviceConnectionGate() {
  const busy = useAppStore((state) => state.connectionBusy);
  const error = useAppStore((state) => state.connectionError);
  const savedAddress = useAppStore((state) => state.preferences.address);
  const modelAddress = useAppStore((state) => state.preferences.modelAddress);
  const savedFallback = useAppStore((state) => state.preferences.fallbackAddress);
  const primaryAddress = primaryConnectionAddress(savedAddress, modelAddress);
  const connect = useAppStore((state) => state.connect);
  const pairing = useAppStore((state) => state.pairing);
  const cancelPairing = useAppStore((state) => state.cancelPairing);
  const setPreference = useAppStore((state) => state.setPreference);
  const [address, setAddress] = useState(primaryAddress);
  const [profile, setProfile] = useState<DeviceProfileId>(() => profileForAddress(primaryAddress));
  const [advanced, setAdvanced] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<Awaited<ReturnType<typeof deviceApi.discover>>>([]);
  const selectedProfile = useMemo(() => DEVICE_PROFILES.find((candidate) => candidate.id === profile), [profile]);
  const failure = discoveryError ?? error;

  useEffect(() => {
    setAddress(primaryAddress);
    setProfile(profileForAddress(primaryAddress));
  }, [primaryAddress]);

  // Like the pedal's own editor: ask again every 2 s until the PIN is confirmed on the pedal.
  useEffect(() => {
    if (!pairing) return;
    const timer = window.setInterval(() => { if (!useAppStore.getState().connectionBusy) void connect(pairing.address); }, 2000);
    return () => window.clearInterval(timer);
  }, [pairing?.address, connect]);

  const submit = (target = address) => {
    const normalized = target.trim();
    if (!normalized || busy) return;
    setPreference("address", normalized);
    if (profileForAddress(normalized) !== "custom") setPreference("modelAddress", normalized);
    if (isIpAddress(normalized)) setPreference("fallbackAddress", normalized);
    void connect(normalized);
  };

  const chooseProfile = (next: DeviceProfileId) => {
    setProfile(next);
    const known = DEVICE_PROFILES.find((candidate) => candidate.id === next);
    if (known) setAddress(known.address);
    else setAddress(savedFallback ?? (isIpAddress(savedAddress) ? savedAddress : ""));
  };

  const discover = async () => {
    setDiscovering(true); setDiscoveryError(null);
    try {
      const devices = await deviceApi.discover();
      setDiscovered(devices);
      if (!devices.length) setDiscoveryError("No HeadRush device answered on this network.");
    } catch (reason) {
      setDiscovered([]);
      setDiscoveryError(deviceErrorMessage(reason));
    } finally { setDiscovering(false); }
  };

  return <div className="device-connect-gate" role="dialog" aria-modal="true" aria-labelledby="device-connect-title">
    <div className="device-connect-panel">
      <header className="device-connect-panel__hero">
        <Brand className="device-connect-brand" size="lg" mark/>
        <h1 id="device-connect-title" className="rp-sr">Connect to your device</h1>
      </header>

      {pairing ? <div className="device-connect-primary device-connect-pairing" role="status" aria-live="polite">
        <span className="device-connect-target"><Router size={16}/><span><strong>CONFIRM ON THE PEDAL</strong><small>{pairing.address}</small></span></span>
        <strong className="device-connect-pin" aria-label={`Pairing PIN ${pairing.pin}`}>{pairing.pin}</strong>
        <Button size="lg" variant="outline" onClick={cancelPairing}>CANCEL</Button>
      </div> : <form className="device-connect-primary" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <span className="device-connect-target"><Router size={16}/><span><strong>{selectedProfile?.label ?? "Custom HeadRush"}</strong><small>{address}</small></span></span>
        <Button type="submit" size="lg" variant="primary" loading={busy} disabled={!address.trim()} aria-label="Connect to your device">{busy ? "CONNECTING" : "CONNECT"}<ArrowRight size={16}/></Button>
      </form>}

      {failure && !pairing && <div className="device-connect-recovery" role="alert">
        <AlertTriangle size={17}/><span><small>{failure}</small></span>
        <Button size="sm" variant="outline" aria-expanded={advanced} onClick={() => setAdvanced((open) => !open)}>Check advanced settings <ChevronDown className={advanced ? "expanded" : ""} size={14}/></Button>
      </div>}

      {advanced && <section className="device-connect-advanced" aria-label="Advanced connection settings">
                <div className="device-connect-fields">
          <label><span>HeadRush model</span><Select aria-label="HeadRush model" value={profile} disabled={busy} onChange={(event) => chooseProfile(event.target.value as DeviceProfileId)}><option value="flex-prime">Flex Prime</option><option value="prime">Prime</option><option value="core">Core</option><option value="custom">Custom URL or IP</option></Select></label>
          {profile === "custom" ? <label><span>Custom URL, hostname or IP</span><div><Network size={15}/><Input autoFocus value={address} disabled={busy} onChange={(event) => setAddress(event.target.value)} placeholder="http://192.168.1.100 or pedal.local" aria-label="Custom HeadRush address"/></div></label> : <div className="device-connect-known-address"><span>Default local address</span><strong>{selectedProfile?.address}</strong></div>}
        </div>
        <div className="device-connect-discovery">
          <Button variant="outline" loading={discovering} disabled={busy} onClick={() => void discover()}><Radar size={15}/> Scan network</Button>
        </div>
        {discovered.length > 0 && <div className="device-connect-results" aria-label="Discovered HeadRush devices">{discovered.map((candidate) => <button key={`${candidate.id}:${candidate.host}`} disabled={busy} onClick={() => { setProfile(profileForAddress(candidate.host)); setAddress(candidate.host); submit(candidate.host); }}><span><Check size={15}/></span><span><strong>{candidate.name}</strong><small>{candidate.host} · {candidate.model}</small></span><ArrowRight size={15}/></button>)}</div>}
      </section>}

    </div>
  </div>;
}
