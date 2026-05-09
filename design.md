# Claude.ai — Design System Reference

> Reverse-engineered from `c6a992d55-CxerHqZJ.css` (production CSS bundle, claude.ai). This is not an official Anthropic spec — it documents the observable token system as shipped. Some layers (type sizes, shadow tokens, spacing) were truncated from the inspected file and are noted as gaps at the end.

---

## 1. Visual Identity

Claude.ai's interface is built on a deliberately **warm, paper-like aesthetic**. The defining choices:

- **Light mode is cream, not white.** The base reading surface is a low-saturation warm hue — close to white but always nudged toward yellow rather than blue. The effect is "printed page," not "blank canvas."
- **Dark mode is warm gray, not black.** The dark base sits at a near-neutral with a faint warm cast, avoiding the cold IDE feel of most chat tools.
- **Identity orange stays constant.** The Claude clay/terracotta brand color (`HSL 15, 63.1%, 59.6%`) is identical in both modes — the one anchor that doesn't shift.
- **Strokes are restrained.** Borders are mostly created by applying low opacity to a near-black (light) or near-white (dark) value, not by introducing dedicated mid-gray stroke colors.
- **Voice differentiation through type.** Claude's responses render in serif; user messages in sans. The product makes the two participants typographically distinct.

---

## 2. Token Architecture

### 2.1 Format

Every color is stored as raw HSL channels — `H S% L%` with **no `hsl()` wrapper**:

```css
--bg-100: 48 33.3% 97.1%;
```

They are consumed via:

```css
background: hsl(var(--bg-100));
border: 1px solid hsl(var(--border-100) / 0.12);  /* opacity at the call site */
```

This pattern is what makes the border system work — see §4.

### 2.2 Theme switching

Two layered mechanisms:

```css
[data-theme="claude"]                       /* default = light */
[data-theme="claude"][data-mode="light"]    /* explicit light */
[data-theme="claude"][data-mode="dark"]     /* explicit dark */

@media (prefers-color-scheme: dark) {
  [data-theme="claude"] { /* auto-dark when no explicit choice */ }
}
```

Explicit user choice (`data-mode`) takes precedence; OS preference (`prefers-color-scheme`) is the fallback when no choice is set.

There is a **second theme** in the same file — `[data-theme="console"]` — that powers `console.anthropic.com` using the same token names mapped to a different palette (near-black surfaces + green accent). One token system, two product surfaces. See §7.

### 2.3 Theme-independent tokens

```css
:root {
  --always-white: 0 0% 100%;
  --always-black: 0 0% 0%;
}
```

For elements that must stay fixed regardless of theme (logos on colored backgrounds, etc.).

---

## 3. Color Tokens — Claude Theme

All values are HSL channels. Comments indicate the resolved character of each value.

### 3.1 Backgrounds (surface stack)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-000` | `0 0% 100%` (white) | `60 2.1% 18.4%` (warm dark gray) | Main reading surface, chat panel |
| `--bg-100` | `48 33.3% 97.1%` (cream) | `60 2.7% 14.5%` | Sidebar, secondary panels |
| `--bg-200` | `53 28.6% 94.5%` | `30 3.3% 11.8%` | Hover states, raised cards |
| `--bg-300` | `48 25% 92.2%` | `60 2.6% 7.6%` (near black) | Pressed/active, deeper recesses |
| `--bg-400` | `50 20.7% 88.6%` | `0 0% 0%` (true black) | Code blocks, deepest surfaces |
| `--bg-500` | `50 20.7% 88.6%` | `0 0% 0%` | Alias of 400 |

**Note:** The light palette is built from low-saturation warm hues (H≈48–53, S≈20–33%). In dark mode the surface order is preserved by role, not by relative lightness — `bg-000` is the *lightest* dark surface (where text sits) and `bg-400/500` are the deepest recesses.

### 3.2 Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--text-000` | `60 2.6% 7.6%` (near-black, slight warm) | `48 33.3% 97.1%` (cream) | Primary text, headings |
| `--text-100` | same as 000 | same as 000 | Alias |
| `--text-200` | `60 2.5% 23.3%` | `50 9% 73.7%` | Secondary text, labels |
| `--text-300` | same as 200 | same as 200 | Alias |
| `--text-400` | `51 3.1% 43.7%` | `48 4.8% 59.2%` | Tertiary, placeholder, disabled |
| `--text-500` | same as 400 | same as 400 | Alias |

**The cleverest move in the entire system:** `--text-000` in dark mode (`48 33.3% 97.1%`) is the *exact same HSL value* as `--bg-100` in light mode. The cream that serves as paper in light mode becomes the ink in dark mode. This is why both modes feel like the same product.

### 3.3 Borders

| Token | Light | Dark |
|---|---|---|
| `--border-100` | `30 3.3% 11.8%` (near-black) | `51 16.5% 84.5%` (light cream) |
| `--border-200` | same as 100 | same as 100 |
| `--border-300` | same as 100 | same as 100 |
| `--border-400` | same as 100 | same as 100 |

**All four border tokens resolve to the same HSL value within each mode.** Border weight/visibility is achieved via opacity at the consumption site, not through different color values. Example:

```css
.subtle-divider { border: 1px solid hsl(var(--border-100) / 0.08); }
.strong-divider { border: 1px solid hsl(var(--border-100) / 0.5); }
```

One color, infinite weights.

### 3.4 Accents

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--accent-brand` | `15 63.1% 59.6%` | `15 63.1% 59.6%` | **Identical across modes.** Brand callouts, key actions |
| `--brand-000` | `15 54.2% 51.2%` | `15 54.2% 51.2%` | Logo, primary CTAs |
| `--brand-100` | `15 54.2% 51.2%` | `15 63.1% 59.6%` | CTA hover |
| `--brand-200` | `15 63.1% 59.6%` | `15 63.1% 59.6%` | CTA active |
| `--brand-900` | `0 0% 0%` | `0 0% 0%` | Brand on dark backgrounds |
| `--accent-000` | `210 73.7% 40.2%` (blue) | `210 65.5% 67.1%` (lighter blue) | Links, info |
| `--accent-100` | `210 70.9% 51.6%` | `210 70.9% 51.6%` | Link hover |
| `--accent-200` | same as 100 | same as 100 | Link active |
| `--accent-900` | `211 72% 90%` (light blue) | `210 55.9% 24.6%` (deep blue) | Info background |
| `--accent-pro-000` | `251 34.2% 33.3%` (dark purple) | `251 84.6% 74.5%` (lavender) | Pro/Max tier accent |
| `--accent-pro-100` | `251 40% 45.1%` | `251 40.2% 54.1%` | Pro hover |
| `--accent-pro-200` | `251 61% 72.2%` | `251 40% 45.1%` | Pro active |
| `--accent-pro-900` | `253 33.3% 91.8%` | `250 25.3% 19.4%` | Pro background |

The Pro purple ramp is reserved for paid-tier moments. Free vs paid users see slightly different accent treatments without forking the rest of the UI.

### 3.5 State colors (semantic)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--success-000` | `125 100% 18%` | `97 59.1% 46.1%` | Success text on success background |
| `--success-100` | `103 72.3% 26.9%` | `97 75% 32.9%` | Success icon, badge |
| `--success-200` | same as 100 | same as 100 | Success active |
| `--success-900` | `86 45.1% 90%` | `127 100% 13.9%` | Success surface fill |
| `--warning-000` | `45 91.8% 19%` | `40 71% 50%` | Warning text |
| `--warning-100` | `39 88.8% 28%` | `39 93.4% 35.9%` | Warning icon |
| `--warning-200` | same as 100 | same as 100 | Warning active |
| `--warning-900` | `38 65.9% 92%` | `45 94.8% 15.1%` | Warning surface fill |
| `--danger-000` | `0 58.6% 34.1%` | `0 98.4% 75.1%` | Danger text |
| `--danger-100` | `0 56.2% 45.4%` | `0 67% 59.6%` | Danger icon, destructive button |
| `--danger-200` | same as 100 | same as 100 | Danger active |
| `--danger-900` | `0 50% 95%` | `0 46.5% 27.8%` | Danger surface fill |

The `-000` / `-100` / `-900` pattern is consistent across all state ramps:
- **`-000`** = darkest text-grade
- **`-100`** = primary icon/button color
- **`-200`** = active state
- **`-900`** = surface fill (lightest in light mode, darkest in dark mode)

### 3.6 On-color text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--oncolor-100` | `0 0% 100%` (white) | `0 0% 100%` | Text on saturated colored backgrounds |
| `--oncolor-200` | `60 6.7% 97.1%` | `60 6.7% 97.1%` | Slightly muted on-color |
| `--oncolor-300` | same as 200 | same as 200 | Alias |

These don't shift between modes — text on a saturated CTA stays white-ish regardless of theme.

### 3.7 Pictograms (icon fills)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--pictogram-100` | `50 20.7% 88.6%` | `48 3.4% 29.2%` | Icon background panels |
| `--pictogram-200` | `51 16.5% 84.5%` | `60 2.5% 23.3%` | Icon mid-tone |
| `--pictogram-300` | `0 0% 100%` (white) | `60 2.1% 18.4%` | Icon recess |
| `--pictogram-400` | `48 33.3% 97.1%` | `60 2.7% 14.5%` | Icon fill |

A separate track from `--bg-*` and `--text-*`. Icons can transition between modes on their own curve, which keeps them readable at small sizes without competing with body text.

---

## 4. Typography

### 4.1 Custom typefaces

Four `@font-face` families are loaded:

| Family | Weights | Styles | Role |
|---|---|---|---|
| **Anthropic Sans** | 300–800 (variable) | normal, italic | UI chrome, user messages |
| **Anthropic Serif** | 300–800 (variable) | normal, italic | Claude responses, display |
| **Anthropic Mono** | 400 | normal, italic | Code blocks |
| **OpenDyslexic** | 400, 700 | normal, italic | Accessibility opt-in |

All four are served as `.woff2` from `assets-proxy.anthropic.com` with `font-display: swap`.

### 4.2 Family tokens

```css
--font-anthropic-sans:  "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-anthropic-serif: "Anthropic Serif", Georgia, "Arial Hebrew", "Noto Sans Hebrew",
                        "Times New Roman", Times, "Hiragino Sans", "Yu Gothic", Meiryo,
                        "Noto Sans CJK JP", "PingFang TC", "Microsoft JhengHei",
                        "Noto Sans CJK TC", "PingFang SC", "Microsoft YaHei",
                        "Noto Sans CJK SC", "Apple SD Gothic Neo", "Malgun Gothic",
                        "Noto Sans CJK KR", serif;
--font-anthropic-mono:  "Anthropic Mono", ui-monospace, monospace;
--font-open-dyslexic:   "OpenDyslexic", "Comic Sans MS", ui-serif, serif;
```

The serif fallback chain covers Hebrew, Japanese, Traditional Chinese, Simplified Chinese, and Korean rendering — Claude's responses preserve serif character across languages where Anthropic Serif has glyphs and degrade gracefully where it doesn't.

### 4.3 Semantic font roles

```css
--font-mono:            var(--font-anthropic-mono);
--font-ui:              var(--font-anthropic-sans);
--font-ui-serif:        var(--font-anthropic-serif);
--font-claude-response: var(--font-anthropic-serif);  /* ← Claude's voice */
--font-user-message:    var(--font-ui);               /* ← User's voice */
--font-sans-serif:      var(--font-ui);
--font-serif:           var(--font-ui-serif);
--font-system:          system-ui, sans-serif;
--font-dyslexia:        var(--font-open-dyslexic), "Comic Sans MS", ui-serif, Georgia, serif;
```

**Default body:**

```css
html, body { font-family: var(--font-ui); }
```

The two highest-leverage roles to understand:

- `--font-claude-response` resolves to Anthropic Serif. Every Claude message renders in serif.
- `--font-user-message` resolves to Anthropic Sans. Every user message renders in sans.

### 4.4 Weights — variable-font axis values

```css
.font-normal   { font-weight: 430; }
.font-medium   { font-weight: 550; }
.font-semibold { font-weight: 580; }
.font-bold,
b, strong      { font-weight: 600; }
```

These are **not standard CSS weight steps** (which would be 400/500/600/700). They are specific axis positions on Anthropic Sans's variable-font weight axis, hand-tuned for the typeface's optical balance.

### 4.5 Dark-mode weight reduction

```css
[data-theme="claude"][data-mode="dark"] .font-base      { font-weight: 400; }  /* down from 430 */
[data-theme="claude"][data-mode="dark"] .font-base-bold { font-weight: 460; }
```

Light text on dark backgrounds appears optically heavier than dark text on light ("blooming"). The dark-mode ruleset shaves ~30 axis units off display weights to compensate. This is a deliberate optical correction, not a typo.

### 4.6 Mono / code rendering

```css
.font-mono, [class*="font-mono"], code, pre, kbd, samp {
  font-variant-ligatures: none;
  font-feature-settings: "calt" 0, "liga" 0;
}
```

Ligatures and contextual alternates are explicitly disabled on monospace — this prevents code from rendering things like `!=` as `≠` or `=>` as a fat arrow glyph. Important for code accuracy.

### 4.7 Sizes, line-heights, letter-spacing

**Not present in the inspected portion of the file.** These are likely defined in the Tailwind utility output (a separate CSS bundle), since classes like `text-sm` / `text-base` / `text-lg` are conventionally Tailwind-side rather than custom-property-side. To complete this section, inspect the main app CSS bundle.

---

## 5. Code Highlighting

Code blocks use **highlight.js with the One Dark theme**, applied as fixed colors outside the theming system:

```css
pre code.hljs       { display: block; overflow-x: auto; padding: 1em; }
code.hljs           { padding: 3px 5px; }
.hljs               { color: #abb2bf; background: #282c34; }

.hljs-comment, .hljs-quote                                    { color: #5c6370; font-style: italic; }
.hljs-keyword, .hljs-doctag, .hljs-formula                    { color: #c678dd; }
.hljs-name, .hljs-section, .hljs-selector-tag,
.hljs-deletion, .hljs-subst                                   { color: #e06c75; }
.hljs-literal                                                  { color: #56b6c2; }
.hljs-string, .hljs-regexp, .hljs-addition,
.hljs-attribute, .hljs-meta .hljs-string                      { color: #98c379; }
.hljs-attr, .hljs-variable, .hljs-template-variable,
.hljs-type, .hljs-selector-class, .hljs-selector-attr,
.hljs-selector-pseudo, .hljs-number                           { color: #d19a66; }
.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta,
.hljs-selector-id, .hljs-title                                { color: #61aeee; }
.hljs-built_in, .hljs-title.class_,
.hljs-class .hljs-title                                       { color: #e6c07b; }

.hljs-emphasis  { font-style: italic; }
.hljs-strong    { font-weight: 700; }
.hljs-link      { text-decoration: underline; }
```

**Notable choice:** code blocks render the same in both light and dark mode — always against the `#282c34` slate. Anthropic chose pragmatic readability over theme purity here.

---

## 6. The Console Theme (sibling)

The same file defines `[data-theme="console"]` — used by `console.anthropic.com`. It maps the identical token names to a different aesthetic:

| Token | Console value | Character |
|---|---|---|
| `--bg-000` | `0 0% 6%` | True near-black, cool |
| `--bg-100` | `0 0% 10%` | Slightly lifted |
| `--bg-500` | `0 0% 23%` | Deepest |
| `--text-000` | `0 0% 100%` | Pure white |
| `--accent-000` | `158 68% 32%` | **Green** (replaces Claude's blue accent) |
| `--brand-000` | `18 50.4% 47.5%` | Slightly muted clay |

**Default to dark** — the console selector is `[data-theme=console][data-mode=dark],[data-theme=console]`, meaning unless explicitly set to light, console renders dark. Reflects developer-tool conventions.

The takeaway: **one token system, two distinct product personalities.** Same component code, different theme attribute.

---

## 7. Implementation Patterns

### Surfaces with subtle borders

```css
.card {
  background: hsl(var(--bg-100));
  color:      hsl(var(--text-000));
  border:     1px solid hsl(var(--border-100) / 0.12);
  border-radius: 8px;
}
```

### Hover/active states by stepping the surface stack

```css
.button-secondary              { background: hsl(var(--bg-100)); }
.button-secondary:hover        { background: hsl(var(--bg-200)); }
.button-secondary:active       { background: hsl(var(--bg-300)); }
```

### Brand-colored CTA

```css
.button-primary {
  background: hsl(var(--brand-000));
  color:      hsl(var(--oncolor-100));
}
.button-primary:hover  { background: hsl(var(--brand-100)); }
.button-primary:active { background: hsl(var(--brand-200)); }
```

### Voice-differentiated messages

```css
.message--user   { font-family: var(--font-user-message); }
.message--claude { font-family: var(--font-claude-response); }
```

### Stateful surfaces (e.g. error toast)

```css
.toast--error {
  background: hsl(var(--danger-900));
  color:      hsl(var(--danger-000));
  border:     1px solid hsl(var(--danger-100) / 0.3);
}
```

---

## 8. Gaps in this reference

The inspected portion of `c6a992d55-CxerHqZJ.css` does not include:

- **Type sizes** (`--font-size-*`, `--line-height-*`, `--letter-spacing-*`) — likely in the Tailwind utility bundle.
- **Shadow tokens** (`--shadow-*`) — not present in this file. Shadows on claude.ai are extremely subtle and may be inline rather than tokenized.
- **Spacing scale** (`--space-*`) — likely Tailwind-side.
- **Border-radius scale** (`--radius-*`) — likely Tailwind-side.
- **Transition / motion tokens** — not visible in this slice.

To complete those layers, inspect the main app CSS bundle (separate file) and the Tailwind utility output.

---

## 9. Attribution and accuracy

This document was assembled from a single CSS asset (`c6a992d55-CxerHqZJ.css`) served from `assets-proxy.anthropic.com`. It reflects the production token system as of inspection but is not an Anthropic-published specification. Token names, values, and behavior described here are direct quotations of the file's contents; usage descriptions ("primary text," "hover states," etc.) are inferred from naming conventions and standard design-system practice. Claude.ai's design system may evolve; values in this document are a snapshot, not a contract.
