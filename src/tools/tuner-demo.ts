/** Tuner readout for the demo without a pedal: each string starts off pitch and settles in tune. */
const STRINGS = ["E", "A", "D", "G", "B", "E"];
const START_CENTS = [-34, 22, -18, 41, -12, 27];
const STRING_MS = 3200;

export function demoTunerReadout(now = Date.now()): Record<string, unknown> {
  const index = Math.floor(now / STRING_MS) % STRINGS.length;
  const progress = (now % STRING_MS) / STRING_MS;
  const settle = Math.min(1, progress / 0.7);
  const cents = START_CENTS[index] * (1 - settle) ** 2 + Math.sin(now / 90) * 0.6;
  return { TunerString: STRINGS[index], TunerCents: cents, TunerRef: 440, TunerLow: false };
}
