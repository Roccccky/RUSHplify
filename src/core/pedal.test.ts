import { describe, expect, it, vi } from "vitest";
import { PedalError, errorFrom, fanOut, objectPath, routes, toEvent } from "./pedal";
import { demoPedal } from "./transport/demo";
import { httpPedal } from "./transport/http";

describe("pedal core", () => {
  it("builds the pedal's routes", () => {
    expect(objectPath("Evil/API/Rigs/")).toBe("/Evil/API/Rigs");
    expect(routes.properties("/Evil/API/RigSaveDialog")).toBe("/api/v1/object-properties/Evil/API/RigSaveDialog");
    expect(routes.method("Evil/API/FileAccess", "ls")).toBe("/api/v1/object-method/Evil/API/FileAccess/ls");
    expect(routes.file("/Evil/Web/Blocks/img/Amp One.webp")).toBe("/files/Evil/Web/Blocks/img/Amp%20One.webp");
    expect(routes.file("files/Evil/x.webp")).toBe("/files/Evil/x.webp");
  });

  it("reads the pedal's error body and its WebSocket messages", () => {
    const error = errorFrom(404, { desc: "DataModel: Object not found", reason: "Not Found", status: 404 }, "/Evil/Nope");
    expect(error).toBeInstanceOf(PedalError);
    expect([error.message, error.status]).toEqual(["DataModel: Object not found", 404]);
    expect(errorFrom(500, "boom", "/x").message).toBe("Pedal answered HTTP 500");
    expect(toEvent({ notification: "propertyValueChanged", objectPath: "/Evil/Engine/AudioCtrl/Input", propertyName: "TunerOn", propertyValue: true }))
      .toEqual({ path: "/Evil/Engine/AudioCtrl/Input", name: "TunerOn", value: true });
    expect(toEvent({ notification: "somethingElse" })).toBeNull();
    expect(toEvent("text")).toBeNull();
  });

  it("opens one source for many listeners and closes it after the last", () => {
    const close = vi.fn(); const open = vi.fn(() => close);
    const watch = fanOut(open);
    const stopA = watch(() => {}); const stopB = watch(() => {});
    expect(open).toHaveBeenCalledTimes(1);
    stopA(); expect(close).not.toHaveBeenCalled();
    stopB(); stopB(); expect(close).toHaveBeenCalledTimes(1);
    watch(() => {}); expect(open).toHaveBeenCalledTimes(2);
  });
});

describe("demo pedal", () => {
  const tree = () => ({ "/Evil/Engine/AudioCtrl/Input": { TunerOn: false }, "/Evil/API/FileAccess": {} });

  it("reads, writes and broadcasts like the pedal", async () => {
    const pedal = demoPedal(tree());
    const events: unknown[] = [];
    const stop = pedal.watch((event) => events.push(event));
    await pedal.set("Evil/Engine/AudioCtrl/Input", { TunerOn: true });
    expect(events).toEqual([]); // answered first, broadcast afterwards
    await new Promise((resolve) => setTimeout(resolve));
    expect(events).toEqual([{ path: "/Evil/Engine/AudioCtrl/Input", name: "TunerOn", value: true }]);
    expect(await pedal.get("/Evil/Engine/AudioCtrl/Input")).toEqual({ TunerOn: true });
    stop();
  });

  it("refuses unknown objects, properties and methods with the pedal's messages", async () => {
    const pedal = demoPedal(tree(), { "/Evil/API/FileAccess/ls": () => ["Rigs", "Setlists"] });
    await expect(pedal.get("/Evil/Nope")).rejects.toThrow("Object not found");
    await expect(pedal.set("/Evil/Engine/AudioCtrl/Input", { Nope: 1 })).rejects.toThrow("Object property not found");
    await expect(pedal.call("/Evil/API/FileAccess", "nope")).rejects.toThrow("Object method not found");
    expect(await pedal.call("/Evil/API/FileAccess", "ls", ["", 0])).toEqual(["Rigs", "Setlists"]);
    expect(pedal.log).toEqual([{ kind: "call", path: "/Evil/API/FileAccess/ls", detail: ["", 0] }]);
  });

  it("does not share state with the tree it was given", async () => {
    const source = tree(); const pedal = demoPedal(source);
    await pedal.set("/Evil/Engine/AudioCtrl/Input", { TunerOn: true });
    expect(source["/Evil/Engine/AudioCtrl/Input"].TunerOn).toBe(false);
    const copy = await pedal.get("/Evil/Engine/AudioCtrl/Input"); copy.TunerOn = "changed";
    expect(pedal.peek("/Evil/Engine/AudioCtrl/Input")?.TunerOn).toBe(true);
  });
});

describe("http pedal", () => {
  const reply = (status: number, body: unknown) => new Response(body === undefined ? "" : JSON.stringify(body), { status });

  it("sends the pedal's verbs and unwraps method results", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(reply(200, { displayDialog: false }))
      .mockResolvedValueOnce(reply(200, undefined))
      .mockResolvedValueOnce(reply(200, { methodReturnValue: ["Rigs"] }));
    const pedal = httpPedal("http://pedal.local/", undefined, fetcher);
    expect(await pedal.get("/Evil/API/RigSaveDialog")).toEqual({ displayDialog: false });
    await pedal.set("/Evil/Engine/AudioCtrl/Input", { TunerOn: true });
    expect(await pedal.call("/Evil/API/FileAccess", "ls", ["", 0])).toEqual(["Rigs"]);
    const [get, put, post] = fetcher.mock.calls;
    expect(get[0]).toBe("http://pedal.local/api/v1/object-properties/Evil/API/RigSaveDialog");
    expect([put[1]?.method, put[1]?.body]).toEqual(["PUT", JSON.stringify({ TunerOn: true })]);
    expect([post[0], post[1]?.body]).toEqual(["http://pedal.local/api/v1/object-method/Evil/API/FileAccess/ls", JSON.stringify({ arguments: ["", 0] })]);
  });

  it("turns the pedal's error body into a PedalError", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply(404, { desc: "DataModel: Object not found", reason: "Not Found", status: 404 }));
    await expect(httpPedal("http://pedal.local", undefined, fetcher).get("/Evil/Nope")).rejects.toMatchObject({ status: 404, message: "DataModel: Object not found" });
  });
});
