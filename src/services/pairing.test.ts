import { describe, expect, it, vi } from "vitest";
import { pairingFrom } from "./device-api";
import { pairingStep } from "./pairing";

describe("pairing with Authorize on", () => {
  it("reads the pairing state from the native error", () => {
    expect(pairingFrom('Pairing required: {"pairState":"pending","pairPin":"b56269","pairError":null}')).toEqual({ pairState: "pending", pairPin: "b56269", pairError: null });
    expect(pairingFrom(new Error('Pairing required: {"pairState":"notPaired"}'))).toEqual({ pairState: "notPaired" });
    expect(pairingFrom("Device returned HTTP 401: {}")).toBeNull();
    expect(pairingFrom("Pairing required: not json")).toBeNull();
    expect(pairingFrom(undefined)).toBeNull();
  });

  it("shows the PIN of a pairing that is already pending", async () => {
    const pair = vi.fn();
    await expect(pairingStep({ pairState: "pending", pairPin: "f0e3b7" }, pair)).resolves.toEqual({ pin: "f0e3b7" });
    expect(pair).not.toHaveBeenCalled();
  });

  it("asks the pedal to start pairing an unpaired computer", async () => {
    const pair = vi.fn().mockResolvedValue({ pairState: "pending", pairPin: "b56269" });
    await expect(pairingStep({ pairState: "notPaired" }, pair)).resolves.toEqual({ pin: "b56269" });
    expect(pair).toHaveBeenCalledOnce();
  });

  it("stops when the pedal denied, blocked or turned pairing off", async () => {
    const pair = vi.fn().mockResolvedValue({ pairState: "notPaired", pairError: "disabled" });
    await expect(pairingStep({ pairState: "notPaired", pairError: "denied" }, pair)).resolves.toEqual({ error: "Pairing was denied on the HeadRush." });
    await expect(pairingStep({ pairState: "notPaired", pairError: "blocked" }, pair)).resolves.toEqual({ error: "This computer is blocked on the HeadRush." });
    expect(pair).not.toHaveBeenCalled();
    await expect(pairingStep({ pairState: "notPaired" }, pair)).resolves.toEqual({ error: "Pairing is turned off on the HeadRush." });
  });
});
