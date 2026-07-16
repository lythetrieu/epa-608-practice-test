// Flat trade icons for the Study Path "service route" skin (Style 1 · flat color).
//
// Palette — brand-anchored, with real MATERIAL colors so each object reads as
// the thing a tech touches:
//   NAVY   #003087  primary body / gauge bezel (HVAC Navy — brand.primary)
//   STEEL  #4a6690  metal hardware (valves, hoses, feet)      — brand `steel`
//   SKY    #d9e6f7  gauge faces / light panels                 — blue-100
//   COPPER #c2703d  refrigerant cylinders / oil (material)
//   COPPER_D #a95a2b copper shoulders / shadow
//   RED    #e11d48  gauge needles · flame · alarm (reading/danger)
//   GREEN  #16a34a  positive action (check · patch · bubbles · sensor · OK)
//   GOLD   #eab308  reserved for STAR glyphs only
//
// Icons carry their own colors (not currentColor); state is shown by the PAD:
// done = light-green pad, current = navy pad with the VAN, locked = the concept
// icon greyed via a CSS filter (applied by StudyPathClient). VanIcon /
// TestingCenterIcon stay currentColor line marks (they sit on the navy pad).

import type { ReactElement } from 'react'

type P = { size?: number }

const NAVY = '#003087'
const STEEL = '#4a6690'
const SKY = '#d9e6f7'
const COPPER = '#c2703d'
const COPPER_D = '#a95a2b'
const RED = '#e11d48'
const GREEN = '#16a34a'
const GOLD = '#eab308'

// ── UI marks (currentColor line — live on the navy "current" pad) ───────────
const D = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function VanIcon({ size = 30 }: P) {
  return (
    <svg viewBox="0 0 32 24" width={size} height={size * 0.75} {...D} strokeWidth={1.8}>
      <path d="M2 16V8.5A1.5 1.5 0 0 1 3.5 7H17l4.5 4H28a2 2 0 0 1 2 2v3" />
      <path d="M2 16h28M17 7v4h4.5" />
      <circle cx="9" cy="18.5" r="2.6" /><circle cx="24" cy="18.5" r="2.6" />
      <path d="M5.5 10.5h6" />
    </svg>
  )
}

export function TestingCenterIcon({ size = 26 }: P) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} {...D} strokeWidth={1.8}>
      <path d="M4 26V12l11-6 11 6v14M4 26h22M15 6V2.5M15 2.5h5v3h-5" />
      <path d="M10 26v-6h4v6M18 17h4v4h-4z" />
    </svg>
  )
}

// Road segment between stops: asphalt bar + dashed white centerline.
export function Road() {
  return (
    <span className="relative w-[14px] flex-1 rounded-full overflow-hidden" style={{ background: '#d6dfe9' }}>
      <span
        className="absolute left-1/2 top-1 bottom-1 w-[2px] -translate-x-1/2 rounded-full"
        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #ffffff 0 6px, transparent 6px 14px)' }}
      />
    </span>
  )
}

// Gold 5-point star used inside the 4 "Mixed Review" seals only.
function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`)
  }
  return <polygon points={pts.join(' ')} fill={GOLD} />
}

const box = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' })

// A refrigerant/pressure gauge: navy bezel, sky face, RED needle, steel stem.
function gauge(cx: number, cy: number, r: number, needleTo: [number, number]) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={NAVY} />
      <circle cx={cx} cy={cy} r={r * 0.66} fill={SKY} />
      <path d={`M${cx} ${cy} ${needleTo[0]} ${needleTo[1]}`} fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.17} fill={NAVY} />
    </>
  )
}

// ═══════════════════════════ CORE (11) ═══════════════════════════
function OzoneGlobe({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <circle cx="12" cy="12" r="9" fill={NAVY} />
      <g fill="none" stroke={SKY} strokeWidth="1.4">
        <path d="M3.5 10h17M3.5 14h17M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
      </g>
    </svg>
  )
}
function RefrigerantCylinder({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="7" y="6" width="10" height="15.5" rx="4.5" fill={COPPER} />
      <path d="M7 11c0-2.6 2-5 5-5s5 2.4 5 5v.3H7z" fill={COPPER_D} />
      <rect x="7" y="12.8" width="10" height="3.6" fill={SKY} />
      <rect x="9.5" y="3" width="5" height="3.2" rx="1.2" fill={STEEL} />
      <rect x="10.8" y="1.5" width="2.4" height="2" rx="1" fill={STEEL} />
    </svg>
  )
}
function Blends({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M8.5 3.5s4.2 5 4.2 8.1a4.2 4.2 0 0 1-8.4 0C4.3 8.5 8.5 3.5 8.5 3.5z" fill={NAVY} />
      <path d="M16.8 10.5s3 3.6 3 5.7a3 3 0 0 1-6 0c0-2.1 3-5.7 3-5.7z" fill={COPPER} />
    </svg>
  )
}
function OilCan({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M6 11h7l6-3v7.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill={COPPER} />
      <path d="M9 11V8h4" fill="none" stroke={STEEL} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.5 12.6 6 11" fill="none" stroke={STEEL} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.6 15c0 .9-.75 1.5-1.5 0 0-1.5.75-2.2.75-2.2s.75.7.75 2.2z" fill={COPPER_D} />
    </svg>
  )
}
function CycleLoop({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <g fill="none" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round">
        <path d="M19 9.5A8 8 0 0 0 5.4 6" />
        <path d="M5 14.5a8 8 0 0 0 13.6 2.6" />
      </g>
      <path d="M5.6 2v4.2h4.2z" fill={NAVY} />
      <path d="M18.4 22v-4.2h-4.2z" fill={NAVY} />
      <circle cx="12" cy="12" r="2.4" fill={RED} />
    </svg>
  )
}
function Clipboard({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="4.5" y="4" width="15" height="17" rx="2.5" fill={NAVY} />
      <rect x="6.5" y="6.5" width="11" height="12" rx="1.5" fill={SKY} />
      <rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" fill={STEEL} />
      <path d="M8.5 12.5l2 2 3.5-4" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function RecoveryMachine({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="3.5" y="7.5" width="13" height="12" rx="2" fill={NAVY} />
      <circle cx="10" cy="13.5" r="3" fill={SKY} />
      <circle cx="10" cy="13.5" r="1" fill={RED} />
      <path d="M16.5 10.5h2.5l2.5-2.5" fill="none" stroke={STEEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6.5" y="4.5" width="7" height="3" rx="1" fill={STEEL} />
    </svg>
  )
}
function VacuumPump({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="3.5" y="8.5" width="12" height="11" rx="2" fill={NAVY} />
      <circle cx="9.5" cy="14" r="2.8" fill={SKY} />
      <circle cx="9.5" cy="14" r="0.9" fill={RED} />
      <path d="M15.5 11.5h3l2.5-2.5" fill="none" stroke={STEEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6.5" y="5.5" width="6" height="3" rx="1" fill={STEEL} />
    </svg>
  )
}
function Toolbox({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="3" y="9.5" width="18" height="10.5" rx="2" fill={NAVY} />
      <path d="M8.5 9.5V7.5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="12.5" width="18" height="2.5" fill={SKY} />
      <rect x="10.3" y="11.5" width="3.4" height="4.5" rx="1" fill={RED} />
    </svg>
  )
}
function HardHat({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M4 16a8 8 0 0 1 16 0z" fill={NAVY} />
      <rect x="2.5" y="16" width="19" height="2.6" rx="1.3" fill={STEEL} />
      <path d="M10 8.5V6.2h4v2.3" fill="none" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function StarDisc({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <circle cx="12" cy="12" r="9" fill={NAVY} />
      <Star cx={12} cy={12} r={5.4} />
    </svg>
  )
}

// ═══════════════════════════ TYPE I (5) ═══════════════════════════
function Fridge({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" fill={NAVY} />
      <rect x="6" y="10.5" width="12" height="1.6" fill={SKY} />
      <rect x="14.5" y="5" width="1.6" height="3" rx="0.8" fill={STEEL} />
      <rect x="14.5" y="13.5" width="1.6" height="3.5" rx="0.8" fill={STEEL} />
    </svg>
  )
}
function PiercingValve({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="2.5" y="14" width="19" height="6" rx="3" fill={NAVY} />
      <rect x="9" y="6" width="6" height="9" rx="1.5" fill={COPPER} />
      <path d="M12 6V2.5" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 2.5h6" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function SingleGauge({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      {gauge(12, 10.5, 7.5, [15, 7.5])}
      <rect x="9.5" y="18.5" width="5" height="3" rx="1" fill={STEEL} />
    </svg>
  )
}
function Goggles({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="2.5" y="8" width="19" height="8" rx="4" fill={NAVY} />
      <circle cx="8" cy="12" r="2.6" fill={SKY} />
      <circle cx="16" cy="12" r="2.6" fill={SKY} />
      <path d="M2.5 10.5 1 9M21.5 10.5 23 9" fill="none" stroke={STEEL} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function StarShield({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M12 2.5l8 3v6c0 5-3.6 8.2-8 10-4.4-1.8-8-5-8-10v-6z" fill={NAVY} />
      <Star cx={12} cy={11} r={5} />
    </svg>
  )
}

// ═══════════════════════════ TYPE II (9) ═══════════════════════════
function DoorTag({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2z" fill={NAVY} />
      <rect x="9.5" y="7.5" width="5" height="1.6" rx="0.8" fill={SKY} />
      <rect x="9.5" y="11" width="5" height="1.6" rx="0.8" fill={SKY} />
    </svg>
  )
}
function PercentDial({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      {gauge(12, 12, 8.5, [15.4, 8.6])}
    </svg>
  )
}
function ClipboardSearch({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="3.5" y="4" width="12" height="17" rx="2.5" fill={NAVY} />
      <rect x="5.5" y="6.5" width="8" height="12" rx="1.2" fill={SKY} />
      <rect x="6.5" y="2.5" width="6" height="3.4" rx="1.1" fill={STEEL} />
      <circle cx="16" cy="15" r="3.6" fill="none" stroke={GREEN} strokeWidth="2.2" />
      <path d="M18.6 17.6 21.5 20.5" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
function CylinderScale({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="8" y="3.5" width="8" height="12" rx="3.5" fill={COPPER} />
      <path d="M8 7c0-1.9 1.4-3.5 4-3.5s4 1.6 4 3.5v.2H8z" fill={COPPER_D} />
      <rect x="10" y="1.5" width="4" height="2.5" rx="1" fill={STEEL} />
      <rect x="4" y="17" width="16" height="3" rx="1.5" fill={STEEL} />
      <path d="M7 20v1.5M17 20v1.5M12 15.5V17" fill="none" stroke={STEEL} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function BarChart({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill={NAVY} />
      <rect x="7" y="13" width="2.6" height="4" rx="1" fill={GREEN} />
      <rect x="10.7" y="9.5" width="2.6" height="7.5" rx="1" fill={GREEN} />
      <rect x="14.4" y="6.5" width="2.6" height="10.5" rx="1" fill={SKY} />
    </svg>
  )
}
function SightGlass({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="1.5" y="10.5" width="21" height="3" rx="1.5" fill={NAVY} />
      <circle cx="12" cy="12" r="5" fill={NAVY} />
      <circle cx="12" cy="12" r="3.4" fill={SKY} />
      <circle cx="10.7" cy="13.2" r="0.9" fill={GREEN} />
      <circle cx="13.2" cy="10.8" r="0.9" fill={GREEN} />
    </svg>
  )
}
function ManifoldGauges({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <circle cx="7.5" cy="8.5" r="4.6" fill={NAVY} />
      <circle cx="16.5" cy="8.5" r="4.6" fill={NAVY} />
      <circle cx="7.5" cy="8.5" r="2.4" fill={SKY} />
      <circle cx="16.5" cy="8.5" r="2.4" fill={SKY} />
      <circle cx="7.5" cy="8.5" r="0.9" fill={RED} />
      <circle cx="16.5" cy="8.5" r="0.9" fill={RED} />
      <rect x="6" y="12" width="12" height="2.4" rx="1.2" fill={STEEL} />
      <path d="M7.5 14.4 6 21M16.5 14.4 18 21M12 13.4V21" fill="none" stroke={STEEL} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function Torch({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M18.6 3.5s2.7 3.2 2.7 5.1a2.7 2.7 0 0 1-5.4 0c0-1.9 2.7-5.1 2.7-5.1z" fill={RED} />
      <path d="M18.6 6.4s1.1 1.5 1.1 2.4a1.1 1.1 0 0 1-2.2 0c0-.9 1.1-2.4 1.1-2.4z" fill={GOLD} />
      <path d="m8.8 14.4 3.4 3.4-6 6L2.8 20.4z" fill={NAVY} />
      <path d="m13.4 13.2 2.6 2.6-1.9 1.9-2.6-2.6z" fill={STEEL} />
    </svg>
  )
}

// ═══════════════════════════ TYPE III (7) ═══════════════════════════
function Chiller({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="2.5" y="8" width="19" height="9" rx="4.5" fill={NAVY} />
      <circle cx="8" cy="12.5" r="1.6" fill={SKY} />
      <rect x="8.5" y="5.5" width="2" height="3" fill={STEEL} />
      <rect x="13.5" y="5.5" width="2" height="3" fill={STEEL} />
      <path d="M6.5 17v3.5M17.5 17v3.5" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function LeakDetector({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="7.5" y="9" width="6" height="12.5" rx="2" fill={NAVY} />
      <path d="M10.5 9V4.5c3 0 4 2 7 2" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18.5" cy="6.5" r="2.4" fill={GREEN} />
      <rect x="8.8" y="16.5" width="3.4" height="1.6" rx="0.8" fill={SKY} />
    </svg>
  )
}
function PipePatch({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="2" y="8.5" width="20" height="7" rx="2" fill={NAVY} />
      <rect x="9" y="6" width="6" height="12" rx="1.5" fill={GREEN} />
      <path d="M12 18.5s1.7 2 1.7 3.1a1.7 1.7 0 0 1-3.4 0c0-1.1 1.7-3.1 1.7-3.1z" fill={SKY} />
    </svg>
  )
}
function TankGauge({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="2.5" y="10" width="19" height="9" rx="4.5" fill={COPPER} />
      <path d="M2.5 14.5c0-2.5 2-4.5 9.5-4.5s9.5 2 9.5 4.5" fill={COPPER_D} />
      <circle cx="12" cy="6" r="2.8" fill={NAVY} />
      <circle cx="12" cy="6" r="1.3" fill={SKY} />
      <path d="M12 8.8v1.2" fill="none" stroke={STEEL} strokeWidth="1.8" />
    </svg>
  )
}
function MicronGauge({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <rect x="4.5" y="6.5" width="15" height="14" rx="2.5" fill={NAVY} />
      <rect x="7" y="9" width="10" height="5" rx="1.2" fill={GREEN} />
      <path d="M9 3.5h6M12 3.5V6.5" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
      <g fill={SKY}><circle cx="9" cy="17.5" r="1" /><circle cx="12" cy="17.5" r="1" /><circle cx="15" cy="17.5" r="1" /></g>
    </svg>
  )
}
function AlarmBell({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M6 17V9.5a6 6 0 0 1 12 0V17l1.5 2H4.5z" fill={NAVY} />
      <path d="M10 19.5a2 2 0 0 0 4 0z" fill={STEEL} />
      <path d="M12 3.5V2" fill="none" stroke={STEEL} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8a5 5 0 0 1 0-4M20 8a5 5 0 0 0 0-4" fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function Trophy({ size = 22 }: P) {
  return (
    <svg {...box(size)}>
      <path d="M7.5 3.5h9v5.5a4.5 4.5 0 0 1-9 0z" fill={NAVY} />
      <path d="M7.5 4.5H4.5a3 3 0 0 0 3 3.8M16.5 4.5h3a3 3 0 0 1-3 3.8" fill="none" stroke={STEEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="18.5" width="6" height="2.5" rx="1" fill={STEEL} />
      <path d="M12 13.5v5" fill="none" stroke={STEEL} strokeWidth="2" />
      <Star cx={12} cy={6.2} r={2.6} />
    </svg>
  )
}

// Explicit per-level map — every concept id gets its own flat glyph.
const CONCEPT_ICONS: Record<string, ({ size }: P) => ReactElement> = {
  // Core
  'core-ozone': OzoneGlobe,
  'core-refrigerants': RefrigerantCylinder,
  'core-blends': Blends,
  'core-oils': OilCan,
  'core-cycle': CycleLoop,
  'core-regulations': Clipboard,
  'core-recovery': RecoveryMachine,
  'core-dehydration': VacuumPump,
  'core-equipment': Toolbox,
  'core-safety': HardHat,
  'core-supplemental': StarDisc,
  // Type I
  't1-regulations': Fridge,
  't1-recovery': PiercingValve,
  't1-servicing': SingleGauge,
  't1-safety': Goggles,
  't1-supplemental': StarShield,
  // Type II
  't2-intro': DoorTag,
  't2-leak-rates': PercentDial,
  't2-leak-inspections': ClipboardSearch,
  't2-recovery': CylinderScale,
  't2-evac-levels': BarChart,
  't2-accessories': SightGlass,
  't2-evac-charging': ManifoldGauges,
  't2-repairs-safety': Torch,
  't2-supplemental': StarDisc,
  // Type III
  't3-intro': Chiller,
  't3-leak-detection': LeakDetector,
  't3-leak-repair': PipePatch,
  't3-recovery': TankGauge,
  't3-evac-charging': MicronGauge,
  't3-repairs-safety': AlarmBell,
  't3-supplemental': Trophy,
}

// Keyword fallback for any FUTURE concept id not in the table above.
const RULES: Array<[RegExp, ({ size }: P) => ReactElement]> = [
  [/ozone/, OzoneGlobe],
  [/blend/, Blends],
  [/oil/, OilCan],
  [/cycle/, CycleLoop],
  [/inspection/, ClipboardSearch],
  [/regulation|intro|classif/, Clipboard],
  [/accessor/, SightGlass],
  [/evac|dehydration|charg/, ManifoldGauges],
  [/equipment/, Toolbox],
  [/safety|repairs/, HardHat],
  [/leak/, LeakDetector],
  [/supplemental|review/, StarDisc],
  [/recovery|servicing/, RecoveryMachine],
  [/refriger/, RefrigerantCylinder],
]

export function iconForConcept(conceptId: string, size = 22): ReactElement {
  const Exact = CONCEPT_ICONS[conceptId]
  if (Exact) return <Exact size={size} />
  for (const [re, Icon] of RULES) {
    if (re.test(conceptId)) return <Icon size={size} />
  }
  return <RefrigerantCylinder size={size} />
}
