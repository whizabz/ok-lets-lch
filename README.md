# Ok, let's LCH

Give it a primary colour and it generates a full design system palette: primary, secondary, neutral, and all four status scales, with a live UI preview and several export formats.

**[Try it →](https://ok-lets-lch.vercel.app)**

---

## Why OKLCH?

Most palette tools use HSL. The problem: HSL's lightness axis is mathematically defined but perceptually inconsistent. A yellow at 50% HSL lightness looks far brighter than a blue at the same value. You end up nudging colours by eye every time you pair them.

OKLCH's L axis is calibrated to human vision. L 0.58 in green and L 0.58 in purple genuinely appear equally bright. Define a rule like "all interactive elements use step 500" and every colour at that step will feel consistent in weight, regardless of hue. No manual nudging.

---

## How it works

### Colour input

Set your primary colour with the H (hue), C (chroma), and L (lightness) sliders, or type a hex code into the swatch. Hex values get converted to OKLCH to extract true hue and chroma. An anchor indicator shows whether the original hex lands exactly at step 500 or got shifted.

### Scale generation

Each scale has 10 steps (50–900). Step 500 is anchored to your chosen L, with 50–400 spread evenly above it and 600–900 below. Chroma tapers near the extremes so step 50 reads as near-white and step 900 as near-black, whatever chroma the source colour has.

### Palette structure

| Scale | How it's derived |
|---|---|
| Primary | Your input H, C, and L |
| Secondary | H rotated by +30° (harmonious), +180° (complementary), or +120° (triadic); C × 0.88 |
| Neutral | Same H as primary, C = 0 / 0.012 / 0.028 (none / subtle / visible tint) |
| Danger | H = 22°, C = 0.22 |
| Warning | H = 78°, C = 0.19 |
| Success | H = 145°, C = 0.20 |
| Info | H = 248°, C = 0.18 |

Status hues shift by +40° if they're within 28° of your primary, so they always read as distinct.

### UI preview

A mid-fidelity analytics dashboard built entirely from the generated palette, no hardcoded colours. Switch between light/dark and desktop/mobile to see how the colours hold up across surfaces, text hierarchy, data viz, and status badges.

---

## Exports

| Format | File | Description |
|---|---|---|
| Semantic tokens | `semantic-tokens.css` | Role-based CSS custom properties (`--color-background`, `--color-text`, `--color-brand`, status pairs). Available as light only, dark only, or both (`:root {}` + `.dark {}`). |
| CSS custom properties | `palette.css` | Raw scale tokens (`--color-primary-500`) with native `oklch()` values and hex fallbacks as comments. |
| JSON tokens | `palette.json` | Structured token object with `oklch`, `hex`, `l`, `c`, `h` per step. Compatible with Style Dictionary. |
| Tailwind config | `tailwind-colors.js` | `colors: {}` object for `tailwind.config.js → theme.extend`. Hex values with oklch as comments. |
| Figma variables | `figma-variables.json` | Figma Variables API format, grouped as `Primary/500`, `Status/Danger/400` etc. Import via the Figma Variables plugin. |
| SVG palette sheet | `palette.svg` | All scales as labelled colour chips. Useful for Notion, slides, or design handoff. |

---

## Running locally

Open `index.html` directly in a browser. No build step, no dependencies.

```sh
python3 -m http.server 3000
```

Clipboard copy needs a secure context (https or localhost) in some browsers, so a local server is worth running if that matters to you.

---

## Technical notes

Vanilla HTML, CSS, and JavaScript — no framework, no build step. All colour math is in pure JS with no colour libraries; the OKLCH to sRGB conversion follows the standard ICC pipeline with gamma correction. Lightness stops are computed dynamically from your anchor L value rather than hardcoded, so the scale distribution shifts as you move the slider.

---

## Colour math

The conversion functions in `main.js` implement the OKLCH → OKLab → linear sRGB → gamma-compressed sRGB pipeline. The reverse (hex → OKLCH) runs when you type a hex code, pulling the true hue and chroma for the sliders.
