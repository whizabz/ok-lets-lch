import { parse, converter, formatHex, formatRgb, clampChroma } from 'culori'
import type { Oklch, Lrgb } from 'culori'

const toOklch = converter('oklch')
const toLrgb = converter('lrgb')

export interface ColorStop {
  step: number
  oklch: Oklch
  hex: string
  rgb: string
  css: string
  contrastWhite: number
  contrastBlack: number
  wcagWhite: 'AAA' | 'AA' | 'fail'
  wcagBlack: 'AAA' | 'AA' | 'fail'
}

export type ExportFormat = 'css' | 'json' | 'figma'

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

const LIGHTNESS_MAP: Record<number, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.86,
  300: 0.76,
  400: 0.65,
  500: 0.53,
  600: 0.42,
  700: 0.33,
  800: 0.24,
  900: 0.14,
}

// Chroma peaks at 500, tapers at both ends to avoid washed-out tints and muddy darks
const CHROMA_SCALE: Record<number, number> = {
  50: 0.08,
  100: 0.18,
  200: 0.35,
  300: 0.60,
  400: 0.85,
  500: 1.0,
  600: 0.95,
  700: 0.85,
  800: 0.70,
  900: 0.55,
}

function relativeLuminance(color: Oklch): number {
  const lrgb = toLrgb(color) as Lrgb | undefined
  if (!lrgb) return 0
  const r = Math.max(0, lrgb.r ?? 0)
  const g = Math.max(0, lrgb.g ?? 0)
  const b = Math.max(0, lrgb.b ?? 0)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function wcagRating(ratio: number): 'AAA' | 'AA' | 'fail' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return 'fail'
}

function buildStop(raw: Oklch, step: number): ColorStop {
  const clamped = clampChroma(raw, 'oklch') as Oklch
  const hex = formatHex(clamped) ?? '#000000'
  const rgb = formatRgb(clamped) ?? 'rgb(0,0,0)'
  const css = `oklch(${(clamped.l * 100).toFixed(1)}% ${clamped.c.toFixed(4)} ${(clamped.h ?? 0).toFixed(1)})`

  const lum = relativeLuminance(clamped)
  const cw = contrastRatio(lum, 1)
  const cb = contrastRatio(lum, 0)

  return {
    step,
    oklch: clamped,
    hex,
    rgb,
    css,
    contrastWhite: parseFloat(cw.toFixed(2)),
    contrastBlack: parseFloat(cb.toFixed(2)),
    wcagWhite: wcagRating(cw),
    wcagBlack: wcagRating(cb),
  }
}

export function generateScale(brandHex: string, overrideChroma?: number, overrideHue?: number): ColorStop[] {
  const parsed = parse(brandHex)
  if (!parsed) throw new Error(`Cannot parse color: ${brandHex}`)

  const base = toOklch(parsed) as Oklch
  const chroma = overrideChroma ?? base.c
  const hue = overrideHue ?? (base.h ?? 0)

  return STEPS.map((step) => {
    const l = LIGHTNESS_MAP[step]
    const c = chroma * CHROMA_SCALE[step]
    return buildStop({ mode: 'oklch', l, c, h: hue }, step)
  })
}

export function generateNeutral(brandHex: string): ColorStop[] {
  const parsed = parse(brandHex)
  if (!parsed) throw new Error(`Cannot parse color: ${brandHex}`)
  const base = toOklch(parsed) as Oklch
  const hue = base.h ?? 0

  // Slight chromatic tint toward brand hue for warmth; barely perceptible
  return STEPS.map((step) => {
    const l = LIGHTNESS_MAP[step]
    return buildStop({ mode: 'oklch', l, c: 0.006, h: hue }, step)
  })
}

const SEMANTIC_HUES: Record<string, number> = {
  success: 145,
  warning: 80,
  danger: 25,
  info: 220,
}

export function generateSemanticPalettes(brandHex: string): Record<string, ColorStop[]> {
  const parsed = parse(brandHex)
  if (!parsed) throw new Error(`Cannot parse color: ${brandHex}`)
  const base = toOklch(parsed) as Oklch
  const semanticChroma = Math.max(base.c, 0.17)

  return Object.fromEntries(
    Object.entries(SEMANTIC_HUES).map(([name, hue]) => [
      name,
      generateScale(brandHex, semanticChroma, hue),
    ])
  )
}

export function generateAllPalettes(brandHex: string): Record<string, ColorStop[]> {
  return {
    brand: generateScale(brandHex),
    neutral: generateNeutral(brandHex),
    ...generateSemanticPalettes(brandHex),
  }
}

export function exportPalettes(palettes: Record<string, ColorStop[]>, format: ExportFormat): string {
  if (format === 'css') {
    const lines = [':root {']
    for (const [name, stops] of Object.entries(palettes)) {
      lines.push(`  /* ${name} */`)
      for (const stop of stops) {
        lines.push(`  --color-${name}-${stop.step}: ${stop.css};`)
      }
    }
    lines.push('}')
    return lines.join('\n')
  }

  if (format === 'json') {
    const tokens: Record<string, Record<string, { value: string; type: string }>> = {}
    for (const [name, stops] of Object.entries(palettes)) {
      tokens[name] = {}
      for (const stop of stops) {
        tokens[name][stop.step] = { value: stop.css, type: 'color' }
      }
    }
    return JSON.stringify(tokens, null, 2)
  }

  // figma: hex values
  const out: Record<string, Record<string, string>> = {}
  for (const [name, stops] of Object.entries(palettes)) {
    out[name] = {}
    for (const stop of stops) {
      out[name][String(stop.step)] = stop.hex
    }
  }
  return JSON.stringify(out, null, 2)
}
