/** RUSHplify rooms. Each room groups existing workspaces (store `page` ids) as sections.
 * Pages stay as they are; rooms only decide where they appear. */
export interface RoomSection {
  /** Store page id rendered for this section. */
  page: string;
  label: string;
}

export interface Room {
  id: "rig" | "library" | "tools" | "system";
  label: string;
  sections: RoomSection[];
}

export const ROOMS: Room[] = [
  // RIG holds chain, controls (pedal row) and tones (browser tab); "tone-cloud" opens it with TONES.
  { id: "rig", label: "RIG", sections: [{ page: "editor", label: "CHAIN" }] },
  { id: "library", label: "LIBRARY", sections: [{ page: "setlists", label: "SETLISTS" }, { page: "files", label: "FILES" }, { page: "library", label: "BACKUP" }] },
  // TOOLS: tuner, drums, global EQ on one page (tool list left); STAGE = the performance pads (Stage).
  { id: "tools", label: "TOOLS", sections: [{ page: "tools", label: "TOOLS" }, { page: "live", label: "STAGE" }] },
  { id: "system", label: "SYSTEM", sections: [{ page: "settings", label: "SETTINGS" }, { page: "diagnostics", label: "DIAGNOSTICS" }] },
];

/** Rooms shown as tabs in the header. SYSTEM is reached through the ⚙ button. */
export const MAIN_ROOMS = ROOMS.filter((room) => room.id !== "system");

export const DEFAULT_PAGE = "editor";

export function roomForPage(page: string): Room {
  if (page === "tone-cloud" || page === "assignments") return ROOMS[0];
  // "rigs" (Ctrl+K, old links) is the SETLISTS page: its rig column holds load, rename, duplicate, delete.
  if (page === "rigs") return ROOMS[1];
  return ROOMS.find((room) => room.sections.some((section) => section.page === page)) ?? ROOMS[0];
}

const STORAGE_KEY = "rushplify-room-pages";

/** Last visited section per room, so switching rooms returns to where you were. */
export function rememberedPage(room: Room): string {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
    const page = saved[room.id];
    if (page && room.sections.some((section) => section.page === page)) return page;
  } catch { /* storage unavailable or corrupt: fall back to the first section */ }
  return room.sections[0].page;
}

export function rememberPage(page: string) {
  const room = roomForPage(page);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, [room.id]: page }));
  } catch { /* storage unavailable: remembering is a convenience only */ }
}
