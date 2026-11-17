import { useState, type MouseEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";
import { APP_NAME, APP_VERSION, Brand } from "../components/system/brand";

/** Credits. License texts live in THIRD_PARTY_NOTICES.md. */
const CREDITS = [
  { name: "NAMplify", by: "", license: "", role: "Idea and look of RUSHplify.", href: "https://github.com/Roccccky/NAMplify" },
  { name: "TONE3000", by: "TONE3000", license: "", role: "Tones, captures, pictures, names and logo in TONES come from TONE3000 and belong to TONE3000.", href: "https://www.tone3000.com/" },
  { name: "TONE3000 plugin", by: "TONE3000", license: "MIT", role: "Model for the tone browser.", href: "https://github.com/tone-3000/tone3000-plugin" },
] as const;

function OutLink({ href, children }: { href: string; children: string }) {
  const [failed, setFailed] = useState(false);
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isTauri()) return;
    event.preventDefault();
    setFailed(false);
    void openUrl(href).catch(() => setFailed(true));
  };
  return <><a className="about-link" href={href} target="_blank" rel="noopener noreferrer" onClick={open}>{children} <ExternalLink size={12} aria-hidden="true"/></a>{failed && <small role="alert"> Couldn’t open the link. Visit {href.replace(/^https:\/\//, "")} in your browser.</small>}</>;
}

export function AboutPanel() {
  return <div className="about-panel">
    <header className="about-panel__head"><Brand size="lg" mark/><p>{APP_NAME} {APP_VERSION} · unofficial editor for HeadRush Flex Prime (firmware 5.2.0)</p></header>
    <section aria-labelledby="about-credits"><h3 id="about-credits">Credits</h3>
      <ul className="about-credits">{CREDITS.map((credit) => <li key={credit.name}>
        <strong>{credit.name}</strong><span>{credit.by}{credit.license && ` · ${credit.license}`}</span><p>{credit.role}</p>
        <div className="about-credits__links">{credit.href && <OutLink href={credit.href}>Source</OutLink>}</div>
      </li>)}</ul>
    </section>
    <p className="about-panel__legal">{APP_NAME} is free, open-source software. Everything from HeadRush belongs to HeadRush / inMusic: Flex Prime, firmware, rigs, block and model names, labels and terms. {APP_NAME} is unofficial and not affiliated with or endorsed by HeadRush, inMusic or TONE3000. Product names after “≈” in the block lists are trademarks of their respective owners, who are not associated or affiliated with {APP_NAME} or HeadRush; they only name the gear whose sound a model was designed after. Full license texts: THIRD_PARTY_NOTICES.md.</p>
  </div>;
}
