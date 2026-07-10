// Badge display metadata shared by the Progress achievements section and the
// unlock toasts. Titles match the art registry in BadgeIcons.tsx; captions are
// one-line plain-English restatements of the REAL unlock criteria in
// src/lib/achievements-server.ts — keep both in sync if criteria change.

import type { BadgeId } from './BadgeIcons'

export const BADGE_TITLES: Record<BadgeId, string> = {
  'core-ready': 'Core Ready',
  'type1-ready': 'Type I Ready',
  'type2-ready': 'Type II Ready',
  'type3-ready': 'Type III Ready',
  'universal-ready': 'Universal Ready',
  'boss-down': 'Boss Down',
  'perfect-10': 'Perfect 10',
  'streak-3': '3-Day Streak',
  'streak-7': '7-Day Streak',
  'streak-14': '14-Day Streak',
  'full-bank': 'Full Bank',
  'beat-the-clock': 'Beat the Clock',
  fixer: 'Fixer',
}

// Criteria source of truth: computeAchievements() in achievements-server.ts.
export const BADGE_CAPTIONS: Record<BadgeId, string> = {
  'core-ready': 'Reach “Ready” status in the Core section.',
  'type1-ready': 'Reach “Ready” status in the Type I section.',
  'type2-ready': 'Reach “Ready” status in the Type II section.',
  'type3-ready': 'Reach “Ready” status in the Type III section.',
  'universal-ready': 'Reach “Ready” status in all four sections.',
  'boss-down': 'Pass a timed 25-question section exam with a score of 72% or higher.',
  'perfect-10': 'Score a perfect 10/10 on any Study Path level.',
  'streak-3': 'Practice 3 days in a row.',
  'streak-7': 'Practice 7 days in a row.',
  'streak-14': 'Practice 14 days in a row.',
  'full-bank': 'Answer all 569 questions in the question bank at least once.',
  'beat-the-clock': 'Average 72 seconds or less per question across 25+ timed answers.',
  fixer: 'Turn 10 questions you once missed into correct answers on your latest try.',
}
