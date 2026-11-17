import { cn } from "../../lib/utils";

/** Product name and version. The version must match package.json, tauri.conf.json and Cargo.toml (see brand.test.tsx). */
export const APP_NAME = "RUSHplify";
export const APP_VERSION = "0.1.0";

/** Mark: a flat NAMplify-style knob (arc + pointer). No third-party logos. */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return <svg className={cn("rp-mark", className)} viewBox="0 0 32 32" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
    <rect width="32" height="32" rx="7" fill="var(--rp-mark-bg, #121212)"/>
    <path d="M9.64 22.36A9 9 0 1 1 22.36 22.36" fill="none" stroke="var(--rp-mark-track, #333)" strokeWidth="2.6" strokeLinecap="round"/>
    <path d="M9.64 22.36A9 9 0 0 1 16 7" fill="none" stroke="var(--rp-mark-hl, #d0423a)" strokeWidth="2.6" strokeLinecap="round"/>
    <path d="M16 16 16 9.6" stroke="var(--rp-mark-ink, #e8e8e8)" strokeWidth="2.4" strokeLinecap="round"/>
  </svg>;
}

/** Monospace wordmark. `size="lg"` for the connection and welcome dialogs. */
export function Brand({ className, size = "sm", mark = false }: { className?: string; size?: "sm" | "lg"; mark?: boolean }) {
  return <span className={cn("rp-brand", `rp-brand--${size}`, className)} role="img" aria-label={APP_NAME}>
    {mark && <BrandMark/>}
    <span className="rp-brand__word" aria-hidden="true">RUSHPLIFY</span>
  </span>;
}
