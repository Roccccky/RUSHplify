/** The one way the app talks to the pedal. Every room builds on these five calls; a transport (Tauri bridge,
 *  plain HTTP for a helper or dev proxy, demo) decides how they travel. */

export type Props = Record<string, unknown>;

/** One property change, as the pedal broadcasts it over its WebSocket. */
export interface PedalEvent { path: string; name: string; value: unknown }

export type Unsubscribe = () => void;
export type WatchStatus = "open" | "retry" | "closed";

export interface Pedal {
  /** Host the transport talks to ("headrushflexprime.local", "demo"). */
  readonly host: string;
  get(path: string): Promise<Props>;
  set(path: string, props: Props): Promise<void>;
  call<T = unknown>(path: string, method: string, args?: unknown[]): Promise<T>;
  /** Every change on the pedal; filter by `path`. One socket however many listeners. */
  watch(onEvent: (event: PedalEvent) => void, onStatus?: (status: WatchStatus) => void): Unsubscribe;
  /** Bytes of a file the pedal serves under `/files/` (block pictures). */
  file(path: string): Promise<Uint8Array>;
}

export class PedalError extends Error {
  constructor(message: string, readonly status = 0, readonly path = "") { super(message); this.name = "PedalError"; }
}

/** "Evil/API/Rigs/" → "/Evil/API/Rigs". */
export const objectPath = (path: string) => `/${path.trim().replace(/^\/+|\/+$/g, "")}`;

/** HTTP route for each call, relative to the pedal's root. */
export const routes = {
  properties: (path: string) => `/api/v1/object-properties${objectPath(path)}`,
  method: (path: string, method: string) => `/api/v1/object-method${objectPath(path)}/${encodeURIComponent(method)}`,
  file: (path: string) => encodeURI(`/files${objectPath(path.replace(/^\/?files\//, ""))}`),
};

/** The pedal's error body is `{desc, reason, status}`; anything else becomes a generic message. */
export function errorFrom(status: number, body: unknown, path: string): PedalError {
  const desc = body && typeof body === "object" && "desc" in body ? String((body as { desc: unknown }).desc) : "";
  return new PedalError(desc || `Pedal answered HTTP ${status}`, status, path);
}

/** Raw WebSocket JSON → event, or null for anything that is not a property change. */
export function toEvent(raw: unknown): PedalEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const message = raw as Record<string, unknown>;
  if (message.notification !== "propertyValueChanged" || typeof message.objectPath !== "string" || typeof message.propertyName !== "string") return null;
  return { path: message.objectPath, name: message.propertyName, value: message.propertyValue };
}

/** Fan one event source out to many listeners, opening the source on the first and closing it after the last. */
export function fanOut(open: (emit: (event: PedalEvent) => void, status: (status: WatchStatus) => void) => Unsubscribe) {
  const listeners = new Set<{ onEvent: (event: PedalEvent) => void; onStatus?: (status: WatchStatus) => void }>();
  let close: Unsubscribe | null = null;
  return (onEvent: (event: PedalEvent) => void, onStatus?: (status: WatchStatus) => void): Unsubscribe => {
    const listener = { onEvent, onStatus };
    listeners.add(listener);
    close ??= open((event) => listeners.forEach((each) => each.onEvent(event)), (status) => listeners.forEach((each) => each.onStatus?.(status)));
    return () => {
      if (!listeners.delete(listener) || listeners.size) return;
      close?.(); close = null;
    };
  };
}
