import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/utils";
import { NameField } from "../components/rp/name-field";

export interface DisplayItem {
  id: string;
  label: string;
  /** Short prefix such as a rig number or scene letter. */
  tag?: string;
  /** Optional colour dot (rig colour). */
  color?: string;
}

export interface DisplayProps {
  /** Accessible name, e.g. "Rig" or "Scene". */
  name: string;
  items: DisplayItem[];
  /** Index of the active item, -1 when unknown. */
  index: number;
  /** Apply an item. */
  onCommit: (index: number) => void | Promise<unknown>;
  disabled?: boolean;
  /** Shows the "edited" dot (unsaved rig). */
  dirty?: boolean;
  /** Wrap from last to first item and back. */
  wrap?: boolean;
  className?: string;
  /** Text when no item is active. */
  placeholder?: string;
  /** Rename the active item; double-click on the value opens a name field. */
  onRename?: (name: string) => void | Promise<unknown>;
  /** Names the active item may not take (the other items). */
  taken?: readonly string[];
  /** Name suggestions for the rename field (wand). */
  suggest?: (variant: number) => string;
}

/**
 * NAMplify-style display: ◀ value ▶. The arrows step one item. A click on the value (or an arrow key
 * while it has focus) opens the whole list; only that list scrolls.
 */
export function Display({ name, items, index, onCommit, disabled, dirty, wrap = false, className, placeholder = "—", onRename, taken, suggest }: DisplayProps) {
  const [naming, setNaming] = useState(false);
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const count = items.length;
  const clamp = useCallback((next: number) => {
    if (!count) return -1;
    if (wrap) return ((next % count) + count) % count;
    return Math.max(0, Math.min(count - 1, next));
  }, [count, wrap]);

  const commit = useCallback((target: number) => {
    if (target < 0 || target === index) return;
    void onCommit(target);
  }, [index, onCommit]);

  // The list (click on the value): scrolls to the current item, closes on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView?.({ block: "center" });
    list.current?.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", away); window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", escape); };
  }, [open]);
  const pick = (target: number) => { setOpen(false); commit(target); };
  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = [...(list.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
    const at = options.indexOf(document.activeElement as HTMLElement);
    options[Math.max(0, Math.min(options.length - 1, at + (event.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };

  const item = index >= 0 ? items[index] : undefined;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!disabled && count) setOpen(true); }
    else if (event.key === "F2" && onRename && item) { event.preventDefault(); setOpen(false); setNaming(true); }
  };

  const atStart = !wrap && index <= 0;
  const atEnd = !wrap && (index < 0 || index >= count - 1);

  return <div ref={root} className={cn("rp-display", disabled && "rp-display--disabled", className)} role="group" aria-label={name}>
    <button type="button" className="rp-display__arrow" aria-label={`Previous ${name.toLowerCase()}`} disabled={disabled || atStart || !count} onClick={() => commit(clamp(index - 1))}>◀</button>
    {naming && onRename && item ? <NameField className="rp-display__name" label={`${name} name`} value={item.label} taken={taken} suggest={suggest} onCancel={() => setNaming(false)} onSubmit={async (next) => { await onRename(next); setNaming(false); }}/>
    : <button type="button" className="rp-display__value" disabled={disabled || !count} onKeyDown={onKeyDown} onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} onDoubleClick={onRename && item && !disabled ? () => { setOpen(false); setNaming(true); } : undefined} aria-label={`${name}: ${item ? `${item.tag ? `${item.tag} ` : ""}${item.label}` : placeholder}${dirty ? ", edited" : ""}. Click for the list.`}>
      {dirty && <i className="rp-display__dirty" aria-hidden="true"/>}
      {item?.color && <i className="rp-display__dot" style={{ background: item.color }} aria-hidden="true"/>}
      {item?.tag && <b>{item.tag}</b>}
      <span>{item?.label ?? placeholder}</span>
    </button>}
    <button type="button" className="rp-display__arrow" aria-label={`Next ${name.toLowerCase()}`} disabled={disabled || atEnd || !count} onClick={() => commit(clamp(index + 1))}>▶</button>
    {open && !naming && <div ref={list} className="rp-dial rp-dial--list" role="listbox" aria-label={`${name} list`} onKeyDown={onListKey}>
      {items.map((candidate, position) => <button key={candidate.id} type="button" role="option" aria-selected={position === index} className={cn("rp-dial__row", position === index && "on")} onClick={() => pick(position)}>
        {candidate.color && <i style={{ background: candidate.color }} aria-hidden="true"/>}{candidate.tag && <b>{candidate.tag}</b>}<span>{candidate.label}</span>
      </button>)}
    </div>}
  </div>;
}
