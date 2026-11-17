import { PedalError, fanOut, objectPath, type Pedal, type PedalEvent, type Props } from "../pedal";

/** Answers a method call in the demo; may change the tree through `set`. */
export type DemoMethod = (args: unknown[], pedal: DemoPedal) => unknown;

export interface DemoPedal extends Pedal {
  /** Every write and call, in order, for tests. */
  readonly log: Array<{ kind: "set" | "call"; path: string; detail: unknown }>;
  /** Current state of one object. */
  peek(path: string): Props | undefined;
}

/** No pedal: an in-memory object tree that behaves like one. Writes broadcast events like the real WebSocket,
 *  so the UI follows the same path with and without a pedal. */
export function demoPedal(tree: Record<string, Props>, methods: Record<string, DemoMethod> = {}): DemoPedal {
  const objects = new Map(Object.entries(tree).map(([path, props]) => [objectPath(path), structuredClone(props)]));
  const listeners = new Set<(event: PedalEvent) => void>();
  const log: DemoPedal["log"] = [];
  const find = (path: string) => {
    const object = objects.get(objectPath(path));
    if (!object) throw new PedalError("DataModel: Object not found", 404, path);
    return object;
  };
  const pedal: DemoPedal = {
    host: "demo",
    log,
    peek: (path) => objects.get(objectPath(path)),
    get: async (path) => structuredClone(find(path)),
    set: async (path, props) => {
      const object = find(path);
      for (const name of Object.keys(props)) if (!(name in object)) throw new PedalError("DataModel: Object property not found", 404, path);
      log.push({ kind: "set", path: objectPath(path), detail: props });
      for (const [name, value] of Object.entries(props)) {
        object[name] = structuredClone(value);
        // The real pedal answers the write first and broadcasts afterwards.
        setTimeout(() => listeners.forEach((emit) => emit({ path: objectPath(path), name, value })));
      }
    },
    call: async <T,>(path: string, method: string, args: unknown[] = []) => {
      find(path);
      const handler = methods[`${objectPath(path)}/${method}`];
      if (!handler) throw new PedalError("DataModel: Object method not found", 404, path);
      log.push({ kind: "call", path: `${objectPath(path)}/${method}`, detail: args });
      return (await handler(args, pedal)) as T;
    },
    file: async (path) => { throw new PedalError("No files in the demo", 404, path); },
    watch: fanOut((emit, status) => {
      listeners.add(emit); queueMicrotask(() => status("open"));
      return () => { listeners.delete(emit); status("closed"); };
    }),
  };
  return pedal;
}
