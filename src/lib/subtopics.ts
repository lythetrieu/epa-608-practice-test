import type { Category } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Subtopic Labels — human-readable names for every subtopic_id in the
// questions table. Used by the blind-spot / weak-spot training UI.
// ─────────────────────────────────────────────────────────────────────────────

export const SUBTOPIC_LABELS: Record<string, string> = {
  // ── Core: Environment & Ozone (1.x) ──────────────────────────────────────
  'core-env-1.1': 'Ozone Layer & Stratospheric Chemistry',
  'core-env-1.2': 'Refrigerant Types (CFC / HCFC / HFC / Natural)',
  'core-env-1.3': 'ODP, GWP & Environmental Impact Metrics',

  // ── Core: Clean Air Act (2.x) ────────────────────────────────────────────
  'core-caa-2.1': 'Clean Air Act Overview & EPA Authority',
  'core-caa-2.2': 'Section 608 Certification Requirements',
  'core-caa-2.3': 'Penalties, Enforcement & Violations',
  'core-caa-2.4': 'Montreal Protocol & International Treaties',

  // ── Core: Regulations (3.x) ──────────────────────────────────────────────
  'core-regs-3.1': 'Venting Prohibition & De Minimis Releases',
  'core-regs-3.2': 'Technician Certification Types & Requirements',
  'core-regs-3.3': 'Recordkeeping & Documentation Rules',
  'core-regs-3.4': 'Refrigerant Sales Restrictions',
  'core-regs-3.5': 'AIM Act & HFC Phasedown Regulations',

  // ── Core: Substances & Refrigerants (4.x) ────────────────────────────────
  'core-sub-4.1': 'Refrigerant Substitutes & SNAP Program',
  'core-sub-4.2': 'Lubricating Oils & Refrigerant Compatibility',
  'core-sub-4.3': 'Refrigerant Blends, Fractionation & Charging',

  // ── Core: Refrigerant Properties (5.x) ───────────────────────────────────
  'core-ref-5.1': 'Refrigeration Cycle & Pressure-Temperature Basics',
  'core-ref-5.2': 'Manifold Gauges & Diagnostic Tools',
  'core-ref-5.3': 'Leak Detection Methods & Equipment',

  // ── Core: Recovery / Recycle / Reclaim (6.x) ─────────────────────────────
  'core-3rs-6.1': 'Recovery, Recycling & Reclamation Definitions',

  // ── Core: Recovery Equipment (7.x) ───────────────────────────────────────
  'core-rec-7.1': 'Recovery Machine Types & Certification (ARI 740)',
  'core-rec-7.2': 'Recovery Procedures & Best Practices',

  // ── Core: Evacuation (8.x) ───────────────────────────────────────────────
  'core-evac-8.1': 'Evacuation Levels & Required Vacuum Depths',
  'core-evac-8.2': 'Vacuum Pumps, Micron Gauges & Procedures',

  // ── Core: Safety (9.x) ──────────────────────────────────────────────────
  'core-safe-9.1': 'Personal Protective Equipment (PPE)',
  'core-safe-9.2': 'Cylinder Handling, Storage & Color Codes',
  'core-safe-9.3': 'Refrigerant Exposure & Health Hazards',
  'core-safe-9.4': 'Ventilation & Oxygen Displacement Risks',
  'core-safe-9.5': 'Pressure Safety & Relief Devices',

  // ── Core: Shipping & Disposal (10.x) ─────────────────────────────────────
  'core-ship-10.1': 'Cylinder Labeling & DOT Transport Rules',
  'core-ship-10.2': 'Appliance Disposal & Decommissioning',
  'core-ship-10.3': 'Used Refrigerant Handling & Reclaim Shipment',

  // ── Type I: Small Appliance Recovery (1.x) ───────────────────────────────
  't1-rec-1.1': 'Small Appliance Recovery Requirements',
  't1-rec-1.2': 'System-Dependent Recovery (Capture 80%)',
  't1-rec-1.3': 'Self-Contained Recovery (Capture 90%)',
  't1-rec-1.4': 'Recovery Efficiency & Verification',
  't1-rec-1.5': 'Non-Working Small Appliance Recovery',

  // ── Type I: Techniques (2.x) ────────────────────────────────────────────
  't1-tech-2.1': 'Accessing Sealed Systems & Process Tubes',
  't1-tech-2.2': 'Piercing Valves & Service Port Installation',
  't1-tech-2.3': 'Compressor Burnout & Contamination Handling',
  't1-tech-2.4': 'Brazing, Soldering & Leak Repair on Small Systems',

  // ── Type I: Safety (3.x) ────────────────────────────────────────────────
  't1-safe-3.1': 'Small Appliance Safety & Flammable Refrigerants',

  // ── Type II: Leak Detection (1.x) ───────────────────────────────────────
  't2-leak-1.1': 'Leak Rate Calculation & Thresholds',
  't2-leak-1.2': 'Mandatory Leak Repair Timelines',
  't2-leak-1.3': 'Leak Inspection Methods (Standing Pressure Test)',
  't2-leak-1.4': 'Leak Verification & Follow-Up Requirements',

  // ── Type II: Repair (2.x) ──────────────────────────────────────────────
  't2-repair-2.1': 'Comfort Cooling Leak Repair Triggers (20%)',
  't2-repair-2.2': 'Commercial Refrigeration Leak Repair Triggers',
  't2-repair-2.3': 'Retrofit & Replacement Plans',
  't2-repair-2.4': 'Extensions, Exemptions & Mothballing',
  't2-repair-2.5': 'Chronic Leaker Provisions',
  't2-repair-2.6': 'Repair Verification & Documentation',

  // ── Type II: Recovery (3.x) ─────────────────────────────────────────────
  't2-rec-3.1': 'High-Pressure System Recovery Requirements',
  't2-rec-3.2': 'Evacuation Levels by System Size & Date',
  't2-rec-3.3': 'Liquid & Vapor Recovery Techniques',
  't2-rec-3.4': 'Recovery Equipment for High-Pressure Systems',

  // ── Type II: Techniques (4.x) ──────────────────────────────────────────
  't2-tech-4.1': 'Charging, Subcooling & Superheat Methods',
  't2-tech-4.2': 'System Diagnosis & Troubleshooting',

  // ── Type II: Refrigerants (5.x) ────────────────────────────────────────
  't2-ref-5.1': 'High-Pressure Refrigerant Properties (R-410A, R-134a)',
  't2-ref-5.2': 'Pressure-Temperature Relationships',
  't2-ref-5.3': 'Refrigerant Contamination & Moisture Effects',
  't2-ref-5.4': 'Refrigerant Identification & Cylinder Colors',

  // ── Type III: Leak Detection (1.x) ──────────────────────────────────────
  't3-leak-1.1': 'Low-Pressure System Leak Rate Thresholds',
  't3-leak-1.2': 'Low-Pressure Leak Detection Methods',
  't3-leak-1.3': 'Purge Unit Operation & Leak Indicators',
  't3-leak-1.4': 'Air Ingress & Moisture in Low-Pressure Systems',

  // ── Type III: Repair (2.x) ─────────────────────────────────────────────
  't3-repair-2.1': 'Centrifugal Chiller Leak Repair Requirements',

  // ── Type III: Recovery (3.x) ────────────────────────────────────────────
  't3-rec-3.1': 'Low-Pressure System Recovery Requirements',
  't3-rec-3.2': 'Evacuation Levels for Low-Pressure Equipment',
  't3-rec-3.3': 'Recovery Procedures for Centrifugal Chillers',
  't3-rec-3.4': 'Water-in-Tube vs. Refrigerant-in-Tube Chillers',

  // ── Type III: Recharging (4.x) ─────────────────────────────────────────
  't3-rech-4.1': 'Low-Pressure Chiller Recharging Procedures',
  't3-rech-4.2': 'Vapor-First Charging & Flash-Freeze Prevention',

  // ── Type III: Refrigerants (5.x) ───────────────────────────────────────
  't3-ref-5.1': 'Low-Pressure Refrigerant Properties (R-11, R-123)',
  't3-ref-5.2': 'Operating Pressures Below Atmospheric',
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtopic Groups — clusters subtopics by major topic area for UI grouping.
// ─────────────────────────────────────────────────────────────────────────────

export type SubtopicGroup = {
  key: string
  label: string
  category: Category
  subtopicIds: string[]
}

export const SUBTOPIC_GROUPS: SubtopicGroup[] = [
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    key: 'core-env',
    label: 'Environment & Ozone',
    category: 'Core',
    subtopicIds: ['core-env-1.1', 'core-env-1.2', 'core-env-1.3'],
  },
  {
    key: 'core-caa',
    label: 'Clean Air Act',
    category: 'Core',
    subtopicIds: ['core-caa-2.1', 'core-caa-2.2', 'core-caa-2.3', 'core-caa-2.4'],
  },
  {
    key: 'core-regs',
    label: 'Regulations',
    category: 'Core',
    subtopicIds: ['core-regs-3.1', 'core-regs-3.2', 'core-regs-3.3', 'core-regs-3.4', 'core-regs-3.5'],
  },
  {
    key: 'core-sub',
    label: 'Substances & Refrigerants',
    category: 'Core',
    subtopicIds: ['core-sub-4.1', 'core-sub-4.2', 'core-sub-4.3'],
  },
  {
    key: 'core-ref',
    label: 'Refrigerant Properties',
    category: 'Core',
    subtopicIds: ['core-ref-5.1', 'core-ref-5.2', 'core-ref-5.3'],
  },
  {
    key: 'core-3rs',
    label: 'Recovery / Recycle / Reclaim',
    category: 'Core',
    subtopicIds: ['core-3rs-6.1'],
  },
  {
    key: 'core-rec',
    label: 'Recovery Equipment',
    category: 'Core',
    subtopicIds: ['core-rec-7.1', 'core-rec-7.2'],
  },
  {
    key: 'core-evac',
    label: 'Evacuation',
    category: 'Core',
    subtopicIds: ['core-evac-8.1', 'core-evac-8.2'],
  },
  {
    key: 'core-safe',
    label: 'Safety',
    category: 'Core',
    subtopicIds: ['core-safe-9.1', 'core-safe-9.2', 'core-safe-9.3', 'core-safe-9.4', 'core-safe-9.5'],
  },
  {
    key: 'core-ship',
    label: 'Shipping & Disposal',
    category: 'Core',
    subtopicIds: ['core-ship-10.1', 'core-ship-10.2', 'core-ship-10.3'],
  },

  // ── Type I ────────────────────────────────────────────────────────────────
  {
    key: 't1-rec',
    label: 'Small Appliance Recovery',
    category: 'Type I',
    subtopicIds: ['t1-rec-1.1', 't1-rec-1.2', 't1-rec-1.3', 't1-rec-1.4', 't1-rec-1.5'],
  },
  {
    key: 't1-tech',
    label: 'Type I Techniques',
    category: 'Type I',
    subtopicIds: ['t1-tech-2.1', 't1-tech-2.2', 't1-tech-2.3', 't1-tech-2.4'],
  },
  {
    key: 't1-safe',
    label: 'Type I Safety',
    category: 'Type I',
    subtopicIds: ['t1-safe-3.1'],
  },

  // ── Type II ───────────────────────────────────────────────────────────────
  {
    key: 't2-leak',
    label: 'Leak Detection',
    category: 'Type II',
    subtopicIds: ['t2-leak-1.1', 't2-leak-1.2', 't2-leak-1.3', 't2-leak-1.4'],
  },
  {
    key: 't2-repair',
    label: 'Leak Repair',
    category: 'Type II',
    subtopicIds: ['t2-repair-2.1', 't2-repair-2.2', 't2-repair-2.3', 't2-repair-2.4', 't2-repair-2.5', 't2-repair-2.6'],
  },
  {
    key: 't2-rec',
    label: 'High-Pressure Recovery',
    category: 'Type II',
    subtopicIds: ['t2-rec-3.1', 't2-rec-3.2', 't2-rec-3.3', 't2-rec-3.4'],
  },
  {
    key: 't2-tech',
    label: 'Type II Techniques',
    category: 'Type II',
    subtopicIds: ['t2-tech-4.1', 't2-tech-4.2'],
  },
  {
    key: 't2-ref',
    label: 'Type II Refrigerants',
    category: 'Type II',
    subtopicIds: ['t2-ref-5.1', 't2-ref-5.2', 't2-ref-5.3', 't2-ref-5.4'],
  },

  // ── Type III ──────────────────────────────────────────────────────────────
  {
    key: 't3-leak',
    label: 'Low-Pressure Leak Detection',
    category: 'Type III',
    subtopicIds: ['t3-leak-1.1', 't3-leak-1.2', 't3-leak-1.3', 't3-leak-1.4'],
  },
  {
    key: 't3-repair',
    label: 'Centrifugal Chiller Repair',
    category: 'Type III',
    subtopicIds: ['t3-repair-2.1'],
  },
  {
    key: 't3-rec',
    label: 'Low-Pressure Recovery',
    category: 'Type III',
    subtopicIds: ['t3-rec-3.1', 't3-rec-3.2', 't3-rec-3.3', 't3-rec-3.4'],
  },
  {
    key: 't3-rech',
    label: 'Low-Pressure Recharging',
    category: 'Type III',
    subtopicIds: ['t3-rech-4.1', 't3-rech-4.2'],
  },
  {
    key: 't3-ref',
    label: 'Low-Pressure Refrigerants',
    category: 'Type III',
    subtopicIds: ['t3-ref-5.1', 't3-ref-5.2'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Get a human-readable label for a subtopic_id, or fall back to the raw id. */
export function getSubtopicLabel(subtopicId: string): string {
  return SUBTOPIC_LABELS[subtopicId] ?? subtopicId
}

/** Get category for a subtopic_id; returns 'Core' as fallback. */
export function getSubtopicCategory(subtopicId: string): Category {
  const group = SUBTOPIC_GROUPS.find((g) => g.subtopicIds.includes(subtopicId))
  return group?.category ?? 'Core'
}

/** Find the group a subtopic belongs to. */
export function getSubtopicGroup(subtopicId: string): SubtopicGroup | undefined {
  return SUBTOPIC_GROUPS.find((g) => g.subtopicIds.includes(subtopicId))
}

/** Get all groups for a given category (e.g. 'Core', 'Type II'). */
export function getGroupsByCategory(category: Category): SubtopicGroup[] {
  return SUBTOPIC_GROUPS.filter((g) => g.category === category)
}
