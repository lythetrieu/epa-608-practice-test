/**
 * GROUND TRUTH TABLE — EPA 608 Verified Facts
 *
 * Nguồn: 40 CFR Part 82 Subpart F + EPA.gov + QUESTION-BANK-MASTER.md
 * Mọi câu hỏi được generated PHẢI pass qua bảng này.
 * Khi regulation thay đổi → chỉ cần update file này → pipeline tự regenerate.
 */

export type Fact = {
  key: string
  value: string | number | boolean
  source: string       // CFR citation
  effectiveDate: string
  note?: string
}

export const FACTS: Record<string, Fact> = {

  // ─── PENALTIES ────────────────────────────────────────────────────
  civil_penalty_per_day: {
    key: 'civil_penalty_per_day',
    value: 69733,
    source: '40 CFR §82.34 (inflation-adjusted 2025)',
    effectiveDate: '2025-01-01',
    note: 'Old value $44,539 is WRONG — outdated. Never use in questions.',
  },
  civil_penalty_subsequent: {
    key: 'civil_penalty_subsequent',
    value: 57617,
    source: '40 CFR §82.34',
    effectiveDate: '2025-01-01',
  },

  // ─── RECOVERY CYLINDER ─────────────────────────────────────────────
  recovery_cylinder_max_fill_pct: {
    key: 'recovery_cylinder_max_fill_pct',
    value: 80,
    source: '40 CFR §82.156(f)',
    effectiveDate: '1993-11-15',
  },
  recovery_cylinder_color_top: {
    key: 'recovery_cylinder_color_top',
    value: 'yellow',
    source: 'DOT/ARI Standard',
    effectiveDate: '1993-11-15',
  },
  recovery_cylinder_color_body: {
    key: 'recovery_cylinder_color_body',
    value: 'gray',
    source: 'DOT/ARI Standard',
    effectiveDate: '1993-11-15',
  },
  recovery_cylinder_hydrostatic_test_years: {
    key: 'recovery_cylinder_hydrostatic_test_years',
    value: 5,
    source: 'DOT HMR 49 CFR §180.209',
    effectiveDate: '1993-11-15',
  },

  // ─── TYPE I — SMALL APPLIANCE (≤ 5 lbs) ──────────────────────────
  type1_max_charge_lbs: {
    key: 'type1_max_charge_lbs',
    value: 5,
    source: '40 CFR §82.152',
    effectiveDate: '1993-11-15',
  },
  type1_post1993_compressor_ok_recovery_pct: {
    key: 'type1_post1993_compressor_ok_recovery_pct',
    value: 90,
    source: '40 CFR §82.156(a)(1)',
    effectiveDate: '1993-11-15',
    note: 'Post Nov 15, 1993 + working compressor',
  },
  type1_post1993_compressor_failed_recovery_pct: {
    key: 'type1_post1993_compressor_failed_recovery_pct',
    value: 80,
    source: '40 CFR §82.156(a)(1)',
    effectiveDate: '1993-11-15',
    note: 'Post Nov 15, 1993 + non-functioning compressor',
  },
  type1_pre1993_recovery_pct: {
    key: 'type1_pre1993_recovery_pct',
    value: 80,
    source: '40 CFR §82.156(a)(2)',
    effectiveDate: '1993-11-15',
    note: 'Pre Nov 15, 1993, all conditions',
  },
  type1_alternative_vacuum_inhg: {
    key: 'type1_alternative_vacuum_inhg',
    value: 4,
    source: '40 CFR §82.156(a)(1)(ii)',
    effectiveDate: '1993-11-15',
    note: 'Alternative: recover to 4 in Hg vacuum instead of % by weight',
  },

  // ─── EVACUATION LEVELS (High-pressure) ────────────────────────────
  evacuation_high_pressure_large_post1993_inhg: {
    key: 'evacuation_high_pressure_large_post1993_inhg',
    value: 10,
    source: '40 CFR §82.156(b) Table 1',
    effectiveDate: '1993-11-15',
    note: 'High-pressure ≥200 lbs, post Nov 15, 1993',
  },
  evacuation_medium_pressure_small_post1993_inhg: {
    key: 'evacuation_medium_pressure_small_post1993_inhg',
    value: 10,
    source: '40 CFR §82.156(b) Table 1',
    effectiveDate: '1993-11-15',
    note: 'Medium-pressure <200 lbs, post Nov 15, 1993',
  },
  evacuation_medium_pressure_large_post1993_inhg: {
    key: 'evacuation_medium_pressure_large_post1993_inhg',
    value: 15,
    source: '40 CFR §82.156(b) Table 1',
    effectiveDate: '1993-11-15',
    note: 'Medium-pressure ≥200 lbs, post Nov 15, 1993',
  },
  evacuation_type3_post1993_mmhg_absolute: {
    key: 'evacuation_type3_post1993_mmhg_absolute',
    value: 25,
    source: '40 CFR §82.156(b) Table 1',
    effectiveDate: '1993-11-15',
    note: 'Low-pressure (Type III), ABSOLUTE pressure — not gauge',
  },
  evacuation_system_dependent_max_lbs: {
    key: 'evacuation_system_dependent_max_lbs',
    value: 15,
    source: '40 CFR §82.158(b)',
    effectiveDate: '1993-11-15',
    note: 'System-dependent equipment cannot be used on systems >15 lbs',
  },

  // ─── LEAK RATE THRESHOLDS ──────────────────────────────────────────
  leak_threshold_old_lbs: {
    key: 'leak_threshold_old_lbs',
    value: 50,
    source: '40 CFR §82.157 (pre-2026)',
    effectiveDate: '1993-11-15',
    note: 'Applies until Dec 31, 2025',
  },
  leak_threshold_new_lbs: {
    key: 'leak_threshold_new_lbs',
    value: 15,
    source: '40 CFR §82.157 (AIM Act HFC Leak Repair Rule)',
    effectiveDate: '2026-01-01',
    note: 'CRITICAL 2026 UPDATE — threshold drops from 50 to 15 lbs',
  },
  leak_rate_comfort_cooling_pct: {
    key: 'leak_rate_comfort_cooling_pct',
    value: 10,
    source: '40 CFR §82.157(a)',
    effectiveDate: '1993-11-15',
    note: 'Annual leak rate — comfort cooling (A/C)',
  },
  leak_rate_commercial_refrigeration_pct: {
    key: 'leak_rate_commercial_refrigeration_pct',
    value: 20,
    source: '40 CFR §82.157(a)',
    effectiveDate: '1993-11-15',
  },
  leak_rate_industrial_process_pct: {
    key: 'leak_rate_industrial_process_pct',
    value: 30,
    source: '40 CFR §82.157(a)',
    effectiveDate: '1993-11-15',
  },
  leak_repair_deadline_days: {
    key: 'leak_repair_deadline_days',
    value: 30,
    source: '40 CFR §82.157(b)',
    effectiveDate: '1993-11-15',
  },
  leak_repair_industrial_extension_days: {
    key: 'leak_repair_industrial_extension_days',
    value: 120,
    source: '40 CFR §82.157(b)(2)',
    effectiveDate: '1993-11-15',
  },
  leak_retrofit_plan_completion_months: {
    key: 'leak_retrofit_plan_completion_months',
    value: 12,
    source: '40 CFR §82.157(c)',
    effectiveDate: '1993-11-15',
  },

  // ─── DE MINIMIS ────────────────────────────────────────────────────
  de_minimis_max_oz: {
    key: 'de_minimis_max_oz',
    value: 0.1,
    source: '40 CFR §82.154(a)',
    effectiveDate: '1993-11-15',
    note: '0.1 oz = 1/100 lb — good faith attempt only',
  },

  // ─── RECLAIM STANDARD ──────────────────────────────────────────────
  reclaim_standard: {
    key: 'reclaim_standard',
    value: 'AHRI 700-2016',
    source: '40 CFR §82.152',
    effectiveDate: '2016-01-01',
    note: 'Only reclaimed refrigerant meeting AHRI 700-2016 can be resold',
  },

  // ─── VENTING PROHIBITION DATES ─────────────────────────────────────
  venting_prohibition_cfc_hcfc_date: {
    key: 'venting_prohibition_cfc_hcfc_date',
    value: 'July 1, 1992',
    source: '40 CFR §82.154(a)',
    effectiveDate: '1992-07-01',
  },
  venting_prohibition_hfc_date: {
    key: 'venting_prohibition_hfc_date',
    value: 'November 15, 1995',
    source: '40 CFR §82.154(a)(2)',
    effectiveDate: '1995-11-15',
  },
  equipment_cutoff_date: {
    key: 'equipment_cutoff_date',
    value: 'November 15, 1993',
    source: '40 CFR §82.156',
    effectiveDate: '1993-11-15',
    note: 'Key date that determines recovery requirements tier',
  },

  // ─── PHASEOUT DATES ────────────────────────────────────────────────
  cfc_production_ended: {
    key: 'cfc_production_ended',
    value: '1996',
    source: 'Clean Air Act § 605; Montreal Protocol',
    effectiveDate: '1996-01-01',
  },
  r22_new_equipment_ended: {
    key: 'r22_new_equipment_ended',
    value: 'January 1, 2010',
    source: '40 CFR §82.64',
    effectiveDate: '2010-01-01',
  },
  r22_production_import_ended: {
    key: 'r22_production_import_ended',
    value: 'January 1, 2020',
    source: '40 CFR §82.64',
    effectiveDate: '2020-01-01',
  },
  r410a_production_ban: {
    key: 'r410a_production_ban',
    value: 'January 1, 2025',
    source: 'AIM Act; 40 CFR §84.54',
    effectiveDate: '2025-01-01',
  },
  gwp700_equipment_ban: {
    key: 'gwp700_equipment_ban',
    value: 'January 1, 2026',
    source: 'AIM Act HFC phasedown rule; 40 CFR §84',
    effectiveDate: '2026-01-01',
    note: 'Cannot install NEW equipment using refrigerants with GWP >700 after this date',
  },

  // ─── REFRIGERANT PROPERTIES ────────────────────────────────────────
  r11_odp: {
    key: 'r11_odp',
    value: 1.0,
    source: 'Montreal Protocol Annex A Group I; 40 CFR Part 82 Appendix A to Subpart A',
    effectiveDate: '1987-01-01',
    note: 'R-11 (CFC-11) is the REFERENCE compound for the ODP scale — ODP defined as 1.0 relative to R-11. Questions about "which refrigerant is the ODP reference" should answer R-11, not R-12.',
  },
  r12_odp: {
    key: 'r12_odp',
    value: 1.0,
    source: 'Montreal Protocol Annex A Group I; 40 CFR Part 82 Appendix A to Subpart A',
    effectiveDate: '1987-01-01',
    note: 'R-12 ODP = 1.0 (same numeric value as R-11) but R-11 is the actual reference compound. Do NOT say R-12 is the ODP reference.',
  },
  r22_odp: {
    key: 'r22_odp',
    value: 0.05,
    source: 'EPA Ozone Depletion Science',
    effectiveDate: '1987-01-01',
  },
  r123_odp: {
    key: 'r123_odp',
    value: 0.02,
    source: 'EPA Ozone Depletion Science',
    effectiveDate: '1987-01-01',
  },
  r410a_gwp: {
    key: 'r410a_gwp',
    value: 2088,
    source: 'IPCC AR6',
    effectiveDate: '2021-01-01',
  },
  r454b_gwp: {
    key: 'r454b_gwp',
    value: 466,
    source: 'ASHRAE 34-2022',
    effectiveDate: '2022-01-01',
  },
  r32_gwp: {
    key: 'r32_gwp',
    value: 675,
    source: 'IPCC AR6',
    effectiveDate: '2021-01-01',
  },
  r11_boiling_point_f: {
    key: 'r11_boiling_point_f',
    value: 74.7,
    source: 'ASHRAE Refrigeration Handbook',
    effectiveDate: '1993-01-01',
    note: 'R-11 boils at 74.7°F — key for Type III systems',
  },

  // ─── SAFETY CLASSIFICATIONS ────────────────────────────────────────
  r410a_safety_class: {
    key: 'r410a_safety_class',
    value: 'A1',
    source: 'ASHRAE Standard 34',
    effectiveDate: '1993-01-01',
    note: 'A=lower toxicity, 1=non-flammable',
  },
  r454b_safety_class: {
    key: 'r454b_safety_class',
    value: 'A2L',
    source: 'ASHRAE Standard 34',
    effectiveDate: '2020-01-01',
    note: 'A=lower toxicity, 2L=mildly flammable',
  },
  r32_safety_class: {
    key: 'r32_safety_class',
    value: 'A2L',
    source: 'ASHRAE Standard 34',
    effectiveDate: '2020-01-01',
  },
  r123_safety_class: {
    key: 'r123_safety_class',
    value: 'B1',
    source: 'ASHRAE Standard 34',
    effectiveDate: '1993-01-01',
    note: 'B=higher toxicity, 1=non-flammable',
  },

  // ─── TYPE III SPECIFIC ─────────────────────────────────────────────
  type3_oil_heating_min_f: {
    key: 'type3_oil_heating_min_f',
    value: 130,
    source: '40 CFR §82.156 + industry practice',
    effectiveDate: '1993-11-15',
    note: 'Minimum oil temperature before evacuation on Type III systems',
  },

  // ─── AIM ACT PHASEDOWN ─────────────────────────────────────────────
  aim_act_phasedown_2024_2028_pct: {
    key: 'aim_act_phasedown_2024_2028_pct',
    value: 60,
    source: 'AIM Act; 40 CFR §84.54 Table 1',
    effectiveDate: '2024-01-01',
    note: '60% of HFC baseline allowance 2024-2028',
  },
  aim_act_phasedown_final_pct: {
    key: 'aim_act_phasedown_final_pct',
    value: 15,
    source: 'AIM Act; 40 CFR §84.54 Table 1',
    effectiveDate: '2036-01-01',
    note: 'Final target: 85% reduction from baseline',
  },

  // ─── SECTION 608 SCOPE ─────────────────────────────────────────────
  section608_excludes_mvac: {
    key: 'section608_excludes_mvac',
    value: true,
    source: '40 CFR §82.152',
    effectiveDate: '1993-11-15',
    note: 'Motor Vehicle A/C covered by Section 609, NOT 608',
  },
  section608_hfc_added: {
    key: 'section608_hfc_added',
    value: 'January 1, 2018',
    source: '40 CFR §82.154 (2016 rule)',
    effectiveDate: '2018-01-01',
    note: 'HFCs added to Section 608 venting prohibition via 2016 rule, effective 2018',
  },

  // ─── MONTREAL PROTOCOL ────────────────────────────────────────────
  montreal_protocol_signed: {
    key: 'montreal_protocol_signed',
    value: '1987',
    source: 'Montreal Protocol on Substances that Deplete the Ozone Layer',
    effectiveDate: '1987-09-16',
  },
}

/**
 * Cross-check a generated question's text against known facts.
 * Returns array of violations if any numbers/values conflict with FACTS.
 */
export function checkFactViolations(questionText: string, explanationText: string): string[] {
  const violations: string[] = []
  const combined = `${questionText} ${explanationText}`.toLowerCase()

  // Check for known WRONG values that appear in outdated resources
  const knownWrongValues = [
    { wrong: '44,539', correct: '$69,733', context: 'civil penalty' },
    { wrong: '44539', correct: '$69,733', context: 'civil penalty' },
    { wrong: '50 lbs', correct: '15 lbs (post-Jan 2026)', context: 'leak threshold when discussing 2026' },
    { wrong: 'november 15, 1993 hfc', correct: 'November 15, 1995', context: 'HFC venting prohibition' },
  ]

  for (const { wrong, correct, context } of knownWrongValues) {
    const idx = combined.indexOf(wrong.toLowerCase())
    if (idx === -1) continue

    // Skip if the wrong value is preceded/followed by "outdat", "old", "incorrect", "was", "formerly"
    // — these indicate the question is correctly explaining the value is wrong
    const surroundingText = combined.slice(Math.max(0, idx - 30), idx + wrong.length + 30)
    if (surroundingText.match(/outdat|incorrect|old rule|was \$|formerly|replaced|prior to|changed/i)) continue

    violations.push(`Contains potentially wrong value "${wrong}" — correct value: ${correct} (${context})`)
  }

  return violations
}
