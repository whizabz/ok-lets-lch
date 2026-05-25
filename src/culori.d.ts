declare module 'culori' {
  export interface Rgb { mode: 'rgb'; r: number; g: number; b: number; alpha?: number }
  export interface Lrgb { mode: 'lrgb'; r: number; g: number; b: number; alpha?: number }
  export interface Oklab { mode: 'oklab'; l: number; a: number; b: number; alpha?: number }
  export interface Oklch { mode: 'oklch'; l: number; c: number; h?: number; alpha?: number }

  export type Color = Rgb | Lrgb | Oklab | Oklch | { mode: string; [key: string]: unknown }

  export function parse(color: string): Color | undefined
  export function formatHex(color: Color): string | undefined
  export function formatRgb(color: Color): string | undefined
  export function formatCss(color: Color): string | undefined
  export function converter<T extends Color>(mode: string): (color: Color | string) => T
  export function clampChroma(color: Color, mode?: string): Color
}
