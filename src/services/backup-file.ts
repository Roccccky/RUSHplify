import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { parseRushplifyArchive, type RushplifyArchive } from "../domain/backup";

const safeName = (name: string) => name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\s+/g, "-").slice(0, 70) || "rushplify-backup";

export async function saveRushplifyArchive(archive: RushplifyArchive, suggestedName = "rushplify-backup") {
  const contents = JSON.stringify(archive, null, 2);
  if (isTauri()) {
    const path = await save({ defaultPath: `${safeName(suggestedName)}.rushplify.json`, filters: [{ name: "RUSHplify archive", extensions: ["json"] }] });
    if (!path) return null;
    await writeTextFile(path, contents);
    return path;
  }
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${safeName(suggestedName)}.rushplify.json`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return anchor.download;
}

export async function openRushplifyArchive() {
  if (!isTauri()) return null;
  const path = await open({ multiple: false, directory: false, filters: [{ name: "RUSHplify archive", extensions: ["json"] }] });
  if (!path) return null;
  return { archive: parseRushplifyArchive(JSON.parse(await readTextFile(path))), source: path };
}

export async function readRushplifyArchiveFile(file: File) {
  return parseRushplifyArchive(JSON.parse(await file.text()));
}
