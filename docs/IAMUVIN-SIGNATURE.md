# IAMUVIN SIGNATURE STANDARD

**Version** 3.0 · **Owner** Uvin Vindula (IAMUVIN) · **Scope** every shipped artifact

This is the mark. It goes on every project — client work, owned product, internal
tooling, contract, and throwaway prototype that reaches a URL. It is not decoration.
It is provenance: a machine-verifiable claim that this thing was built by a specific
engineer, with a specific standard, and can be traced back to `iamuvin.com`.

Drop this file into any repo as `docs/IAMUVIN-SIGNATURE.md` and reference it from
the IDE rules file. Wiring instructions at the bottom.

---

## 0. CANON — DO NOT DRIFT

Every value below is frozen. Changing one breaks the mark.

| Key | Value |
|---|---|
| Name | `Uvin Vindula` |
| Handle | `IAMUVIN` |
| Hub | `https://iamuvin.com` |
| Signature line | `Built by Uvin Vindula — iamuvin.com` |
| Accent | `#F7931A` |
| Badge ink | `#0A0A0A` |
| Surface | `#0A0E1A` |
| Git identity | `Uvin Vindula <uvin95dev@gmail.com>` |
| Em dash | `—` (U+2014). Not a hyphen. Not `--`. |

Entity override — pick exactly one per project, never two:

| Context | Attribution line |
|---|---|
| Default / personal | `Built by Uvin Vindula — iamuvin.com` |
| ASI Research Labs | `Built by Uvin Vindula — ASI Research Labs · asiresearch.io` |
| Terra Labz | `Built by Uvin Vindula — Terra Labz · terralabz.io` |
| Bitcoin education | `Built by Uvin Vindula — uvin.lk` |
| Co-built | `Built by Uvin Vindula (IAMUVIN) — iamuvin.com  \|  [Partner] — [partner.com]` |

When business context is ambiguous, the entity is **ASI Research Labs**.

---

## 1. THE FIVE LAYERS

The signature is layered. Two layers are mandatory on everything. Three are
mandatory on anything with a build step.

| # | Layer | Surface | Client work | Owned product |
|---|---|---|---|---|
| 1 | Console badge | Runtime | Required | Required |
| 2 | Footer credit | Visible UI | Required | Required |
| 3 | Head metadata | HTML source | Required | Required |
| 4 | File headers | Source code | Entry files | Entry files |
| 5 | Build artifacts | Repo + wire | Required | Required |

A project is not done until all applicable layers pass the grep gate in section 9.

---

## 2. LAYER 1 — CONSOLE BADGE

The signature anyone who opens DevTools will find. Orange chip, dark ink, one
newline, the attribution line.

### Standard form

```ts
console.log(
  "%c IAMUVIN ",
  "background:#F7931A;color:#0A0A0A;font-weight:bold;padding:4px 8px;border-radius:3px;",
  "\nBuilt by Uvin Vindula — iamuvin.com"
);
```

### Rules

- Fires **once** per page load. Guard against React StrictMode double-mount.
- Fires in **production**, not just dev. This is the point of it.
- Never wrap in a try/catch that swallows it silently.
- Never `console.clear()` anywhere in the app — it kills the badge.
- Mount at the client boundary of the root layout, never in a leaf component.

### Hardened module — `src/lib/signature.ts`

```ts
/**
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

const CHIP =
  "background:#F7931A;color:#0A0A0A;font-weight:bold;padding:4px 8px;border-radius:3px;";

let fired = false;

export function signature(project?: string): void {
  if (fired || typeof window === "undefined") return;
  fired = true;

  console.log(
    `%c IAMUVIN ${project ? `· ${project} ` : ""}`,
    CHIP,
    "\nBuilt by Uvin Vindula — iamuvin.com"
  );
}
```

Module-level `fired` survives StrictMode remounts. The `typeof window` check keeps
it out of the SSR log stream on Vercel.

### Flagship form — owned products only

Use the block mark on `iamuvin.com`, `uvin.lk`, `asiresearch.io`, `terralabz.io`,
`cyberarsenal.app`, `aininja.academy`. Never on a client site — it reads as
vandalism on someone else's brand.

```ts
console.log(
  `%c
██╗ █████╗ ███╗   ███╗██╗   ██╗██╗   ██╗██╗███╗   ██╗
██║██╔══██╗████╗ ████║██║   ██║██║   ██║██║████╗  ██║
██║███████║██╔████╔██║██║   ██║██║   ██║██║██╔██╗ ██║
██║██╔══██║██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██║██║╚██╗██║
██║██║  ██║██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ██║██║ ╚████║
╚═╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚═╝╚═╝  ╚═══╝

Built by Uvin Vindula — iamuvin.com
`,
  "color:#F7931A;font-family:monospace;font-size:11px;line-height:1.1;"
);
```

Monospace and an explicit `line-height` are required or the block letters shear
apart in Firefox.

### Verify the mark before you paste it

Seven letters: **I A M U V I N**. Six rows. Every row exactly 53 characters.
The U and the V are adjacent and look near-identical at a glance — that is
exactly where a letter goes missing. Never eyeball it.

```bash
awk 'NR>=1 && NF' mark.txt | awk '{print length($0)}' | sort -u
# must print a single value: 53
```

If more than one number comes back, a glyph is truncated. If `53` comes back but
the word reads wrong, a whole letter was dropped — count the letters, not the
columns.

---

## 3. LAYER 2 — FOOTER CREDIT

The visible mark. Small, last line, always a live link, never removed.

```tsx
<span className="text-xs opacity-60">
  Built by{" "}
  <a
    href="https://iamuvin.com"
    target="_blank"
    rel="noopener noreferrer"
    className="underline underline-offset-2 hover:opacity-100"
  >
    Uvin Vindula
  </a>
</span>
```

### Rules

- `rel="noopener noreferrer"` always. A missing `noopener` is a security defect,
  not a style choice.
- Inherit the client's footer type scale and color. Do **not** paint it `#F7931A`
  on a client site — the orange belongs to IAMUVIN, not to them.
- On owned products, the accent is allowed and expected.
- Placement: last child of the footer, below the copyright line, above nothing.
- Minimum contrast 4.5:1 against the footer background. `opacity-60` on a dark
  footer usually clears it. Measure, do not assume.

### White-label exception

Some contracts forbid visible attribution. Then, and only then:

1. Drop Layer 2.
2. Keep Layers 1, 3, 4, 5 in full.
3. Record the waiver in `docs/CONTRACT-NOTES.md` with the clause reference.

No waiver in the file means the footer ships. A verbal request is not a waiver.

---

## 4. LAYER 3 — HEAD METADATA

Machine-readable provenance. Survives view-source, scrapers, and archive.org.

### Static HTML

```html
<meta name="author" content="Uvin Vindula — IAMUVIN" />
<meta name="designer" content="IAMUVIN — iamuvin.com" />
<meta name="developer" content="Uvin Vindula — iamuvin.com" />
<link rel="me" href="https://iamuvin.com" />
```

### Next.js App Router — `app/layout.tsx`

```ts
export const metadata: Metadata = {
  authors: [{ name: "Uvin Vindula", url: "https://iamuvin.com" }],
  creator: "Uvin Vindula (IAMUVIN)",
  publisher: "ASI Research Labs", // entity per section 0 — do not default blindly
  other: {
    developer: "Uvin Vindula — iamuvin.com",
  },
};
```

`authors` and `creator` are first-class Next fields. `developer` is not, so it
goes through `other`.

### JSON-LD — one per site, in the root layout

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "creator": {
    "@type": "Person",
    "name": "Uvin Vindula",
    "alternateName": "IAMUVIN",
    "url": "https://iamuvin.com"
  }
}
```

This is the layer that makes the signature legible to search engines and LLM
crawlers. Do not skip it.

---

## 5. LAYER 4 — FILE HEADERS

Entry points and any file a stranger would open first. Not every file — a header
on a 12-line utility is noise.

### TypeScript / JavaScript / Dart / Kotlin / Swift / Solidity

```ts
/**
 * @project  [Project Name] — [domain.com]
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */
```

### Python

```python
"""
[Project Name] — [domain.com]

Author:  Uvin Vindula (IAMUVIN)
Website: https://iamuvin.com
Company: ASI Research Labs — asiresearch.io
Built:   2026
"""
```

### Which files get one

- `app/layout.tsx`, `main.dart`, `MainActivity.kt`, `AppDelegate.swift`
- Every deployed smart contract
- Every public API entry (`main.py`, `server.ts`)
- Every file that defines a core algorithm or an original invention

Skip: generated files, shadcn/ui primitives, migrations, config files, tests.

---

## 6. LAYER 5 — BUILD ARTIFACTS

The layer most people forget. It puts the signature in places that outlive the UI.

### `package.json`

```json
{
  "author": "Uvin Vindula <uvin95dev@gmail.com> (https://iamuvin.com)",
  "homepage": "https://iamuvin.com",
  "contributors": ["Uvin Vindula (IAMUVIN) — iamuvin.com"]
}
```

### HTTP response header — `next.config.ts`

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Built-By", value: "Uvin Vindula — iamuvin.com" }],
      },
    ];
  },
};

export default config;
```

Reachable with `curl -I`. Cheapest, most durable layer there is.

### `public/humans.txt`

```text
/* TEAM */
  Engineer: Uvin Vindula (IAMUVIN)
  Site: https://iamuvin.com
  Location: Sri Lanka

/* SITE */
  Standards: HTML5, TypeScript, Tailwind CSS v4
  Components: Next.js 15, Supabase, Prisma
  Built: 2026
```

Reference it from `<head>`. This is the one `rel="author"` on the page — the
hub link in Layer 3 uses `rel="me"`, because two `rel="author"` targets make
the claim ambiguous to every parser that reads it.

```html
<link rel="author" type="text/plain" href="/humans.txt" />
```

### Git — repo-local override, never global-only

```bash
git config user.name  "Uvin Vindula"
git config user.email "uvin95dev@gmail.com"
```

Commit format stays conventional: `type(scope): subject`.

### README footer

```md
---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
```

---

## 7. PLATFORM IMPLEMENTATIONS

### Next.js 15 App Router

`app/layout.tsx` is a server component, so the badge needs a client boundary.

```tsx
// components/signature.tsx
"use client";
import { useEffect } from "react";
import { signature } from "@/lib/signature";

export function Signature() {
  useEffect(() => {
    signature();
  }, []);
  return null;
}
```

Block body, not `() => signature()`. A concise body returns the function's
value into React's cleanup slot — harmless today, a bug the day `signature()`
returns anything.

```tsx
// app/layout.tsx
<body>
  <Signature />
  {children}
</body>
```

### React + Vite

Call `signature()` at the top of `main.tsx`, outside the render tree. No effect
needed, no double-fire.

### Static HTML

```html
<script>
  console.log(
    "%c IAMUVIN ",
    "background:#F7931A;color:#0A0A0A;font-weight:bold;padding:4px 8px;border-radius:3px;",
    "\nBuilt by Uvin Vindula — iamuvin.com"
  );
</script>
```

Inline, end of `<body>`. If a CSP with `script-src` is in play, hash the script
and whitelist it — do not weaken the policy to `unsafe-inline` for a signature.

### Flutter

```dart
// lib/main.dart
import 'dart:developer' as developer;

void _signature() {
  developer.log(
    'Built by Uvin Vindula — iamuvin.com',
    name: 'IAMUVIN',
  );
}
```

Plus a visible credit row in the About / Settings screen:

```dart
Text('Built by Uvin Vindula — iamuvin.com',
  style: Theme.of(context).textTheme.bodySmall)
```

### Native Android (Kotlin)

```kotlin
// MainActivity.kt
Log.i("IAMUVIN", "Built by Uvin Vindula — iamuvin.com")
```

Plus `<string name="built_by">Built by Uvin Vindula — iamuvin.com</string>` in
`strings.xml`, surfaced in the About screen.

### Native iOS (Swift)

```swift
// AppDelegate.swift
os_log("Built by Uvin Vindula — iamuvin.com", log: .default, type: .info)
```

Plus a `Settings.bundle` credit row or an About cell.

### Electron / Windows desktop

Badge in the renderer console **and** a line in the main-process stdout log.
Desktop apps get an About dialog with the full attribution — non-negotiable,
because there is no footer to carry it.

### Solidity

```solidity
/// @title   [Contract Name]
/// @author  Uvin Vindula (IAMUVIN) — iamuvin.com
/// @notice  Built by Uvin Vindula — iamuvin.com
```

NatSpec `@author` survives verification on Etherscan and Basescan. That is a
permanent, on-chain-adjacent signature. Use it on every deployed contract.

### FastAPI / Python service

```python
app = FastAPI(
    title="[Service Name]",
    contact={"name": "Uvin Vindula", "url": "https://iamuvin.com"},
)
```

Renders straight into the OpenAPI schema and `/docs`.

---

## 8. THE ORANGE RULE

`#F7931A` is the IAMUVIN accent. It is **not** a general-purpose highlight color
to be sprayed into a client's design system.

**Allowed**

- The console badge chip background — always, on every project.
- Owned product UI — `iamuvin.com`, `uvin.lk`, `asiresearch.io`, `terralabz.io`,
  `cyberarsenal.app`, `aininja.academy`.

**Banned**

- Any client UI chrome, button, link, or state color.
- Any project with its own locked palette — DK Fashion runs coral/teal/gold,
  Villa Pinnawala runs its own hospitality set. The orange does not leak in.

The footer credit on a client site inherits their color. The console badge keeps
the orange because the console is not their surface.

---

## 9. VERIFICATION — MECHANICAL, NOT VISUAL

No project ships on "I think I added it." Verification is a command that either
returns clean or does not.

### `scripts/verify-signature.sh`

```bash
#!/usr/bin/env bash
# IAMUVIN signature gate. Platform-aware.
# Exit 0 = signed. Exit 1 = incomplete. Wire into CI.

set -uo pipefail
FAIL=0
EX=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
    --exclude-dir=dist --exclude-dir=build --exclude-dir=Pods
    --exclude-dir=.dart_tool --exclude-dir=vendor --exclude-dir=coverage
    --exclude=IAMUVIN-SIGNATURE.md --exclude=verify-signature.sh)

has()  { grep -rqI "${EX[@]}" -e "$1" . 2>/dev/null; }
any()  { for pat in "$@"; do has "$pat" && return 0; done; return 1; }
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAIL=1; }
skip() { printf '  SKIP  %s\n' "$1"; }

# --- platform detection ---
WEB=0; NATIVE=0
if [ -f package.json ] || [ -f index.html ] || [ -f next.config.ts ]; then WEB=1; fi
if [ -f pubspec.yaml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; then NATIVE=1; fi
if ls -d ./*.xcodeproj >/dev/null 2>&1 || [ -f Podfile ]; then NATIVE=1; fi
if [ "$WEB" -eq 0 ] && [ "$NATIVE" -eq 0 ]; then WEB=1; fi   # default to web rules

echo "IAMUVIN SIGNATURE GATE"
echo "platform: web=$WEB native=$NATIVE"
echo "----------------------"

# --- universal layers ---
if has "Built by Uvin Vindula"; then pass "attribution line"; else fail "attribution line"; fi
if any "iamuvin.com" "asiresearch.io" "terralabz.io" "uvin.lk"; then
  pass "hub URL"; else fail "hub URL"; fi

# --- runtime badge: chip form OR block form OR explicit native log tag ---
if any '%c IAMUVIN' '██╗ █████╗' 'Log.i("IAMUVIN"' \
  "name: 'IAMUVIN'" 'os_log("Built by Uvin Vindula'; then
  pass "runtime badge"; else fail "runtime badge"; fi

# --- web-only layers ---
if [ "$WEB" -eq 1 ]; then
  if any 'F7931A' 'f7931a'; then pass "accent token"; else fail "accent token"; fi
  if any 'name="author"' 'authors:' 'creator:'; then
    pass "head metadata"; else fail "head metadata"; fi
  if any '"author"' 'X-Built-By' 'humans.txt'; then
    pass "build artifacts"; else fail "build artifacts"; fi
else
  skip "accent token (native)"
  skip "head metadata (native)"
  if any 'built_by' 'Settings.bundle' 'About'; then
    pass "in-app credit surface"; else fail "in-app credit surface"; fi
fi

# --- anti-patterns: source files only, explicit patterns, locale-safe ---
HITS=$(grep -rnI "${EX[@]}" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.html" --include="*.dart" --include="*.kt" --include="*.swift" \
  --include="*.sol" --include="*.py" \
  -e 'console\.clear()' \
  -e 'Built by Uvin Vindula --' \
  -e 'Built by Uvin Vindula - ' \
  -e 'Made with love' \
  . 2>/dev/null || true)

if [ -n "$HITS" ]; then
  printf '  FAIL  anti-pattern:\n%s\n' "$HITS"; FAIL=1
else
  pass "no anti-patterns"
fi

echo "----------------------"
if [ "$FAIL" -eq 0 ]; then echo "SIGNED"; else echo "INCOMPLETE"; fi
exit "$FAIL"
```

```bash
chmod +x scripts/verify-signature.sh && ./scripts/verify-signature.sh
```

The gate detects the project shape before it judges. Web projects are held to
accent, head metadata, and build artifacts. Native projects skip those three —
a Flutter app has no `<head>` — and are held to an in-app credit surface
instead. The runtime badge check accepts the chip form, the block form, or a
native log tag, so a flagship product that ships only the ASCII mark still
passes. A gate that fails correct work gets switched off, and a switched-off
gate protects nothing.

### Runtime checks

```bash
# Header layer
curl -sI https://<domain> | grep -i x-built-by

# Metadata layer
curl -s https://<domain> | grep -i 'name="author"'

# humans.txt
curl -s https://<domain>/humans.txt | head -3
```

### CI gate — `.github/workflows/signature.yml`

```yaml
name: signature
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash ./scripts/verify-signature.sh
```

A build that fails the gate does not merge.

---

## 10. DEFINITION OF DONE

Copy into `tasks/todo.md` at project start.

- [ ] Console badge fires once, in production, on every route
- [ ] Console badge survives React StrictMode without doubling
- [ ] No `console.clear()` anywhere in the codebase
- [ ] Footer credit visible, linked, `rel="noopener noreferrer"`
- [ ] Footer credit clears 4.5:1 contrast
- [ ] Footer credit inherits client palette (client projects only)
- [ ] `author` / `creator` metadata in head
- [ ] JSON-LD `creator` block present
- [ ] File headers on entry points and original algorithms
- [ ] `package.json` author + homepage set
- [ ] `X-Built-By` response header live in production
- [ ] `humans.txt` served and linked
- [ ] Git identity `Uvin Vindula <uvin95dev@gmail.com>` on every commit
- [ ] README footer credit
- [ ] `verify-signature.sh` exits 0
- [ ] Curl checks pass against the live domain
- [ ] Waiver documented if Layer 2 was dropped

---

## 11. ANTI-PATTERNS

Every one of these has shipped at least once. Do not repeat them.

| Wrong | Right |
|---|---|
| `Built by Uvin Vindula - iamuvin.com` | Em dash `—`, not hyphen |
| `Made with love by IAMUVIN` | `Built by Uvin Vindula — iamuvin.com` |
| Signature stripped from production build | Ships in production, always |
| Badge fires twice under StrictMode | Module-level guard |
| Orange link in a client's footer | Inherit their color |
| Emoji in the credit line | No emoji. Anywhere. |
| Signature only in dev | Dev and prod |
| `console.clear()` in an analytics init | Never clear the console |
| Block ASCII mark on a client site | Owned products only |
| Footer at `opacity-20` "to be subtle" | Subtle is 60. Twenty is hiding. |
| Block mark missing a letter (`IAMUIN`) | 7 letters, 6 rows, 53 cols. Verify. |
| Global git config only | Set repo-local identity per clone |
| Signature added at the end as a chore | Layer 1 and 2 land in the first commit |

---

## 12. WIRING INTO EACH IDE

Save this file at `docs/IAMUVIN-SIGNATURE.md`, then add the pointer below to the
rules file your tool reads. One source of truth, many entry points.

**Pointer block** — paste verbatim into any of the files listed after it:

```md
## IAMUVIN SIGNATURE — MANDATORY

Every project carries the IAMUVIN signature. Full spec: `docs/IAMUVIN-SIGNATURE.md`.

Minimum on every build:
1. Console badge — `%c IAMUVIN` chip, `#F7931A` on `#0A0A0A`, then
   `Built by Uvin Vindula — iamuvin.com`. Fires once, in production.
2. Footer credit — `Built by Uvin Vindula` linking to https://iamuvin.com,
   `rel="noopener noreferrer"`.
3. Head metadata — `author`, `creator`, JSON-LD `creator`.
4. File headers on entry points.
5. `package.json` author, `X-Built-By` header, `humans.txt`, README footer.

Verify with `./scripts/verify-signature.sh` before marking any task done.
Em dash `—` always. No emoji. Never `console.clear()`.
Git identity: `Uvin Vindula <uvin95dev@gmail.com>`.
```

| Tool | File |
|---|---|
| Claude Code | `CLAUDE.md` (repo root) or `~/.claude/CLAUDE.md` |
| Codex / OpenAI agents | `AGENTS.md` (repo root) |
| Cursor | `.cursor/rules/signature.mdc` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Zed | `.rules` |
| Cline / Roo | `.clinerules` |
| Continue.dev | `.continuerules` |
| Aider | `CONVENTIONS.md`, loaded with `--read` |
| JetBrains AI | `.aiassistant/rules/signature.md` |

For a monorepo, put the spec once at the root and symlink the pointer into each
package. Do not fork the spec per package — divergence is how the mark rots.

---

## 13. WHY THIS EXISTS

Three reasons, in order of weight.

**Provenance.** Code outlives contracts. Sites get resold, rebranded, forked, and
scraped. The five layers mean the origin survives a redesign, a domain change,
and a `git init` on a stolen copy. Someone will find `X-Built-By` in a response
header years after the footer is gone.

**Standard.** The signature is a promise attached to a name. It only holds if the
work behind it holds — zero placeholder content, zero dead links, Lighthouse
mobile 90+, nothing that reads as AI-generated. Do not sign work that is not
finished. The mark is worth exactly what the last project under it was worth.

**Distribution.** A footer link on every site built since 2019 is a compounding
backlink graph and a referral channel that costs nothing to maintain. The console
badge specifically targets other engineers — the only people who open DevTools on
a page they did not build. That is the audience worth reaching.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
