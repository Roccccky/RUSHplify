import type { ReactNode } from "react";
import type { BlockCategory } from "../../domain/types";
import { categoryForBlockName } from "../../domain/block-categories";
import { inspirationFor, type BlockArt as Art } from "../../domain/block-inspiration";
import "../../styles/rp-block-art.css";

/** RUSHplify's own block pictogram. It mirrors how the model looks on the pedal (enclosure, colour, knob
 *  rows, switch plate, treadle), so it is recognised at a glance. Drawn flat from scratch: no logos, no brand
 *  or model text, nothing traced. Neutral parts (switches, grilles, screens) use rp-tokens greys. */
export function BlockArt({ name, category, size = 40, className }: { name: string; category?: BlockCategory; size?: number; className?: string }) {
  const art = inspirationFor(name, category ?? categoryForBlockName(name)).art;
  return <svg className={className ? `rp-art ${className}` : "rp-art"} data-shape={art.shape}
    width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    {draw(art)}
  </svg>;
}

interface Area { x0: number; x1: number; y0: number; y1: number }

/** Relative brightness 0–1, to pick pointer and fader ink that reads on a colour. */
const light = (hex: string) => {
  const value = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return (0.299 * (value >> 16 & 255) + 0.587 * (value >> 8 & 255) + 0.114 * (value & 255)) / 255;
};

/** One knob: a cap with a pointer at about two o'clock. */
const knob = (x: number, y: number, r: number, colour: string, key: string) => <g key={key}>
  <circle className="rpa-knob" cx={x} cy={y} r={r} fill={colour}/>
  <line className="rpa-dot" x1={x} y1={y} x2={x + r * .55} y2={y - r * .72} stroke={light(colour) > .55 ? "#1a1a1a" : "#f2f2f2"}/>
</g>;

/** Knob rows spread over an area; the busier the row, the smaller the knobs. */
function knobRows(rows: number[], area: Area, colour: string): ReactNode[] {
  const pitch = (area.y1 - area.y0) / Math.max(rows.length, 1);
  return rows.flatMap((count, row) => {
    const y = area.y0 + pitch * (row + .5);
    const width = area.x1 - area.x0;
    const r = Math.min(pitch * .4, count <= 2 ? width * .15 : width / (count * 2.6));
    const inset = count === 2 ? width * .17 : r * 1.2;
    return Array.from({ length: count }, (_, index) => knob(count === 1 ? (area.x0 + area.x1) / 2 : area.x0 + inset + (width - 2 * inset) * index / (count - 1), y, r, colour, `${row}-${index}`));
  });
}

/** Graphic-EQ faders: slots with caps on a fixed smile curve. */
function faders(count: number, area: Area, body: string): ReactNode[] {
  const ink = light(body) > .55 ? "#1a1a1a" : "#f2f2f2";
  return Array.from({ length: count }, (_, index) => {
    const x = count === 1 ? area.x1 - 2 : area.x0 + (area.x1 - area.x0) * (index + .5) / count;
    const at = count === 1 ? .5 : .25 + .5 * Math.abs(Math.cos(Math.PI * (index + .5) / count));
    const y = area.y0 + (area.y1 - area.y0) * at;
    return <g key={`fader-${index}`}>
      <line className="rpa-slot" x1={x} x2={x} y1={area.y0} y2={area.y1} stroke={ink}/>
      <rect className="rpa-cap" x={x - 1.1} y={y - .7} width="2.2" height="1.4" rx=".3" fill={ink}/>
    </g>;
  });
}

const footswitch = (x: number, y: number, r = 3) => <g key={`sw-${x}-${y}`}>
  <circle className="rpa-sw" cx={x} cy={y} r={r}/>
  <circle className="rpa-sw-cap" cx={x} cy={y} r={r * .55}/>
</g>;

const led = (x: number, y: number) => <circle key={`led-${x}-${y}`} className="rpa-led" cx={x} cy={y} r=".9"/>;

const speaker = (x: number, y: number, r: number) => <g key={`spk-${x}-${y}`}>
  <circle className="rpa-grille" cx={x} cy={y} r={r}/>
  <circle className="rpa-cone" cx={x} cy={y} r={r * .62}/>
  <circle className="rpa-dust" cx={x} cy={y} r={r * .22}/>
</g>;

/** Controls on a box: screen, stripes, knob rows or faders or buttons, band; then switch plate or footswitches. */
function face(art: Art, box: Area, switchY: number): ReactNode[] {
  const knobColour = art.knob ?? "#1c1c1c";
  const bottom = art.plate ? box.y0 + (box.y1 - box.y0) * .5 : art.band ? switchY - 9 : switchY - 5;
  let top = box.y0 + 2.4;
  const parts: ReactNode[] = [];
  if (art.screen) { parts.push(<rect key="screen" className="rpa-screen" x={box.x0 + 2.5} y={top} width={box.x1 - box.x0 - 5} height="4.2" rx=".6" fill={art.screen}/>); top += 5.4; }
  if (art.stripes) {
    const pitch = (bottom - top) / art.stripes.length;
    art.stripes.forEach((colour, index) => parts.push(<rect key={`stripe-${index}`} x={box.x0 + 1} y={top + pitch * index + .5} width={box.x1 - box.x0 - 2} height={pitch - 1} rx=".8" fill={colour}/>));
  }
  const area = { x0: box.x0 + 1.5, x1: box.x1 - 1.5, y0: top, y1: bottom };
  const rows = art.rows ?? [];
  if (art.faders) {
    const split = rows.length ? (area.y1 - area.y0) * .62 : area.y1 - area.y0;
    parts.push(...faders(art.faders, art.faders === 1 ? area : { ...area, y1: area.y0 + split }, art.top ?? art.body));
    if (rows.length) parts.push(...knobRows(rows, { ...area, y0: area.y0 + split }, knobColour));
    else if (art.faders === 1) parts.push(...knobRows([1], { ...area, x1: area.x1 - 5 }, knobColour));
  } else if (art.buttons) {
    const width = (area.x1 - area.x0) / art.buttons;
    for (let index = 0; index < art.buttons; index++) parts.push(<rect key={`btn-${index}`} className="rpa-button" x={area.x0 + width * index + .6} y={top + 1} width={width - 1.2} height="3.4" rx=".5"/>);
  } else parts.push(...knobRows(rows, area, knobColour));
  parts.push(led((rows[0] ?? 0) % 2 ? box.x1 - 3 : (box.x0 + box.x1) / 2, box.y0 + 1.6));
  if (art.band) parts.push(<rect key="band" className="rpa-band" x={box.x0 + 2} y={bottom + 1} width={box.x1 - box.x0 - 4} height="3.4" rx=".6" fill={art.band}/>);
  if (art.plate) parts.push(<rect key="plate" className="rpa-plate" x={box.x0 + 1.2} y={bottom + (art.band ? 5.4 : 1.4)} width={box.x1 - box.x0 - 2.4} height={box.y1 - bottom - (art.band ? 6.6 : 2.6)} rx="1" fill={art.plate}/>);
  else {
    const cx = (box.x0 + box.x1) / 2; const spread = (box.x1 - box.x0) * .27;
    if ((art.switches ?? 1) === 1) parts.push(footswitch(cx, switchY));
    else parts.push(footswitch(cx - spread, switchY, 2.5), footswitch(cx + spread, switchY, 2.5));
  }
  return parts;
}

function draw(art: Art): ReactNode {
  const knobColour = art.knob ?? "#1c1c1c";
  switch (art.shape) {
    case "stomp": {
      const split = art.plate ? 19 : 18;
      return <>
        {art.trim && <rect x="8" y="3" width="24" height="34" rx="2" fill={art.trim}/>}
        <rect className="rpa-body" x="9.5" y="3" width="21" height="34" rx="2.2" fill={art.body}/>
        {art.top && <path d={`M9.5 ${split} V5.2 Q9.5 3 11.7 3 H28.3 Q30.5 3 30.5 5.2 V${split} Z`} fill={art.top}/>}
        {art.jacks && [14, 26].map((x) => <rect key={x} className="rpa-jack" x={x - 1.6} y=".6" width="3.2" height="3" rx=".5"/>)}
        {face(art, { x0: 9.5, x1: 30.5, y0: 3, y1: 37 }, 31.5)}
      </>;
    }
    case "wide":
      return <>
        <rect className="rpa-body" x="3.5" y="7" width="33" height="26" rx="2.2" fill={art.body} style={art.frame ? { stroke: art.frame, strokeWidth: 1.2 } : undefined}/>
        {face(art, { x0: 3.5, x1: 36.5, y0: 7, y1: 33 }, 28.5)}
      </>;
    case "pick":
      return <>
        <path className="rpa-body" d="M20 38 C11 31 4.5 20 5 11 Q5.5 4.5 12 3.5 Q20 2.2 28 3.5 Q34.5 4.5 35 11 C35.5 20 29 31 20 38 Z" fill={art.body}/>
        {face({ ...art, switches: 1 }, { x0: 9, x1: 31, y0: 5, y1: 34 }, 30)}
      </>;
    case "round":
      return <>
        <circle className="rpa-body" cx="20" cy="20" r="17" fill={art.body}/>
        <path d="M20 19 L13 35 Q20 38.2 27 35 Z" fill="rgba(0,0,0,.28)"/>
        {knob(10.5, 13, 2.4, knobColour, "l")}{knob(29.5, 13, 2.4, knobColour, "r")}
        {footswitch(20, 21, 2.8)}
      </>;
    case "wah":
      // Treadle on a base: frame in the model colour, dark grip.
      return <>
        <path className="rpa-body" d="M11 38 H29 V7 Q20 1.5 11 7 Z" fill={art.body}/>
        <path className="rpa-grip" d="M13 35.5 H27 V8.5 Q20 4 13 8.5 Z"/>
        {[12, 16, 20, 24, 28, 32].map((y) => <line key={y} className="rpa-rib" x1="15" x2="25" y1={y} y2={y}/>)}
      </>;
    case "whammy":
      // Box with a treadle on the left and an LED ladder on the right.
      return <>
        <rect className="rpa-body" x="3" y="4" width="34" height="33" rx="2.2" fill={art.body}/>
        <rect className="rpa-grip" x="6" y="7" width="22" height="27" rx="1.5"/>
        <rect x="11" y="10" width="12" height="21" rx="1" fill={art.body}/>
        {[9, 12, 15, 18, 21, 24].map((y) => <rect key={y} className="rpa-ladder" x="30.5" y={y} width="3" height="1.6" rx=".3"/>)}
        {led(32, 28)}
        {footswitch(32, 32.2, 1.9)}
      </>;
    case "key":
      // Piano-style sustain pedal: dark base, chrome lever.
      return <>
        <rect className="rpa-body" x="12" y="3" width="16" height="34" rx="2.5" fill={art.body}/>
        <path className="rpa-chrome" d="M16.5 8 H23.5 V30 Q23.5 35 20 35 Q16.5 35 16.5 30 Z"/>
      </>;
    case "amp":
      // Head: tolex body, front plate in the model colour, a row of small knobs.
      return <>
        <rect className="rpa-handle" x="15" y="8.5" width="10" height="2.4" rx="1"/>
        <rect className="rpa-body" x="2.5" y="11" width="35" height="18" rx="2" fill={art.body}/>
        <rect x="4.5" y="13" width="31" height="7" rx="1" fill="rgba(255,255,255,.08)"/>
        <rect x="4.5" y="21.5" width="31" height="5.5" rx="1" fill={art.top ?? "#c9ccce"}/>
        {knobRows([7], { x0: 5, x1: 35, y0: 21.5, y1: 27 }, knobColour)}
      </>;
    case "cab":
      // Cab: frame in the model colour, dark baffle with four speakers.
      return <>
        <rect className="rpa-body" x="4" y="4" width="32" height="32" rx="2.5" fill={art.body}/>
        <rect x="6.5" y="6.5" width="27" height="27" rx="1.2" fill={art.top ?? "#151515"}/>
        {[[13.5, 13.5], [26.5, 13.5], [13.5, 26.5], [26.5, 26.5]].map(([x, y]) => speaker(x, y, 5))}
      </>;
    case "ir":
      // Impulse response: a speaker in a dark frame with a mic in front of it.
      return <>
        <rect className="rpa-body" x="3" y="3" width="34" height="34" rx="2" fill={art.body}/>
        <rect x="5" y="5" width="30" height="30" rx="1.2" fill="none" stroke="#3a3a3a" strokeWidth=".8"/>
        {speaker(20, 21, 11)}
        <path className="rpa-mic" d="M20 4 V13"/>
        <rect className="rpa-mic-head" x="18.4" y="12" width="3.2" height="5" rx="1.4"/>
      </>;
    case "nam":
      // NAM host: dark box with a lit edge, a captured waveform and a row of dots.
      return <>
        <rect className="rpa-body" x="3" y="11" width="34" height="18" rx="2" fill={art.body} style={{ stroke: art.frame, strokeWidth: 1.2 }}/>
        <path d="M7 19 C9 14 11 14 12.5 18.5 S16 23.5 18 19 S22 13.5 24 18 S27.5 22.5 29.5 19 S32 16 33 18" fill="none" stroke={art.frame} strokeWidth="1.3" strokeLinecap="round"/>
        {[9, 13, 17, 21, 25, 29].map((x) => <circle key={x} cx={x + 1} cy="25.5" r=".9" fill="#d9d9d9"/>)}
      </>;
  }
}
