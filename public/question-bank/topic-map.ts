/**
 * TOPIC MAP — Coverage Targets
 *
 * Defines EXACTLY what must be in the question bank.
 * Pipeline uses this to find gaps and drive generation.
 *
 * target: number of questions needed per subtopic
 *  - Easy: 3 questions (straightforward recall)
 *  - Medium: 4 questions (application + scenario)
 *  - Hard: 2 questions (edge cases, tricky wording)
 *  → ~9 questions per subtopic × varying subtopics
 */

export type Subtopic = {
  id: string              // e.g., "core-env-1.1"
  label: string
  targetCount: number     // total questions wanted
  angles: QuestionAngle[] // types of questions to generate
  keyFacts?: string[]     // fact keys from facts.ts to include
}

export type Topic = {
  id: string
  label: string
  category: 'Core' | 'Type I' | 'Type II' | 'Type III'
  subtopics: Subtopic[]
}

export type QuestionAngle =
  | 'definition'     // What is X?
  | 'calculation'    // What % / what value / how many?
  | 'application'    // Technician must do X, what should they...?
  | 'exception'      // Which situation is an EXCEPTION to...?
  | 'procedure'      // What is the correct sequence/method for...?
  | 'comparison'     // Which refrigerant has higher/lower...?
  | 'identification' // Which of the following is a [type] refrigerant?
  | 'compliance'     // Is this action compliant? What's the violation?
  | 'scenario_2026'  // Scenario specifically testing 2026 regulation changes

export const TOPIC_MAP: Topic[] = [

  // ══════════════════════════════════════════════════════════════════
  // CORE SECTION
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'core-env',
    label: 'Environmental Impacts',
    category: 'Core',
    subtopics: [
      {
        id: 'core-env-1.1',
        label: 'Ozone depletion mechanism',
        targetCount: 8,
        angles: ['definition', 'application', 'identification'],
      },
      {
        id: 'core-env-1.2',
        label: 'Refrigerant classification: CFC / HCFC / HFC / HFO / A2L',
        targetCount: 12,
        angles: ['identification', 'comparison', 'definition'],
        keyFacts: ['r12_odp', 'r22_odp', 'r123_odp', 'r410a_gwp', 'r454b_gwp', 'r32_gwp'],
      },
      {
        id: 'core-env-1.3',
        label: 'ODP vs GWP comparison',
        targetCount: 8,
        angles: ['definition', 'comparison', 'application'],
        keyFacts: ['r12_odp'],
      },
    ],
  },

  {
    id: 'core-caa',
    label: 'Clean Air Act & Montreal Protocol',
    category: 'Core',
    subtopics: [
      {
        id: 'core-caa-2.1',
        label: 'CFC and R-22 phaseout dates',
        targetCount: 10,
        angles: ['definition', 'identification', 'compliance'],
        keyFacts: ['cfc_production_ended', 'r22_new_equipment_ended', 'r22_production_import_ended'],
      },
      {
        id: 'core-caa-2.2',
        label: 'Venting prohibition — dates and scope',
        targetCount: 10,
        angles: ['compliance', 'definition', 'exception', 'application'],
        keyFacts: ['venting_prohibition_cfc_hcfc_date', 'venting_prohibition_hfc_date', 'de_minimis_max_oz'],
      },
      {
        id: 'core-caa-2.3',
        label: 'Civil penalties',
        targetCount: 6,
        angles: ['calculation', 'compliance', 'application'],
        keyFacts: ['civil_penalty_per_day', 'civil_penalty_subsequent'],
      },
      {
        id: 'core-caa-2.4',
        label: 'Montreal Protocol structure and goals',
        targetCount: 6,
        angles: ['definition', 'comparison'],
        keyFacts: ['montreal_protocol_signed'],
      },
    ],
  },

  {
    id: 'core-regs',
    label: 'Section 608 Regulations',
    category: 'Core',
    subtopics: [
      {
        id: 'core-regs-3.1',
        label: 'High-pressure vs low-pressure definition',
        targetCount: 6,
        angles: ['definition', 'identification', 'comparison'],
      },
      {
        id: 'core-regs-3.2',
        label: 'Equipment scope — what 608 covers (excludes MVAC)',
        targetCount: 6,
        angles: ['compliance', 'exception', 'identification'],
        keyFacts: ['section608_excludes_mvac', 'section608_hfc_added'],
      },
      {
        id: 'core-regs-3.3',
        label: 'System-dependent vs self-contained recovery equipment',
        targetCount: 8,
        angles: ['definition', 'application', 'compliance'],
        keyFacts: ['evacuation_system_dependent_max_lbs'],
      },
      {
        id: 'core-regs-3.4',
        label: 'Third-party certification for recovery equipment',
        targetCount: 5,
        angles: ['compliance', 'definition'],
      },
      {
        id: 'core-regs-3.5',
        label: 'Reclaimed refrigerant standard AHRI 700',
        targetCount: 6,
        angles: ['definition', 'compliance', 'comparison'],
        keyFacts: ['reclaim_standard'],
      },
    ],
  },

  {
    id: 'core-substitutes',
    label: 'Substitute Refrigerants & Oils',
    category: 'Core',
    subtopics: [
      {
        id: 'core-sub-4.1',
        label: 'No drop-in replacement rule',
        targetCount: 5,
        angles: ['compliance', 'definition', 'application'],
      },
      {
        id: 'core-sub-4.2',
        label: 'Lubricant incompatibility: POE vs mineral oil',
        targetCount: 6,
        angles: ['application', 'comparison', 'procedure'],
      },
      {
        id: 'core-sub-4.3',
        label: 'Fractionation in blended refrigerants',
        targetCount: 5,
        angles: ['definition', 'application'],
      },
    ],
  },

  {
    id: 'core-refrigeration',
    label: 'Refrigeration Fundamentals',
    category: 'Core',
    subtopics: [
      {
        id: 'core-ref-5.1',
        label: 'Refrigerant states in the cycle',
        targetCount: 6,
        angles: ['definition', 'identification', 'application'],
      },
      {
        id: 'core-ref-5.2',
        label: 'Gauge color codes and usage',
        targetCount: 5,
        angles: ['identification', 'application', 'procedure'],
      },
      {
        id: 'core-ref-5.3',
        label: 'Leak detection methods',
        targetCount: 8,
        angles: ['identification', 'procedure', 'comparison', 'application'],
      },
    ],
  },

  {
    id: 'core-3rs',
    label: 'Three Rs: Recover / Recycle / Reclaim',
    category: 'Core',
    subtopics: [
      {
        id: 'core-3rs-6.1',
        label: 'Recover: definition and requirements',
        targetCount: 6,
        angles: ['definition', 'compliance', 'procedure'],
      },
      {
        id: 'core-3rs-6.2',
        label: 'Recycle: definition and limits',
        targetCount: 6,
        angles: ['definition', 'compliance', 'comparison'],
      },
      {
        id: 'core-3rs-6.3',
        label: 'Reclaim: AHRI 700, certified facility, can resell',
        targetCount: 6,
        angles: ['definition', 'compliance', 'comparison'],
        keyFacts: ['reclaim_standard'],
      },
    ],
  },

  {
    id: 'core-recovery',
    label: 'Recovery Techniques',
    category: 'Core',
    subtopics: [
      {
        id: 'core-rec-7.1',
        label: 'Do not mix refrigerants',
        targetCount: 5,
        angles: ['compliance', 'application'],
      },
      {
        id: 'core-rec-7.2',
        label: 'Factors affecting recovery speed',
        targetCount: 6,
        angles: ['application', 'comparison', 'procedure'],
      },
    ],
  },

  {
    id: 'core-evacuation',
    label: 'Dehydration & Evacuation',
    category: 'Core',
    subtopics: [
      {
        id: 'core-evac-8.1',
        label: 'Why evacuation is required',
        targetCount: 5,
        angles: ['definition', 'application'],
      },
      {
        id: 'core-evac-8.2',
        label: 'Moisture causes acid — compressor damage',
        targetCount: 5,
        angles: ['application', 'procedure'],
      },
    ],
  },

  {
    id: 'core-safety',
    label: 'Safety',
    category: 'Core',
    subtopics: [
      {
        id: 'core-safe-9.1',
        label: 'PPE requirements for refrigerant handling',
        targetCount: 6,
        angles: ['compliance', 'application', 'identification'],
      },
      {
        id: 'core-safe-9.2',
        label: 'Recovery cylinder specs: color, fill limit, hydrostatic test',
        targetCount: 8,
        angles: ['identification', 'compliance', 'calculation'],
        keyFacts: [
          'recovery_cylinder_max_fill_pct',
          'recovery_cylinder_color_top',
          'recovery_cylinder_color_body',
          'recovery_cylinder_hydrostatic_test_years',
        ],
      },
      {
        id: 'core-safe-9.3',
        label: 'Nitrogen leak test — pressure regulator required',
        targetCount: 5,
        angles: ['compliance', 'procedure', 'application'],
      },
      {
        id: 'core-safe-9.4',
        label: 'Disposable vs reusable cylinders',
        targetCount: 5,
        angles: ['compliance', 'identification'],
      },
      {
        id: 'core-safe-9.5',
        label: 'Refrigerant exposure risks and first aid',
        targetCount: 6,
        angles: ['application', 'procedure', 'identification'],
      },
    ],
  },

  {
    id: 'core-shipping',
    label: 'Shipping & Recordkeeping',
    category: 'Core',
    subtopics: [
      {
        id: 'core-ship-10.1',
        label: 'Cylinder labeling requirements',
        targetCount: 5,
        angles: ['compliance', 'identification'],
      },
      {
        id: 'core-ship-10.2',
        label: 'DOT classification',
        targetCount: 4,
        angles: ['identification', 'compliance'],
      },
      {
        id: 'core-ship-10.3',
        label: 'Recordkeeping triggers',
        targetCount: 6,
        angles: ['compliance', 'application'],
        keyFacts: ['leak_threshold_old_lbs', 'leak_threshold_new_lbs'],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TYPE I — SMALL APPLIANCES (≤ 5 lbs)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'type1-recovery',
    label: 'Type I Recovery Requirements',
    category: 'Type I',
    subtopics: [
      {
        id: 't1-rec-1.1',
        label: 'Small appliance definition: ≤ 5 lbs',
        targetCount: 6,
        angles: ['definition', 'identification', 'application'],
        keyFacts: ['type1_max_charge_lbs'],
      },
      {
        id: 't1-rec-1.2',
        label: 'Post-1993 + functional compressor: 90%',
        targetCount: 8,
        angles: ['calculation', 'compliance', 'scenario_2026'],
        keyFacts: ['type1_post1993_compressor_ok_recovery_pct', 'equipment_cutoff_date'],
      },
      {
        id: 't1-rec-1.3',
        label: 'Post-1993 + non-functional compressor: 80%',
        targetCount: 8,
        angles: ['calculation', 'compliance', 'application'],
        keyFacts: ['type1_post1993_compressor_failed_recovery_pct'],
      },
      {
        id: 't1-rec-1.4',
        label: 'Pre-1993 all conditions: 80%',
        targetCount: 6,
        angles: ['calculation', 'compliance'],
        keyFacts: ['type1_pre1993_recovery_pct'],
      },
      {
        id: 't1-rec-1.5',
        label: 'Alternative standard: 4 in Hg vacuum',
        targetCount: 6,
        angles: ['procedure', 'application', 'compliance'],
        keyFacts: ['type1_alternative_vacuum_inhg'],
      },
    ],
  },

  {
    id: 'type1-techniques',
    label: 'Type I Recovery Techniques',
    category: 'Type I',
    subtopics: [
      {
        id: 't1-tech-2.1',
        label: 'Pressure-temperature identification',
        targetCount: 6,
        angles: ['application', 'procedure'],
      },
      {
        id: 't1-tech-2.2',
        label: 'Passive recovery for inoperative compressors',
        targetCount: 6,
        angles: ['procedure', 'compliance', 'application'],
      },
      {
        id: 't1-tech-2.3',
        label: 'Access valve installation on sealed systems',
        targetCount: 5,
        angles: ['procedure', 'application'],
      },
      {
        id: 't1-tech-2.4',
        label: 'HFC-134a as CFC-12 substitute',
        targetCount: 5,
        angles: ['identification', 'comparison'],
      },
    ],
  },

  {
    id: 'type1-safety',
    label: 'Type I Safety',
    category: 'Type I',
    subtopics: [
      {
        id: 't1-safe-3.1',
        label: 'Decomposition products when refrigerant contacts flame',
        targetCount: 6,
        angles: ['application', 'identification', 'compliance'],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TYPE II — HIGH/VERY HIGH PRESSURE
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'type2-leak',
    label: 'Type II Leak Detection',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-leak-1.1',
        label: 'Preferred leak test gas: nitrogen',
        targetCount: 6,
        angles: ['identification', 'compliance', 'comparison'],
      },
      {
        id: 't2-leak-1.2',
        label: 'Nitrogen + trace HCFC-22 (acceptable)',
        targetCount: 5,
        angles: ['compliance', 'application'],
      },
      {
        id: 't2-leak-1.3',
        label: 'Pure refrigerant CANNOT be used for leak test',
        targetCount: 6,
        angles: ['compliance', 'exception', 'application'],
      },
      {
        id: 't2-leak-1.4',
        label: 'Signs of refrigerant leakage',
        targetCount: 6,
        angles: ['identification', 'application'],
      },
    ],
  },

  {
    id: 'type2-repair',
    label: 'Type II Leak Repair Requirements',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-repair-2.1',
        label: 'Comfort cooling: 10%/year threshold',
        targetCount: 8,
        angles: ['calculation', 'compliance', 'scenario_2026'],
        keyFacts: ['leak_rate_comfort_cooling_pct', 'leak_threshold_old_lbs', 'leak_threshold_new_lbs'],
      },
      {
        id: 't2-repair-2.2',
        label: 'Commercial refrigeration: 20%/year',
        targetCount: 6,
        angles: ['calculation', 'compliance'],
        keyFacts: ['leak_rate_commercial_refrigeration_pct'],
      },
      {
        id: 't2-repair-2.3',
        label: 'Industrial process: 30%/year',
        targetCount: 6,
        angles: ['calculation', 'compliance'],
        keyFacts: ['leak_rate_industrial_process_pct'],
      },
      {
        id: 't2-repair-2.4',
        label: 'Repair deadlines: 30 days (industrial: 120 days)',
        targetCount: 8,
        angles: ['calculation', 'compliance', 'application'],
        keyFacts: ['leak_repair_deadline_days', 'leak_repair_industrial_extension_days'],
      },
      {
        id: 't2-repair-2.5',
        label: 'Extended retrofit plan: 1 year',
        targetCount: 5,
        angles: ['compliance', 'procedure'],
        keyFacts: ['leak_retrofit_plan_completion_months'],
      },
      {
        id: 't2-repair-2.6',
        label: 'Verification tests after repair',
        targetCount: 5,
        angles: ['procedure', 'compliance'],
      },
    ],
  },

  {
    id: 'type2-recovery',
    label: 'Type II Recovery Requirements',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-rec-3.1',
        label: 'Evacuation table: size × date matrix',
        targetCount: 10,
        angles: ['calculation', 'compliance', 'application'],
        keyFacts: [
          'evacuation_high_pressure_large_post1993_inhg',
          'evacuation_medium_pressure_small_post1993_inhg',
          'evacuation_medium_pressure_large_post1993_inhg',
          'equipment_cutoff_date',
        ],
      },
      {
        id: 't2-rec-3.2',
        label: 'System-dependent equipment limit: max 15 lbs',
        targetCount: 6,
        angles: ['compliance', 'application', 'definition'],
        keyFacts: ['evacuation_system_dependent_max_lbs'],
      },
      {
        id: 't2-rec-3.3',
        label: 'Major repair definition',
        targetCount: 5,
        angles: ['definition', 'application'],
      },
      {
        id: 't2-rec-3.4',
        label: 'Pressure rise check after vacuum',
        targetCount: 5,
        angles: ['procedure', 'application'],
      },
    ],
  },

  {
    id: 'type2-techniques',
    label: 'Type II Recovery Techniques',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-tech-4.1',
        label: 'Liquid recovery first, then vapor',
        targetCount: 6,
        angles: ['procedure', 'application'],
      },
      {
        id: 't2-tech-4.2',
        label: 'Cross-contamination prevention',
        targetCount: 5,
        angles: ['compliance', 'procedure'],
      },
    ],
  },

  {
    id: 'type2-refrigeration',
    label: 'Type II Refrigeration Science',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-ref-5.1',
        label: 'P-T chart usage and psig to psia conversion',
        targetCount: 8,
        angles: ['calculation', 'application', 'procedure'],
      },
      {
        id: 't2-ref-5.2',
        label: 'High-pressure component identification',
        targetCount: 6,
        angles: ['identification', 'application'],
      },
      {
        id: 't2-ref-5.3',
        label: 'Hydrocarbon retrofit prohibition',
        targetCount: 5,
        angles: ['compliance', 'exception'],
      },
      {
        id: 't2-ref-5.4',
        label: 'ASHRAE Standard 15: oxygen deprivation sensor',
        targetCount: 5,
        angles: ['compliance', 'application', 'identification'],
      },
    ],
  },

  {
    id: 'type2-a2l',
    label: 'Type II — A2L Refrigerants (2025–2026)',
    category: 'Type II',
    subtopics: [
      {
        id: 't2-a2l-6.1',
        label: 'R-454B and R-32 as A2L classification',
        targetCount: 8,
        angles: ['identification', 'comparison', 'definition', 'scenario_2026'],
        keyFacts: ['r454b_gwp', 'r32_gwp', 'r454b_safety_class', 'r32_safety_class'],
      },
      {
        id: 't2-a2l-6.2',
        label: 'A2L handling differences vs R-410A',
        targetCount: 8,
        angles: ['comparison', 'compliance', 'application', 'procedure'],
      },
      {
        id: 't2-a2l-6.3',
        label: 'R-410A production ban Jan 1, 2025',
        targetCount: 6,
        angles: ['compliance', 'definition', 'scenario_2026'],
        keyFacts: ['r410a_production_ban', 'r410a_gwp'],
      },
      {
        id: 't2-a2l-6.4',
        label: 'GWP >700 equipment ban Jan 1, 2026',
        targetCount: 6,
        angles: ['compliance', 'scenario_2026', 'application'],
        keyFacts: ['gwp700_equipment_ban'],
      },
      {
        id: 't2-a2l-6.5',
        label: 'Spark-free equipment requirement for A2L',
        targetCount: 6,
        angles: ['compliance', 'application', 'procedure'],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TYPE III — LOW PRESSURE (CHILLERS)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'type3-leak',
    label: 'Type III Leak Detection',
    category: 'Type III',
    subtopics: [
      {
        id: 't3-leak-1.1',
        label: 'Sub-atmospheric pressure operation',
        targetCount: 6,
        angles: ['definition', 'application', 'comparison'],
      },
      {
        id: 't3-leak-1.2',
        label: 'Hot water pressurization (preferred method)',
        targetCount: 6,
        angles: ['procedure', 'compliance', 'identification'],
      },
      {
        id: 't3-leak-1.3',
        label: 'Maximum test pressure for centrifugal chillers',
        targetCount: 5,
        angles: ['compliance', 'calculation'],
      },
      {
        id: 't3-leak-1.4',
        label: 'Signs of air/moisture ingress (unique to Type III)',
        targetCount: 6,
        angles: ['identification', 'application'],
      },
    ],
  },

  {
    id: 'type3-repair',
    label: 'Type III Leak Repair',
    category: 'Type III',
    subtopics: [
      {
        id: 't3-repair-2.1',
        label: 'Same thresholds as Type II (10/20/30%)',
        targetCount: 6,
        angles: ['compliance', 'calculation', 'comparison'],
        keyFacts: ['leak_repair_deadline_days', 'leak_repair_industrial_extension_days'],
      },
    ],
  },

  {
    id: 'type3-recovery',
    label: 'Type III Recovery Requirements',
    category: 'Type III',
    subtopics: [
      {
        id: 't3-rec-3.1',
        label: 'Post-1993: 25 mm Hg absolute (not gauge)',
        targetCount: 8,
        angles: ['calculation', 'compliance', 'comparison'],
        keyFacts: ['evacuation_type3_post1993_mmhg_absolute'],
      },
      {
        id: 't3-rec-3.2',
        label: 'Pre-1993: 0 psig (atmospheric)',
        targetCount: 5,
        angles: ['calculation', 'compliance'],
      },
      {
        id: 't3-rec-3.3',
        label: 'Oil heating minimum: 130°F',
        targetCount: 5,
        angles: ['procedure', 'compliance'],
        keyFacts: ['type3_oil_heating_min_f'],
      },
      {
        id: 't3-rec-3.4',
        label: 'Water circulation during evacuation — prevent freezing',
        targetCount: 5,
        angles: ['procedure', 'application'],
      },
    ],
  },

  {
    id: 'type3-recharging',
    label: 'Type III Recharging Techniques',
    category: 'Type III',
    subtopics: [
      {
        id: 't3-rech-4.1',
        label: 'Vapor first, liquid last — prevent freeze in copper tubes',
        targetCount: 6,
        angles: ['procedure', 'application', 'comparison'],
      },
      {
        id: 't3-rech-4.2',
        label: 'Charge through evaporator valve (centrifugal)',
        targetCount: 5,
        angles: ['procedure', 'application'],
      },
    ],
  },

  {
    id: 'type3-refrigerants',
    label: 'Type III Refrigerants',
    category: 'Type III',
    subtopics: [
      {
        id: 't3-ref-5.1',
        label: 'R-11 and R-123 properties',
        targetCount: 8,
        angles: ['identification', 'comparison', 'definition'],
        keyFacts: ['r123_odp', 'r123_safety_class', 'r11_boiling_point_f'],
      },
      {
        id: 't3-ref-5.2',
        label: 'Why R-11 is low-pressure: boiling point 74.7°F',
        targetCount: 5,
        angles: ['definition', 'application'],
        keyFacts: ['r11_boiling_point_f'],
      },
    ],
  },
]

/**
 * Returns total target question count across all topics
 */
export function getTotalTargetCount(): number {
  return TOPIC_MAP.reduce((sum, topic) =>
    sum + topic.subtopics.reduce((s, st) => s + st.targetCount, 0), 0)
}

/**
 * Returns all subtopics for a given category
 */
export function getSubtopicsByCategory(category: Topic['category']): Subtopic[] {
  return TOPIC_MAP
    .filter(t => t.category === category)
    .flatMap(t => t.subtopics)
}

/**
 * Returns the subtopic object by ID
 */
export function getSubtopic(subtopicId: string): Subtopic | undefined {
  for (const topic of TOPIC_MAP) {
    const found = topic.subtopics.find(s => s.id === subtopicId)
    if (found) return found
  }
  return undefined
}
