import { useEffect, useState } from "react";
import type { Parameter } from "../domain/types";
import { deviceApi } from "../services/device-api";

/** Every file of one type under a pedal folder (e.g. all IRs under `Impulse Responses`), as full paths.
 *  Hidden folders (`.demo`) are skipped. Read once per session and type; `refresh` reads again. */
const cache = new Map<string, Promise<string[]>>();
/** Without a pedal: a few files so the demo card has something to step through. */
const DEMO: Record<string, string[]> = {
  "Impulse Responses": ["Choptones/CT-Bogna412V30T75-57421.wav", "Choptones/CT-Mesa412V30-SM57.wav", "Choptones/CT-Fender212C12N-R121.wav", "User/Marshall 1960A V30 57.wav", "User/Vox AC30 Blue 121.wav"].map((file) => `Impulse Responses/${file}`),
};

export function deviceLibrary(startPath: string, fileType: number, refresh = false): Promise<string[]> {
  const key = `${fileType}:${startPath}`;
  if (!refresh && cache.has(key)) return cache.get(key)!;
  const walk = async (path: string, depth: number): Promise<string[]> => {
    const [folders, files] = await Promise.all([
      depth < 3 ? deviceApi.listDeviceFiles(path, "folders").catch(() => [] as string[]) : Promise.resolve([] as string[]),
      deviceApi.listDeviceFiles(path, fileType).catch(() => [] as string[]),
    ]);
    const nested = await Promise.all(folders.filter((folder) => !folder.startsWith(".")).map((folder) => walk(`${path}/${folder}`, depth + 1)));
    return [...files.map((file) => `${path}/${file}`), ...nested.flat()];
  };
  const listing = (deviceApi.isNative() ? walk(startPath, 0) : Promise.resolve([...(DEMO[startPath] ?? [])]))
    .then((paths) => paths.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })))
    .catch(() => { cache.delete(key); return [] as string[]; });
  cache.set(key, listing);
  return listing;
}

export const fileStem = (path: string) => (path.split("/").at(-1) ?? path).replace(/\.[^.]+$/, "");
/** Folder below the start folder ("Impulse Responses/User/x.wav" → "User"); the start folder's own name at the top. */
export const fileFolder = (path: string, startPath: string) => {
  const folder = path.slice(0, Math.max(0, path.lastIndexOf("/")));
  return folder.startsWith(`${startPath}/`) ? folder.slice(startPath.length + 1) : folder || startPath;
};
/** "IR File" → "IR", "Clone File" → "Clone", "Reverb File" → "Reverb". */
export const fileRowLabel = (parameter: Parameter) => parameter.label.replace(/\s*file\s*\d*$/i, "").trim() || "File";

/** The files a file parameter can take, with the loaded one always in the list (also without a pedal). */
export function useDeviceLibrary(parameter: Parameter | undefined) {
  const file = parameter?.deviceFile;
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    if (!file) return;
    let disposed = false;
    void deviceLibrary(file.startPath, file.fileType).then((items) => { if (!disposed) setPaths(items); });
    return () => { disposed = true; };
  }, [file?.startPath, file?.fileType]);
  const loaded = typeof parameter?.value === "string" ? parameter.value : "";
  return loaded && !paths.includes(loaded) ? [loaded, ...paths] : paths;
}
