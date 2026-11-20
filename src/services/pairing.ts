import type { PairingState } from "./device-api";

/** What the connection screen shows next: the PIN to confirm on the pedal, or why pairing stopped. */
export type PairingOutcome = { pin: string } | { error: string };

/** Follows the pedal's own editor: a pending pairing shows its PIN; an unpaired computer asks the pedal to
 *  start pairing, unless the pedal has denied or blocked it. */
export async function pairingStep(state: PairingState, pair: () => Promise<PairingState>): Promise<PairingOutcome> {
  if (state.pairState === "pending" && state.pairPin) return { pin: state.pairPin };
  if (state.pairError === "denied") return { error: "Pairing was denied on the HeadRush." };
  if (state.pairError === "blocked") return { error: "This computer is blocked on the HeadRush." };
  const next = await pair();
  if (next.pairState === "pending" && next.pairPin) return { pin: next.pairPin };
  if (next.pairError === "disabled") return { error: "Pairing is turned off on the HeadRush." };
  if (next.pairError === "denied") return { error: "Pairing was denied on the HeadRush." };
  if (next.pairError === "blocked") return { error: "This computer is blocked on the HeadRush." };
  return { error: "The HeadRush did not start pairing. Try again." };
}
