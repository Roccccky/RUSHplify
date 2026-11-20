/* Names of rigs, setlists and block presets. The pedal stores each one as a file named after it
   (`Rigs/<name>.rig`, `Setlists/<name>.setlist`, `Blocks/<model>/<name>.block`). Factory and user names
   use `# + & ' ( ) _` freely, so only characters a file name cannot hold are refused. */

export const NAME_MAX_LENGTH = 64;
const FORBIDDEN = /[/\\:*?"<>|\u0000-\u001f\u007f]/;

export type NameProblem = "empty" | "characters" | "length" | "dots" | "taken";

export const NAME_PROBLEM_TEXT: Record<NameProblem, string> = {
  empty: "Name required",
  characters: "Not allowed: / \\ : * ? \" < > |",
  length: `Max ${NAME_MAX_LENGTH} characters`,
  dots: "Cannot start or end with a dot",
  taken: "Name already used",
};

/** Problem with a new name, or null when the pedal can store it. `taken` compares without case,
 *  as the pedal's file system on macOS/FAT does; the current name itself never counts as taken. */
export function nameProblem(raw: string, taken: readonly string[] = [], current = ""): NameProblem | null {
  const name = raw.trim();
  if (!name) return "empty";
  if (FORBIDDEN.test(name)) return "characters";
  if (name.length > NAME_MAX_LENGTH) return "length";
  if (name.startsWith(".") || name.endsWith(".")) return "dots";
  const key = name.toLocaleLowerCase();
  if (key !== current.trim().toLocaleLowerCase() && taken.some((other) => other.trim().toLocaleLowerCase() === key)) return "taken";
  return null;
}
