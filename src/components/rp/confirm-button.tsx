import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Icon button for an action that cannot be undone (delete, restore). The first click arms it (red, label
 *  "Confirm …"), the second click runs it; it disarms after 3 s or on blur. Replaces `window.confirm`, which the
 *  Tauri WebView does not show. */
export function ConfirmButton({ label, children, disabled, className, onConfirm }: { label: string; children: ReactNode; disabled?: boolean; className?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const timer = window.setTimeout(() => setArmed(false), 3000); return () => window.clearTimeout(timer); }, [armed]);
  return <button type="button" className={cn("rp-ibtn rp-confirm", className)} data-armed={armed || undefined} aria-label={armed ? `Confirm: ${label}` : label} title={armed ? "Click again to confirm" : label} disabled={disabled}
    onBlur={() => setArmed(false)} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>{children}</button>;
}
