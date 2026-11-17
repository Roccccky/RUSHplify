# Third-party notices

RUSHplify's license does not replace the licenses of source code it contains,
dependencies, fonts or third-party content. Keep the relevant copyright and
license notices when redistributing them.

## Source code under other licenses

Parts of RUSHplify are under the MIT licenses reproduced below.

| Project | Copyright | Used for |
| --- | --- | --- |
| RushLink (github.com/Rush-Link/RushLink-App) | Copyright (c) 2026 Cygma Audio | Parts of the code base |
| TONE3000 plugin (github.com/tone-3000/tone3000-plugin) | Copyright (c) 2026 TONE3000. | Reference for search, filter and browse logic (ported to TypeScript where used) |

### RushLink — MIT License

Copyright (c) 2026 Cygma Audio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### TONE3000 plugin — MIT License

Copyright (c) 2026 TONE3000.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Bundled fonts

The unmodified font files in `public/fonts/` use the SIL Open
Font License 1.1:

| Font | Copyright | License text |
| --- | --- | --- |
| Inter | Copyright 2020 The Inter Project Authors | [OFL-Inter.txt](public/fonts/OFL-Inter.txt) |
| Manrope | Copyright 2018 The Manrope Project Authors | [OFL-Manrope.txt](public/fonts/OFL-Manrope.txt) |

The font license texts accompany the runtime font files. No Bahnschrift font
binary is distributed. The RUSHplify wordmark is plain text; its dial mark is an
original vector drawing.

## JavaScript runtime dependencies

These licenses were checked against the installed package manifests and license
files. `package-lock.json` records exact package versions, including transitive
dependencies. Each package's own license text is included in its npm package.

| Package or family | Declared license |
| --- | --- |
| React and React DOM | MIT |
| Radix UI (`@radix-ui/react-dialog`, `react-slot`, `react-switch`, `react-tabs`) | MIT |
| Tauri API and dialog, filesystem and opener plugins | Apache-2.0 OR MIT |
| `class-variance-authority` | Apache-2.0 |
| `clsx` | MIT |
| `lucide-react` | ISC; portions derived from Feather retain their MIT notice |
| `tailwind-merge` | MIT |
| Zustand | MIT |

Lucide's license credits Lucide Contributors and Cole Bemis for the
Feather-derived portions. Preserve both notices in `lucide-react/LICENSE` when
redistributing its icons.

## Native runtime dependencies

These declarations were checked against the local Cargo registry manifests.
`src-tauri/Cargo.lock` records the exact resolved crates and their transitive
dependencies; each crate distribution carries its license files.

| Crate or family | Declared license |
| --- | --- |
| Tauri, `tauri-build`, dialog, filesystem and opener plugins | Apache-2.0 OR MIT |
| `serde`, `serde_json`, `reqwest`, `futures-util`, `url` | MIT OR Apache-2.0 |
| Tokio and `tokio-tungstenite` | MIT |

This table covers direct dependencies. The native dependency tree also includes
components under other terms, including:

- `cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext` and `selectors`:
  MPL-2.0.
- ICU4X crates and related Unicode data: Unicode-3.0.
- `webpki-roots`: CDLA-Permissive-2.0.
- `ring`: Apache-2.0 AND ISC, including its component notices.

The [license texts and source-package links](licenses/README.md) include the
MPL-2.0 text and identify the resolved MPL components. This audit checked the
locally installed npm packages and available Cargo registry sources. Some
platform-specific locked crates were not installed on the audit machine;
their license and binary-distribution requirements still need checking for
each release target.

Preserve the license and notice texts for the resolved transitive dependencies
and any platform runtime in a distribution, and provide corresponding source
where its license requires it. The dependency tables are a source-level summary,
not a complete license inventory for every platform's compiled release. Build
and test tools also retain their own licenses; they are not relicensed by
RUSHplify.

## External content and names

HeadRush and inMusic names and marks belong to their respective owners.
RUSHplify is an unofficial project and is not affiliated with or endorsed by
HeadRush, inMusic or TONE3000. RUSHplify ships no HeadRush logos.
TONE3000 names and marks belong to TONE3000.
`public/brands/tone3000.svg` and `public/brands/tone3000-mark.svg` come from the
TONE3000 plugin repository; RUSHplify shows them only to attribute TONE3000
content, as TONE3000's API branding requirements ask. The MIT license of the
plugin code does not grant trademark rights.

Block lists show the gear a model was designed after, marked with "≈"
(for example "Green JRC-OD ≈ Ibanez TS808"), following HeadRush's own
"inspired by" list. These product names are trademarks of their respective
owners, who are not associated or affiliated with RUSHplify or HeadRush. They
are used only to describe the sound. Block pictures are RUSHplify's own flat
drawings without logos or model text.

The repository does not include the HeadRush Remote Editor vendor bundle,
downloaded vendor artwork, copied manuals, private device captures, or the
historical third-party browser extension. External tone models, impulse
responses and catalogue artwork remain subject to their creators' terms.
Displaying or accessing them through a device does not grant redistribution
rights. Do not add these files to a contribution without permission and the
required notices.
