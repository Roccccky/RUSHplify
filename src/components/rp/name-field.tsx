/* Inline name editing in the NAMplify well look. Replaces window.prompt, which the Tauri WebView
   (WKWebView on macOS) does not show: it returns null at once. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WandSparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { NAME_MAX_LENGTH, NAME_PROBLEM_TEXT, nameProblem } from "../../domain/names";
import { deviceErrorMessage } from "../../services/device-errors";
import "../../styles/rp-name-field.css";

export interface NameFieldProps {
  /** Starting text. Submitting it unchanged just closes the field. */
  value: string;
  /** Accessible name of the input, e.g. "Rig name". */
  label: string;
  /** Names already in use (other rigs, setlists, presets). */
  taken?: readonly string[];
  placeholder?: string;
  className?: string;
  /** Store the new (trimmed) name. A rejection keeps the field open with the message. */
  onSubmit: (name: string) => void | Promise<unknown>;
  onCancel: () => void;
  /** Name suggestion per variant (rig names from the chain). Shows the wand; each click takes the next variant. */
  suggest?: (variant: number) => string;
  /** Text the field opens with instead of `value` (e.g. a suggestion for a new rig). */
  initialText?: string;
}

/** Well input: Enter stores, Escape or leaving the field cancels. */
export function NameField({ value, label, taken = [], placeholder, className, onSubmit, onCancel, suggest, initialText }: NameFieldProps) {
  const [text, setText] = useState(initialText ?? value);
  const variant = useRef(initialText !== undefined && suggest ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);

  const submit = async () => {
    if (busy) return;
    const name = text.trim();
    if (value && name === value.trim()) { onCancel(); return; }
    const problem = nameProblem(name, taken, value);
    if (problem) { setError(NAME_PROBLEM_TEXT[problem]); return; }
    setBusy(true); setError(null);
    try { await onSubmit(name); }
    catch (failure) { setError(deviceErrorMessage(failure)); setBusy(false); input.current?.focus(); }
  };

  const nextSuggestion = () => { if (!suggest) return; setText(suggest(variant.current)); variant.current += 1; setError(null); input.current?.focus(); input.current?.select(); };

  return <span className={cn("rp-namefield", suggest && "rp-namefield--suggest", error && "rp-namefield--error", className)}>
    <input ref={input} className="rp-namefield__input" aria-label={label} aria-invalid={Boolean(error) || undefined} value={text} placeholder={placeholder}
      maxLength={NAME_MAX_LENGTH + 16} spellCheck={false} autoComplete="off" disabled={busy}
      onChange={(event) => { setText(event.target.value); setError(null); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") { event.preventDefault(); void submit(); }
        else if (event.key === "Escape") { event.preventDefault(); onCancel(); }
      }}
      onBlur={() => { if (!busy && !error) onCancel(); }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}/>
    {suggest && <SuggestButton disabled={busy} onSuggest={nextSuggestion}/>}
    {error && <span className="rp-namefield__error" role="alert">{error}</span>}
  </span>;
}

/** Wand that fills in a name suggestion. Keeps focus in the field, so the field does not cancel on blur. */
export function SuggestButton({ onSuggest, disabled }: { onSuggest: () => void; disabled?: boolean }) {
  return <button type="button" className="rp-namefield__suggest" aria-label="Suggest name" disabled={disabled}
    onMouseDown={(event) => event.preventDefault()} onPointerDown={(event) => event.preventDefault()}
    onClick={(event) => { event.stopPropagation(); onSuggest(); }}><WandSparkles size={13}/></button>;
}

export interface EditableNameProps extends Omit<NameFieldProps, "onSubmit" | "onCancel" | "value"> {
  value: string;
  onRename: (name: string) => void | Promise<unknown>;
  /** Controlled editing (pencil buttons elsewhere); omit to let double-click alone open the field. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  disabled?: boolean;
  /** What the name looks like at rest; defaults to the plain value. */
  children?: ReactNode;
  textClassName?: string;
}

/** A name that turns into a NameField on double-click (or when `editing` is set). */
export function EditableName({ value, onRename, editing, onEditingChange, disabled, children, textClassName, ...field }: EditableNameProps) {
  const [own, setOwn] = useState(false);
  const open = editing ?? own;
  const set = (next: boolean) => { if (editing === undefined) setOwn(next); onEditingChange?.(next); };
  if (open && !disabled) return <NameField {...field} value={value} onCancel={() => set(false)} onSubmit={async (name) => { await onRename(name); set(false); }}/>;
  return <span className={textClassName} onDoubleClick={disabled ? undefined : (event) => { event.preventDefault(); event.stopPropagation(); set(true); }}>{children ?? value}</span>;
}
