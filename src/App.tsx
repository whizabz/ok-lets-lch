import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { generateAllPalettes, exportPalettes } from './palette'
import type { ColorStop, ExportFormat } from './palette'
import './App.css'

const DEFAULT_COLOR = '#3b82f6'

const PALETTE_LABELS: Record<string, string> = {
  brand: 'Brand',
  neutral: 'Neutral',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  info: 'Info',
}

function WcagBadge({ rating }: { rating: 'AAA' | 'AA' | 'fail' }) {
  const cls =
    rating === 'AAA' ? 'badge badge--aaa' : rating === 'AA' ? 'badge badge--aa' : 'badge badge--fail'
  return <span className={cls}>{rating === 'fail' ? '—' : rating}</span>
}

function Swatch({ stop, paletteName }: { stop: ColorStop; paletteName: string }) {
  const [hovered, setHovered] = useState(false)
  const [flipDown, setFlipDown] = useState(false)
  const swatchRef = useRef<HTMLDivElement>(null)
  const textColor = stop.contrastBlack >= stop.contrastWhite ? '#000' : '#fff'
  const textRating = stop.contrastBlack >= stop.contrastWhite ? stop.wcagBlack : stop.wcagWhite

  useEffect(() => {
    if (hovered && swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect()
      setFlipDown(rect.top < 240)
    }
  }, [hovered])

  return (
    <div
      ref={swatchRef}
      className="swatch"
      style={{ background: stop.hex }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="swatch__step" style={{ color: textColor }}>
        {stop.step}
      </div>
      {hovered && (
        <div className={`swatch__tooltip${flipDown ? ' swatch__tooltip--below' : ''}`}>
          <div className="tooltip__hex">{stop.hex.toUpperCase()}</div>
          <div className="tooltip__css">{stop.css}</div>
          <div className="tooltip__var">--color-{paletteName}-{stop.step}</div>
          <div className="tooltip__divider" />
          <div className="tooltip__contrast">
            <span>on white</span>
            <WcagBadge rating={stop.wcagWhite} />
            <span className="tooltip__ratio">{stop.contrastWhite}:1</span>
          </div>
          <div className="tooltip__contrast">
            <span>on black</span>
            <WcagBadge rating={stop.wcagBlack} />
            <span className="tooltip__ratio">{stop.contrastBlack}:1</span>
          </div>
          <div className="tooltip__text-preview">
            <span style={{ background: '#fff', color: stop.hex }}>Aa</span>
            <span style={{ background: '#141413', color: stop.hex }}>Aa</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b6a64' }}>
            Best text: {textRating}
          </div>
        </div>
      )}
    </div>
  )
}

function PaletteRow({ name, stops }: { name: string; stops: ColorStop[] }) {
  return (
    <div className="palette-row">
      <div className="palette-label">{PALETTE_LABELS[name] ?? name}</div>
      <div className="palette-swatches">
        {stops.map((stop) => (
          <Swatch key={stop.step} stop={stop} paletteName={name} />
        ))}
      </div>
      <div className="palette-steps">
        {stops.map((stop) => (
          <div key={stop.step} className="step-label">{stop.step}</div>
        ))}
      </div>
    </div>
  )
}

function ExportPanel({ palettes }: { palettes: Record<string, ColorStop[]> }) {
  const [format, setFormat] = useState<ExportFormat>('css')
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => exportPalettes(palettes, format), [palettes, format])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  return (
    <div className="export-panel">
      <div className="export-header">
        <div className="export-tabs">
          {(['css', 'json', 'figma'] as ExportFormat[]).map((f) => (
            <button
              key={f}
              className={`tab ${format === f ? 'tab--active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'css' ? 'CSS Variables' : f === 'json' ? 'JSON Tokens' : 'Figma (Hex)'}
            </button>
          ))}
        </div>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="export-code">{output}</pre>
    </div>
  )
}

export default function App() {
  const [hex, setHex] = useState(DEFAULT_COLOR)
  const [inputVal, setInputVal] = useState(DEFAULT_COLOR)
  const [exportOpen, setExportOpen] = useState(false)

  const palettes = useMemo(() => {
    try {
      return generateAllPalettes(hex)
    } catch {
      return null
    }
  }, [hex])

  const handleTextInput = useCallback((val: string) => {
    setInputVal(val)
    const normalized = val.startsWith('#') ? val : `#${val}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      setHex(normalized)
    }
  }, [])

  const handlePickerChange = useCallback((val: string) => {
    setHex(val)
    setInputVal(val)
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header__logo">
          <p className="header__eyebrow">Color System</p>
          <div className="header__title">
            <div className="header__dot" style={{ background: hex }} />
            <h1>Ok Let's LCH</h1>
          </div>
        </div>
        <div className="header__controls">
          <div className="color-input-group">
            <input
              type="color"
              className="color-picker"
              value={hex}
              onChange={(e) => handlePickerChange(e.target.value)}
            />
            <input
              type="text"
              className="hex-input"
              value={inputVal}
              onChange={(e) => handleTextInput(e.target.value)}
              spellCheck={false}
              maxLength={7}
            />
          </div>
          <button
            className={`btn ${exportOpen ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setExportOpen((v) => !v)}
          >
            Export
          </button>
        </div>
      </header>

      {exportOpen && palettes && <ExportPanel palettes={palettes} />}

      <main>
        {palettes ? (
          <div className="palettes">
            {Object.entries(palettes).map(([name, stops]) => (
              <PaletteRow key={name} name={name} stops={stops} />
            ))}
          </div>
        ) : (
          <div className="error">Enter a valid hex color to generate palettes.</div>
        )}
      </main>

      <footer className="footer">
        <p>Hover any swatch for hex, CSS, and WCAG contrast ratios. Perceptually uniform scales via OKLCH.</p>
        <div className="footer__brand">
          Powered by <span>culori</span> · OKLCH color space
        </div>
      </footer>
    </div>
  )
}
