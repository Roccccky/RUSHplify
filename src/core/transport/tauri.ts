import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { errorFrom, fanOut, routes, toEvent, type Pedal, type Props, type WatchStatus } from "../pedal";

interface Reply { status: number; body: unknown }

/** Through the Rust bridge (`src-tauri/src/bridge.rs`): the pedal refuses web pages from other origins. */
export function tauriPedal(host: string): Pedal {
  const send = async (method: string, path: string, body?: unknown) => {
    const reply = await invoke<Reply>("pedal_request", { host, method, path, body: body ?? null });
    if (reply.status < 200 || reply.status >= 300) throw errorFrom(reply.status, reply.body, path);
    return reply.body;
  };
  return {
    host,
    get: async (path) => ((await send("GET", routes.properties(path))) ?? {}) as Props,
    set: async (path, props) => { await send("PUT", routes.properties(path), props); },
    call: async <T,>(path: string, method: string, args: unknown[] = []) => ((await send("POST", routes.method(path, method), { arguments: args })) as { methodReturnValue?: T } | null)?.methodReturnValue as T,
    file: async (path) => new Uint8Array(await invoke<ArrayBuffer>("pedal_file", { host, path: routes.file(path) })),
    watch: fanOut((emit, status) => {
      const stops = [
        listen<unknown>("pedal-event", (message) => { const event = toEvent(message.payload); if (event) emit(event); }),
        listen<WatchStatus>("pedal-status", (message) => status(message.payload)),
      ];
      void Promise.all(stops).then(() => invoke("pedal_watch", { host }));
      return () => { void invoke("pedal_unwatch"); void Promise.all(stops).then((each) => each.forEach((stop) => stop())); status("closed"); };
    }),
  };
}

/** Pedal names that answer on this network. */
export const discoverPedals = () => invoke<string[]>("pedal_discover");
