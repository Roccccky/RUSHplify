import { errorFrom, fanOut, routes, toEvent, type Pedal, type Props } from "../pedal";

/** Plain fetch + WebSocket. Works wherever the pedal is reachable without CORS: Node, a local helper or the
 *  dev proxy. `base` is the pedal's root ("http://headrushflexprime.local") or a proxy prefix ("/pedal"). */
export function httpPedal(base: string, socket = base.replace(/^http/, "ws"), fetcher: typeof fetch = fetch): Pedal {
  const root = base.replace(/\/+$/, "");
  const send = async (method: string, route: string, body?: unknown) => {
    const response = await fetcher(`${root}${route}`, {
      method, headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text.trim()) { try { parsed = JSON.parse(text); } catch { parsed = text; } }
    if (!response.ok) throw errorFrom(response.status, parsed, route);
    return parsed;
  };
  return {
    host: root,
    get: async (path) => ((await send("GET", routes.properties(path))) ?? {}) as Props,
    set: async (path, props) => { await send("PUT", routes.properties(path), props); },
    call: async <T,>(path: string, method: string, args: unknown[] = []) => ((await send("POST", routes.method(path, method), { arguments: args })) as { methodReturnValue?: T } | null)?.methodReturnValue as T,
    file: async (path) => {
      const response = await fetcher(`${root}${routes.file(path)}`);
      if (!response.ok) throw errorFrom(response.status, null, path);
      return new Uint8Array(await response.arrayBuffer());
    },
    watch: fanOut((emit, status) => {
      let stopped = false; let ws: WebSocket | null = null; let timer: ReturnType<typeof setTimeout> | undefined; let wait = 1000;
      const connect = () => {
        ws = new WebSocket(`${socket.replace(/\/+$/, "")}/`);
        ws.onopen = () => { wait = 1000; status("open"); };
        ws.onmessage = (message) => { try { const event = toEvent(JSON.parse(String(message.data))); if (event) emit(event); } catch { /* not JSON */ } };
        ws.onclose = () => { if (stopped) return; status("retry"); timer = setTimeout(connect, wait); wait = Math.min(wait * 2, 10_000); };
      };
      connect();
      return () => { stopped = true; clearTimeout(timer); ws?.close(); status("closed"); };
    }),
  };
}
