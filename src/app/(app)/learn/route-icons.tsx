// Hand-drawn stroke icons for the Study Path "service route" skin.
// Each concept level shows a trade-themed icon on its road stop; the current
// stop shows the service VAN ("your van is parked at this job"). All icons are
// inline SVG (stroke = currentColor) so state colors come free from the pad.
//
// iconForConcept matches by keyword on the concept id so every present AND
// future concept id gets a sensible icon without maintaining a 1:1 table.

import type { ReactElement } from 'react'

type P = { size?: number }
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

function OzoneGlobe({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4 9.5h16M4 14.5h16M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
    </svg>
  )
}

function Cylinder({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M9 5h6M12 2v3" /><rect x="7.5" y="5" width="9" height="17" rx="3.5" /><path d="M10 10h4" />
    </svg>
  )
}

function Drops({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M9 4s4 4.6 4 7.6a4 4 0 0 1-8 0C5 8.6 9 4 9 4z" />
      <path d="M17 11s3 3.4 3 5.6a3 3 0 0 1-6 0c0-2.2 3-5.6 3-5.6z" />
    </svg>
  )
}

function OilCan({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M6 10h7l6-3v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M9 10V7h4M2.5 12.5 6 11" />
    </svg>
  )
}

function GaugeManifold({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <circle cx="8" cy="9" r="4.5" /><circle cx="16.5" cy="9" r="4.5" />
      <path d="M8 9l1.8-1.8M16.5 9l1.5-2M6 13.5 4.5 21M18.5 13.5 20 21M12 12.8V21" />
    </svg>
  )
}

function Clipboard({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
    </svg>
  )
}

function RecoveryMachine({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <rect x="4" y="8" width="12" height="11" rx="2" />
      <circle cx="10" cy="13.5" r="2.4" />
      <path d="M16 11h2.5l3-3M4 19v2h12v-2M7 8V6h6v2" />
    </svg>
  )
}

function VacuumPump({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <rect x="4" y="9" width="11" height="10" rx="2" />
      <circle cx="9.5" cy="14" r="2.2" />
      <path d="M15 12h3l3-3M4 19v2h11v-2M7 9V7h5v2" />
    </svg>
  )
}

function Toolbox({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2M3 14h18M12 12.5v3" />
    </svg>
  )
}

function HardHat({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M2.5 16h19M10 8.5V6h4v2.5M12 6v10" />
    </svg>
  )
}

function LeakDetector({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <rect x="4" y="10" width="8" height="12" rx="2" />
      <path d="M8 10V4M8 4c3 0 4 2 7 2s4-1.5 6-1.5M8 14h.01" />
      <path d="M6.5 17.5h3" />
    </svg>
  )
}

function CrossedWrench({ size = 22 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3z" />
    </svg>
  )
}

function DoorTag({ size = 22 }: P) {
  // "intro/classifications" — job-site door tag
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...D}>
      <path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2z" />
      <path d="M9.5 8.5h5M9.5 12h5" />
    </svg>
  )
}

// Keyword → icon. First match wins; ordered specific → general.
const RULES: Array<[RegExp, ({ size }: P) => ReactElement]> = [
  [/ozone/, OzoneGlobe],
  [/blend/, Drops],
  [/oil/, OilCan],
  [/cycle/, GaugeManifold],
  [/regulation/, Clipboard],
  [/recovery/, RecoveryMachine],
  [/dehydration|evac/, VacuumPump],
  [/equipment/, Toolbox],
  [/safety|repairs/, HardHat],
  [/leak/, LeakDetector],
  [/supplemental|review/, CrossedWrench],
  [/intro|classif/, DoorTag],
  [/refriger|servicing/, Cylinder],
]

export function iconForConcept(conceptId: string, size = 22): ReactElement {
  for (const [re, Icon] of RULES) {
    if (re.test(conceptId)) return <Icon size={size} />
  }
  return <Cylinder size={size} />
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
