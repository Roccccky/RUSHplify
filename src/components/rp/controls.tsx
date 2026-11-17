/* RUSHplify design sheet: the NAMplify parts (knob, rail toggle, screen with stepped rows,
   footswitch disc, segmented well, pedal tile, card shell). Same part looks the same everywhere. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import type { Parameter } from "../../domain/types";
import { ParameterControl } from "../system/controls";
import "../../styles/rp-controls.css";

type Style = React.CSSProperties & Record<`--${string}`, string | number>;

const R = 42, CX = 50, CY = 50;
const A0 = -225 * Math.PI / 180, A1 = 45 * Math.PI / 180;
const point = (angle: number, radius = R) => [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)] as const;
function arc(from: number, to: number) {
  const [x0, y0] = point(from); const [x1, y1] = point(to);
  return `M ${x0} ${y0} A ${R} ${R} 0 ${Math.abs(to - from) > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const format = (value: number, unit?: string) => `${Number.isInteger(value) ? value : Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1)}${unit ? ` ${unit}` : ""}`;

/** Ring knob. Drag up/down, wheel, arrow keys; double-click returns to `reset` when given. */
export function Knob({ label, value, min = 0, max = 100, step, unit, colour, small, disabled, reset, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; colour?: string; small?: boolean; disabled?: boolean; reset?: number; onChange: (value: number) => void;
}) {
  const span = max - min || 1; const unitStep = step ?? span / 100;
  const fraction = clamp((value - min) / span, 0, 1);
  const angle = A0 + (A1 - A0) * fraction; const [qx, qy] = point(angle, 26); const [px, py] = point(angle, 40);
  const drag = useRef<{ y: number; value: number } | null>(null);
  const snap = (next: number) => { const stepped = step ? Math.round((next - min) / step) * step + min : next; return clamp(Number(stepped.toFixed(4)), min, max); };
  const commit = (next: number) => { const value = snap(next); onChange(value); };
  return <div className={cn("rp-knob", small && "rp-knob--small")} data-disabled={disabled || undefined} style={colour ? { "--knob-colour": colour } as Style : undefined}>
    <div className="rp-knob__dial" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format(value, unit)} aria-disabled={disabled || undefined}
      onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture?.(event.pointerId); drag.current = { y: event.clientY, value }; }}
      onPointerMove={(event) => { if (!drag.current) return; const delta = (drag.current.y - event.clientY) / (event.shiftKey ? 600 : 160); commit(drag.current.value + delta * span); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onWheel={(event) => { if (disabled) return; event.preventDefault(); commit(value + (event.deltaY < 0 ? 1 : -1) * unitStep * (event.shiftKey ? 1 : 2)); }}
      onDoubleClick={() => { if (reset !== undefined && !disabled) commit(reset); }}
      onKeyDown={(event) => {
        const keys: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
        if (event.key === "Home") { event.preventDefault(); commit(min); return; }
        if (event.key === "End") { event.preventDefault(); commit(max); return; }
        if (keys[event.key] === undefined) return; event.preventDefault(); commit(value + keys[event.key] * unitStep * (event.shiftKey ? 10 : 1));
      }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path className="rp-knob__bg" d={arc(A0, A1)}/>
        {fraction > 0.001 && <path className="rp-knob__fg" d={arc(A0, angle)}/>}
        <circle className="rp-knob__cap" cx={CX} cy={CY} r={30}/>
        <line className="rp-knob__pointer" x1={qx} y1={qy} x2={px} y2={py}/>
      </svg>
    </div>
    <span className="rp-knob__caption"><span className="rp-knob__name">{label}</span><span className="rp-knob__value">{format(value, unit)}</span></span>
  </div>;
}

/** Horizontal slider: name, well track with colour fill and cap, value. Drag or click the track, arrow keys,
 *  wheel while focused (so the card still scrolls), double-click returns to `reset` when given. */
export function Fader({ label, value, min = 0, max = 100, step, unit, colour, disabled, reset, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; colour?: string; disabled?: boolean; reset?: number; onChange: (value: number) => void;
}) {
  const span = max - min || 1; const unitStep = step ?? span / 100;
  const fraction = clamp((value - min) / span, 0, 1);
  const track = useRef<HTMLDivElement>(null); const dragging = useRef(false);
  const snap = (next: number) => { const stepped = step ? Math.round((next - min) / step) * step + min : next; return clamp(Number(stepped.toFixed(4)), min, max); };
  const fromPointer = (clientX: number) => { const rect = track.current?.getBoundingClientRect(); if (!rect || !rect.width) return; onChange(snap(min + clamp((clientX - rect.left) / rect.width, 0, 1) * span)); };
  return <div className="rp-fader" data-disabled={disabled || undefined} style={colour ? { "--knob-colour": colour } as Style : undefined}>
    <span className="rp-fader__label" title={label}>{label}</span>
    <div ref={track} className="rp-fader__track" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-orientation="horizontal" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format(value, unit)} aria-disabled={disabled || undefined}
      onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture?.(event.pointerId); event.currentTarget.focus(); dragging.current = true; fromPointer(event.clientX); }}
      onPointerMove={(event) => { if (dragging.current) fromPointer(event.clientX); }}
      onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}
      onWheel={(event) => { if (disabled || document.activeElement !== event.currentTarget) return; onChange(snap(value + (event.deltaY < 0 ? 1 : -1) * unitStep * (event.shiftKey ? 1 : 2))); }}
      onDoubleClick={() => { if (reset !== undefined && !disabled) onChange(snap(reset)); }}
      onKeyDown={(event) => {
        const keys: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
        if (event.key === "Home") { event.preventDefault(); onChange(min); return; }
        if (event.key === "End") { event.preventDefault(); onChange(max); return; }
        if (keys[event.key] === undefined) return; event.preventDefault(); onChange(snap(value + keys[event.key] * unitStep * (event.shiftKey ? 10 : 1)));
      }}>
      <span className="rp-fader__fill" style={{ width: `${fraction * 100}%` }}/>
      <span className="rp-fader__cap" style={{ left: `${fraction * 100}%` }}/>
    </div>
    <span className="rp-fader__value">{format(value, unit)}</span>
  </div>;
}

/** Rail toggle with a word, NAMplify style. `label` is the accessible name. */
export function RailToggle({ label, text, icon, on, colour, disabled, onChange }: { label: string; text?: string; icon?: ReactNode; on: boolean; colour?: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className="rp-rail" data-on={on} style={colour ? { "--knob-colour": colour } as Style : undefined} onClick={() => onChange(!on)}>
    <span className="rp-rail__track"><span className="rp-rail__dot"/></span>
    {icon && <span className="rp-rail__icon" aria-hidden="true">{icon}</span>}
    {text && <span className="rp-rail__text">{text}</span>}
  </button>;
}

const ARROW_ROWS = [[2], [1, 2], [0, 1, 2], [1, 2], [2]];
/** NAMplify pixel arrow (3 × 5 cells). */
export const PixelArrow = ({ right, className }: { right?: boolean; className?: string }) => <svg className={cn("rp-screen__arrow", right && "right", className)} viewBox="0 0 3 5" shapeRendering="crispEdges" aria-hidden="true">{ARROW_ROWS.flatMap((row, y) => row.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1}/>))}</svg>;
const Arrow = PixelArrow;

export interface ScreenMenuItem { value: string; text: string; sub?: string; picture?: ReactNode }
export interface ScreenRow { key: string; text: string; label: string; sub?: string; menu?: ScreenMenuItem[]; optionText?: (option: string) => string; options?: string[]; value?: string; onStep?: (direction: -1 | 1) => void; onPick?: (value: string) => void; onOpen?: () => void; disabled?: boolean; hint?: boolean;
  /** Turquoise caption (a preview, not what is stored). */
  accent?: boolean;
  /** Small turquoise tag at the right end of the row, e.g. PREVIEW. */
  tag?: string;
  /** Button at the end of the row (replaces the ▶ arrow), e.g. STORE ON PEDAL. */
  action?: { text: string; label: string; disabled?: boolean; onClick: () => void } }

/** The card display: dark screen, one row per line, each with its own ◀ ▶. `labelled` stacks dependent
 *  dropdowns with a caption per row (CATEGORY → MODEL → PRESET). A row with options
 *  opens a native list on click (the wheel of NAMplify, keyboard-accessible here). */
export function Screen({ rows, colour, className, labelled }: { rows: ScreenRow[]; colour?: string; className?: string; labelled?: boolean }) {
  return <div className={cn("rp-screen", labelled && "rp-screen--labelled", className)} style={colour ? { "--screen-colour": colour } as Style : undefined}>
    {rows.map((row, index) => <div key={row.key} className={cn("rp-screen__row", labelled ? "rp-screen__row--main" : index === 0 ? "rp-screen__row--main" : "rp-screen__row--sub", row.accent && "rp-screen__row--accent")}>
      {labelled && <small className="rp-screen__label" aria-hidden="true">{row.label.toUpperCase()}</small>}
      {!row.hint && <button type="button" aria-label={`Previous ${row.label}`} disabled={row.disabled || !row.onStep} onClick={() => row.onStep?.(-1)}><Arrow/></button>}
      {row.onOpen
        ? <button type="button" className={cn("rp-screen__text rp-screen__pick", row.hint && "rp-screen__hint")} aria-label={row.label} disabled={row.disabled} onClick={row.onOpen}><span>{row.text}</span></button>
        : row.menu && row.onPick
        ? <ScreenMenu row={row}/>
        : row.options && row.onPick
        // Same pop-up list as a menu row: a plain click opens it (a hidden native select did not open in the webview).
        ? <ScreenMenu row={{ ...row, menu: row.options.map((option) => ({ value: option, text: row.optionText?.(option) ?? (option || "Default") })) }}/>
        : <span className="rp-screen__text" aria-label={row.label}>{row.text}{row.sub && <small className="rp-screen__sub">{row.sub}</small>}</span>}
      {row.tag && <em className="rp-screen__tag">{row.tag}</em>}
      {!row.hint && !row.action && <button type="button" aria-label={`Next ${row.label}`} disabled={row.disabled || !row.onStep} onClick={() => row.onStep?.(1)}><Arrow right/></button>}
      {row.action && <button type="button" className="rp-screen__action" aria-label={row.action.label} disabled={row.action.disabled} onClick={row.action.onClick}>{row.action.text}</button>}
    </div>)}
  </div>;
}

/** Screen row that opens a list with pictures (model thumbnails, capture art) instead of a native select. */
function ScreenMenu({ row }: { row: ScreenRow }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null); const list = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 280, maxHeight: 360 });
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const rect = button.current.getBoundingClientRect(); const width = Math.max(280, rect.width);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
    const spaceBelow = window.innerHeight - rect.bottom - 12; const below = spaceBelow > 220;
    const maxHeight = Math.min(380, below ? spaceBelow : rect.top - 12);
    setBox({ left, width, maxHeight, top: below ? rect.bottom + 6 : rect.top - 6 - Math.min(maxHeight, (row.menu?.length ?? 0) * 46 + 12) });
    list.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView?.({ block: "nearest" });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => { if (!list.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("pointerdown", onDown, true); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onKey); };
  }, [open]);
  return <>
    <button ref={button} type="button" className="rp-screen__text rp-screen__pick" aria-label={row.label} aria-haspopup="listbox" aria-expanded={open} disabled={row.disabled} onClick={() => setOpen(!open)}>
      <span>{row.text}</span>{row.sub && <small className="rp-screen__sub">{row.sub}</small>}
    </button>
    {open && createPortal(<ul ref={list} className="rp-menu" role="listbox" aria-label={row.label} style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.maxHeight }}>
      {row.menu!.map((item) => <li key={item.value} role="option" aria-selected={item.value === row.value}>
        <button type="button" onClick={() => { setOpen(false); row.onPick?.(item.value); }}>
          {item.picture && <span className="rp-menu__pic">{item.picture}</span>}
          <span className="rp-menu__text"><strong>{item.text}</strong>{item.sub && <small>{item.sub}</small>}</span>
        </button>
      </li>)}
    </ul>, document.body)}
  </>;
}

/** Footswitch disc: a ring that fills with the colour when on, status stripe above. */
export function Footswitch({ label, caption, on, colour, selected, small, stripe = true, onClick }: { label: string; caption?: string; on: boolean; colour?: string; selected?: boolean; small?: boolean; stripe?: boolean; onClick: () => void }) {
  return <button type="button" className={cn("rp-fsw", small && "rp-fsw--small")} data-on={on} data-assigned={colour ? true : undefined} data-selected={selected || undefined} aria-label={label} aria-pressed={selected ?? on} style={colour ? { "--knob-colour": colour } as Style : undefined} onClick={onClick}>
    {stripe && <span className="rp-fsw__stripe"/>}
    <span className="rp-fsw__disc"/>
    {caption && <span className="rp-fsw__caption">{caption}</span>}
  </button>;
}

/** Status stripe on its own (card foot): lit in the colour when on. */
export const Stripe = ({ on, colour }: { on: boolean; colour?: string }) => <span className="rp-stripe" data-on={on} style={colour ? { "--knob-colour": colour } as Style : undefined} aria-hidden="true"/>;

/** Pedal mini toggle with 2–4 positions: a lever on a slot, the positions named above it. Click a name to
 *  jump there, the lever to step on; arrow keys move it. Used inside effect cards. */
export function LeverSwitch<T extends string | number>({ label, value, options, colour, disabled, onChange }: { label: string; value: T; options: Array<{ value: T; text: string; title?: string }>; colour?: string; disabled?: boolean; onChange: (value: T) => void }) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const go = (next: number) => { const target = options[(next + options.length) % options.length]; if (!disabled && target.value !== value) onChange(target.value); };
  const at = options.length > 1 ? index / (options.length - 1) : 0;
  return <div className="rp-lever" role="radiogroup" aria-label={label} data-disabled={disabled || undefined} style={{ "--positions": options.length, ...(colour ? { "--knob-colour": colour } : {}) } as Style}
    onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); go(index + 1); } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); go(index - 1); } }}>
    <span className="rp-lever__names">{options.map((option, position) => <button key={String(option.value)} type="button" role="radio" aria-checked={position === index} tabIndex={position === index ? 0 : -1} disabled={disabled} aria-label={option.title} title={option.title} onClick={() => go(position)}>{option.text}</button>)}</span>
    <button type="button" className="rp-lever__slot" aria-hidden="true" tabIndex={-1} disabled={disabled} onClick={() => go(index + 1)}><span className="rp-lever__bat" style={{ left: `calc(7px + (100% - 14px) * ${at})` }}/></button>
  </div>;
}

/** Segmented well; the active term gets the highlight fill. */
export function Segment<T extends string | number>({ label, value, options, disabled, onChange }: { label: string; value: T; options: Array<{ value: T; text: string; mark?: React.ReactNode }>; disabled?: boolean; onChange: (value: T) => void }) {
  return <div className="rp-wellseg" role="radiogroup" aria-label={label}>{options.map((option) => <button key={String(option.value)} type="button" role="radio" aria-checked={option.value === value} aria-label={option.mark ? option.text : undefined} title={option.mark ? option.text : undefined} disabled={disabled} className={cn(option.value === value && "on", option.mark && "rp-wellseg__mark")} onClick={() => onChange(option.value)}>{option.mark ?? option.text}</button>)}</div>;
}

/** Header separator (thin fading line). */
export const Sep = () => <span className="rp-sep" aria-hidden="true"/>;

/** Light block colours need dark ink on tiles. */
export function inkFor(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); if (!match) return "light";
  const n = parseInt(match[1], 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.66 ? "dark" : "light";
}

/** One device parameter as a NAMplify part: number → horizontal slider, boolean → rail, choices → well list. */
export function Param({ parameter, colour, onChange }: { parameter: Parameter; colour?: string; onChange: (value: Parameter["value"]) => void }) {
  const disabled = parameter.writable === false;
  if (parameter.deviceFile || (typeof parameter.value === "string" && !parameter.choices)) return <div className="rp-param-wide"><ParameterControl compact parameter={parameter} onChange={onChange}/></div>;
  if (parameter.choices) {
    const value = String(parameter.value); const choices = [...new Set(parameter.choices)];
    return <label className="rp-choice"><span className="rp-choice__name">{parameter.label}</span><span className="rp-choice__well"><select aria-label={parameter.label} disabled={disabled || !choices.length} value={value} onChange={(event) => onChange(event.target.value)}>{!choices.includes(value) && <option value={value} disabled>{value || "—"}</option>}{choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></span></label>;
  }
  if (typeof parameter.value === "boolean") return <div className="rp-param-bool"><span>{parameter.label}</span><RailToggle label={parameter.label} on={parameter.value} colour={colour} disabled={disabled} onChange={onChange}/></div>;
  return <Fader label={parameter.label} value={Number(parameter.value)} min={parameter.min ?? 0} max={parameter.max ?? 100} step={parameter.step} unit={parameter.unit} colour={colour} disabled={disabled} onChange={onChange}/>;
}
