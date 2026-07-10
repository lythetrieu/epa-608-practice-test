// Badge + rank insignia SVG set for EPA 608 gamification.
// Pure presentational (no 'use client' needed) — zero dependencies, inline SVG only.
// Design language: navy medallion field, thin gold rim, single bold centered glyph.
// Preview for review: _docs/badges-preview.html (generated from these same components).

import * as React from 'react';

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const NAVY = '#003087';
const INK = '#001d57';
const GOLD = '#f5b840';
const WHITE = '#ffffff';
const BRONZE = '#b87b45';
const SILVER = '#b6c0cb';

const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

type Palette = {
  rim: string;
  field: string;
  glyph: string;
  accent: string;
};

const LOCKED_PALETTE: Palette = {
  rim: '#cbd5e1', // slate-300
  field: '#e2e8f0', // slate-200
  glyph: '#94a3b8', // slate-400
  accent: '#94a3b8',
};

/* ------------------------------------------------------------------ */
/* Public constants                                                    */
/* ------------------------------------------------------------------ */

export const BADGE_IDS = [
  'core-ready',
  'type1-ready',
  'type2-ready',
  'type3-ready',
  'universal-ready',
  'boss-down',
  'perfect-10',
  'streak-3',
  'streak-7',
  'streak-14',
  'full-bank',
  'beat-the-clock',
  'fixer',
  'first-test',
  'first-level',
  'sharpshooter',
  'flawless-exam',
  'speed-runner',
  'hat-trick',
  'comeback-kid',
  'night-owl',
  'weekend-warrior',
  'century',
  'half-bank',
  'marathon-day',
  'iron-streak-30',
  'fix-master',
  'world-core',
  'world-type1',
  'world-type2',
  'world-type3',
  'path-complete',
  'universal-boss',
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

export const RANKS = [
  { id: 'apprentice', label: 'Apprentice', minXp: 0 },
  { id: 'tech-in-training', label: 'Tech in Training', minXp: 500 },
  { id: 'journeyman', label: 'Journeyman', minXp: 1500 },
  { id: 'senior-tech', label: 'Senior Tech', minXp: 3500 },
  { id: 'master-tech', label: 'Master Tech', minXp: 7000 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

/* ------------------------------------------------------------------ */
/* Shared geometry helpers                                             */
/* ------------------------------------------------------------------ */

function starPath(cx: number, cy: number, r: number): string {
  const k = Math.round(0.32 * r * 100) / 100;
  return (
    `M${cx} ${cy - r} L${cx + k} ${cy - k} L${cx + r} ${cy} L${cx + k} ${cy + k} ` +
    `L${cx} ${cy + r} L${cx - k} ${cy + k} L${cx - r} ${cy} L${cx - k} ${cy - k} Z`
  );
}

type GlyphProps = { p: Palette };

/* ------------------------------------------------------------------ */
/* Badge glyphs (one bold centered mark each, viewBox 0 0 64 64)       */
/* ------------------------------------------------------------------ */

/** Shield with check — Core readiness. */
function GlyphCoreReady({ p }: GlyphProps) {
  return (
    <g>
      <path
        d="M32 14 L45 19 V30 C45 40.5 39.5 47 32 50 C24.5 47 19 40.5 19 30 V19 Z"
        fill="none"
        stroke={p.glyph}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <polyline
        points="25.5,32 30.5,37 39,26.5"
        fill="none"
        stroke={p.accent}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Refrigerant canister (small appliance) — Type I. */
function GlyphType1({ p }: GlyphProps) {
  return (
    <g>
      <rect x={25} y={23} width={14} height={25} rx={3} fill="none" stroke={p.glyph} strokeWidth={2.8} />
      <path d="M28.5 23 V19.5 H35.5 V23" fill="none" stroke={p.glyph} strokeWidth={2.4} strokeLinejoin="round" />
      <line x1={32} y1={19.5} x2={32} y2={15.5} stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={28.5} y1={15.5} x2={35.5} y2={15.5} stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={27} y={33.5} width={10} height={4} rx={1} fill={p.accent} />
    </g>
  );
}

/** Pressure gauge, needle reading high — Type II. */
function GlyphType2({ p }: GlyphProps) {
  return (
    <g>
      <circle cx={32} cy={34} r={13.5} fill="none" stroke={p.glyph} strokeWidth={2.8} />
      <line x1={25.6} y1={27.6} x2={23.5} y2={25.5} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <line x1={32} y1={25} x2={32} y2={22} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <line x1={38.4} y1={27.6} x2={40.5} y2={25.5} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <line x1={32} y1={34} x2={40.2} y2={29.3} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
      <circle cx={32} cy={34} r={2.2} fill={p.accent} />
    </g>
  );
}

/** Horizontal chiller / large receiver tank — Type III. */
function GlyphType3({ p }: GlyphProps) {
  return (
    <g>
      <rect x={16.5} y={27} width={31} height={15} rx={7.5} fill="none" stroke={p.glyph} strokeWidth={2.8} />
      <line x1={40.5} y1={27.8} x2={40.5} y2={41.2} stroke={p.glyph} strokeWidth={2} opacity={0.8} />
      <line x1={23} y1={42} x2={23} y2={47.5} stroke={p.glyph} strokeWidth={2.8} strokeLinecap="round" />
      <line x1={41} y1={42} x2={41} y2={47.5} stroke={p.glyph} strokeWidth={2.8} strokeLinecap="round" />
      <path d="M26 27 V21.5 H35.5" fill="none" stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={38} cy={21.5} r={2.2} fill={p.accent} />
    </g>
  );
}

/** Quartered shield, gold — Universal (crown badge). */
function GlyphUniversal({ p }: GlyphProps) {
  return (
    <g>
      <path d="M32 12 L47 18 V30 H32 Z" fill={p.accent} opacity={0.5} />
      <path d="M32 30 V52.5 C23.5 48.6 17 41.5 17 30 Z" fill={p.accent} opacity={0.5} />
      <path
        d="M32 12 L47 18 V30 C47 41.5 40.5 48.6 32 52.5 C23.5 48.6 17 41.5 17 30 V18 Z"
        fill="none"
        stroke={p.accent}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <line x1={32} y1={12.5} x2={32} y2={52} stroke={p.accent} strokeWidth={2} />
      <line x1={17.5} y1={30} x2={46.5} y2={30} stroke={p.accent} strokeWidth={2} />
      <path d={starPath(23, 55.5, 1.8)} fill={p.accent} />
      <path d={starPath(32, 57.5, 2)} fill={p.accent} />
      <path d={starPath(41, 55.5, 1.8)} fill={p.accent} />
    </g>
  );
}

/** Castle with pennant flag over a gold check — boss exam beaten. */
function GlyphBossDown({ p }: GlyphProps) {
  return (
    <g>
      <path
        d="M21.5 31 V21.5 H26 V17.5 H29.75 V21.5 H34.25 V17.5 H38 V21.5 H42.5 V31 Z"
        fill="none"
        stroke={p.glyph}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <line x1={32} y1={21.5} x2={32} y2={9.5} stroke={p.glyph} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M32 9.5 L39.5 11.9 L32 14.3 Z" fill={p.accent} />
      <polyline
        points="24,42 29.5,47.5 42,35"
        fill="none"
        stroke={p.accent}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** "10/10" inside a gold laurel — perfect score. */
function GlyphPerfect10({ p }: GlyphProps) {
  const leaf = 'M0 0 Q3.2 -3.4 1.6 -8 Q-1.8 -4.4 0 0 Z';
  return (
    <g>
      <path d="M22.5 19.5 C16.5 27 16.5 38 23.5 45.5" fill="none" stroke={p.accent} strokeWidth={2} strokeLinecap="round" />
      <path d="M41.5 19.5 C47.5 27 47.5 38 40.5 45.5" fill="none" stroke={p.accent} strokeWidth={2} strokeLinecap="round" />
      <path d={leaf} fill={p.accent} transform="translate(19.4,24.9) rotate(6)" />
      <path d={leaf} fill={p.accent} transform="translate(17.6,32.5) rotate(-15)" />
      <path d={leaf} fill={p.accent} transform="translate(19.6,40.3) rotate(-41)" />
      <path d={leaf} fill={p.accent} transform="translate(44.6,24.9) rotate(-6) scale(-1,1)" />
      <path d={leaf} fill={p.accent} transform="translate(46.4,32.5) rotate(15) scale(-1,1)" />
      <path d={leaf} fill={p.accent} transform="translate(44.4,40.3) rotate(41) scale(-1,1)" />
      <text
        x={32}
        y={35.5}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={9.5}
        fill={p.glyph}
      >
        10/10
      </text>
    </g>
  );
}

/** Shared flame outline with a streak-day numeral. */
function GlyphStreak({ p, days }: GlyphProps & { days: number }) {
  return (
    <g>
      <path
        d="M32 13.5 C36.5 19.5 43 24.5 43 33 C43 40.4 38.1 46.5 32 46.5 C25.9 46.5 21 40.4 21 33 C21 28.3 23.3 25 26 22.2 C25.7 26.3 27.5 28.6 29.3 28.1 C28.3 23.2 29.6 17.8 32 13.5 Z"
        fill="none"
        stroke={p.glyph}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <text
        x={32}
        y={41}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={days >= 10 ? 10 : 11.5}
        fill={p.glyph}
      >
        {days}
      </text>
    </g>
  );
}

/** Stacked answer cards with "569" — full question bank. */
function GlyphFullBank({ p }: GlyphProps) {
  return (
    <g>
      <rect x={23.5} y={23.5} width={23} height={15} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.2} opacity={0.5} />
      <rect x={21.5} y={26.5} width={23} height={15} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.2} opacity={0.75} />
      <rect x={19.5} y={29.5} width={23} height={15.5} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.4} />
      <text
        x={31}
        y={40.5}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={9}
        letterSpacing={0.5}
        fill={p.accent}
      >
        569
      </text>
    </g>
  );
}

/** Stopwatch with gold lightning bolt — timed exam. */
function GlyphBeatTheClock({ p }: GlyphProps) {
  return (
    <g>
      <circle cx={32} cy={35} r={12.5} fill="none" stroke={p.glyph} strokeWidth={2.8} />
      <line x1={29} y1={17} x2={35} y2={17} stroke={p.glyph} strokeWidth={2.8} strokeLinecap="round" />
      <line x1={32} y1={17} x2={32} y2={22} stroke={p.glyph} strokeWidth={2.8} />
      <line x1={42} y1={23.5} x2={44.5} y2={21} stroke={p.glyph} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M33.5 26 L26.5 37 H31 L29.8 44 L37.8 32.8 H33 Z" fill={p.accent} />
    </g>
  );
}

/** Open-end wrench crossed by a gold check — repairs done right. */
function GlyphFixer({ p }: GlyphProps) {
  return (
    <g>
      <path d="M19.09 22.96 A6 6 0 1 0 23.96 18.09" fill="none" stroke={p.glyph} strokeWidth={4} strokeLinecap="round" />
      <line x1={29.3} y1={28.3} x2={41} y2={40} stroke={p.glyph} strokeWidth={4.5} strokeLinecap="round" />
      <polyline
        points="24,37 31,44 44.5,27"
        fill="none"
        stroke={p.accent}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Badge glyphs — batch 2 (milestones, worlds, boss)                   */
/* ------------------------------------------------------------------ */

/** Single exam paper with a gold check — first test completed. */
function GlyphFirstTest({ p }: GlyphProps) {
  return (
    <g>
      <path d="M23.5 15.5 H36 L41.5 21 V47 H23.5 Z" fill="none" stroke={p.glyph} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M36 15.5 V21 H41.5" fill="none" stroke={p.glyph} strokeWidth={2} strokeLinejoin="round" />
      <line x1={28} y1={26.5} x2={37} y2={26.5} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" opacity={0.65} />
      <line x1={28} y1={31} x2={34} y2={31} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" opacity={0.65} />
      <polyline
        points="27.5,38.5 31,42 37.5,34"
        fill="none"
        stroke={p.accent}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Flag on a pole with a gold "1" — first Study Path level cleared. */
function GlyphFirstLevel({ p }: GlyphProps) {
  return (
    <g>
      <line x1={24.5} y1={14.5} x2={24.5} y2={49} stroke={p.glyph} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M24.5 15.5 H41.5 V29.5 H24.5" fill="none" stroke={p.glyph} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={33.2} y={26.8} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={11} fill={p.accent}>
        1
      </text>
      <line x1={19.5} y1={49} x2={33} y2={49} stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/** Target rings with a gold arrow in the bullseye — sharpshooter. */
function GlyphSharpshooter({ p }: GlyphProps) {
  return (
    <g>
      <circle cx={29.5} cy={35.5} r={13} fill="none" stroke={p.glyph} strokeWidth={2.5} />
      <circle cx={29.5} cy={35.5} r={7.5} fill="none" stroke={p.glyph} strokeWidth={2.2} />
      <circle cx={29.5} cy={35.5} r={2.6} fill={p.accent} />
      <line x1={35} y1={30} x2={45.5} y2={19.5} stroke={p.accent} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M29.5 35.5 L35.75 33.35 L31.65 29.25 Z" fill={p.accent} />
      <line x1={45.5} y1={19.5} x2={46.3} y2={14.7} stroke={p.accent} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={45.5} y1={19.5} x2={50.3} y2={18.7} stroke={p.accent} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/** Faceted gem with a gold sparkle — flawless exam. */
function GlyphFlawlessExam({ p }: GlyphProps) {
  return (
    <g>
      <path d="M25 20.5 H39 L46 28.5 L32 47.5 L18 28.5 Z" fill="none" stroke={p.glyph} strokeWidth={2.6} strokeLinejoin="round" />
      <line x1={18} y1={28.5} x2={46} y2={28.5} stroke={p.accent} strokeWidth={1.8} />
      <path d="M25 20.5 L28.5 28.5 L32 47.5 L35.5 28.5 L39 20.5" fill="none" stroke={p.accent} strokeWidth={1.8} strokeLinejoin="round" />
      <path d={starPath(45, 16.5, 3)} fill={p.accent} />
    </g>
  );
}

/** Speedometer pinned into the gold redline — speed runner. */
function GlyphSpeedRunner({ p }: GlyphProps) {
  return (
    <g>
      <path d="M18 40 A14 14 0 1 1 46 40" fill="none" stroke={p.glyph} strokeWidth={2.8} strokeLinecap="round" />
      <line x1={22.1} y1={30.1} x2={24.2} y2={32.2} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <line x1={32} y1={26} x2={32} y2={29} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <line x1={41.9} y1={30.1} x2={39.8} y2={32.2} stroke={p.glyph} strokeWidth={2} strokeLinecap="round" />
      <path d="M44.12 33 A14 14 0 0 1 46 40" fill="none" stroke={p.accent} strokeWidth={3.2} strokeLinecap="round" />
      <line x1={32} y1={40} x2={42.6} y2={35.2} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
      <circle cx={32} cy={40} r={2.4} fill={p.accent} />
      <line x1={20} y1={47.5} x2={28} y2={47.5} stroke={p.glyph} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      <line x1={25} y1={52} x2={35} y2={52} stroke={p.glyph} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/** Three stacked checks, the closer gold — hat trick. */
function GlyphHatTrick({ p }: GlyphProps) {
  return (
    <g>
      <polyline points="23.5,19.5 29.5,25.5 40.5,14.5" fill="none" stroke={p.glyph} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="23.5,30.5 29.5,36.5 40.5,25.5" fill="none" stroke={p.glyph} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="23.5,41.5 29.5,47.5 40.5,36.5" fill="none" stroke={p.accent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Trend line bouncing out of a dip into a gold up-arrow — comeback kid. */
function GlyphComebackKid({ p }: GlyphProps) {
  return (
    <g>
      <polyline
        points="17.5,28.5 26,43.5 31.5,37.5 41.5,23"
        fill="none"
        stroke={p.glyph}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={26} cy={43.5} r={2.2} fill={p.accent} />
      <path d="M44.9 18.1 L43.4 24.3 L39.6 21.7 Z" fill={p.accent} />
    </g>
  );
}

/** Gold crescent moon over an open book — night owl. */
function GlyphNightOwl({ p }: GlyphProps) {
  return (
    <g>
      <path d="M40 13 a8.2 8.2 0 1 0 7 12.8 a6.6 6.6 0 0 1 -7 -12.8 Z" fill={p.accent} />
      <path d="M32 34 C28 31.2 22 31.2 17.5 33.6 V46.4 C22 44 28 44 32 46.8 Z" fill="none" stroke={p.glyph} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M32 34 C36 31.2 42 31.2 46.5 33.6 V46.4 C42 44 36 44 32 46.8 Z" fill="none" stroke={p.glyph} strokeWidth={2.4} strokeLinejoin="round" />
    </g>
  );
}

/** Calendar month grid with the S-S columns lit gold — weekend warrior. */
function GlyphWeekendWarrior({ p }: GlyphProps) {
  const cells: React.ReactElement[] = [];
  for (let i = 0; i < 21; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    cells.push(
      <rect
        key={i}
        x={19.3 + col * 3.8}
        y={29.5 + row * 5.1}
        width={3.1}
        height={3.1}
        rx={0.8}
        fill={col >= 5 ? p.accent : p.glyph}
        opacity={col >= 5 ? 1 : 0.4}
      />,
    );
  }
  return (
    <g>
      <rect x={17.5} y={19} width={29} height={27} rx={3} fill="none" stroke={p.glyph} strokeWidth={2.5} />
      <line x1={17.5} y1={26} x2={46.5} y2={26} stroke={p.glyph} strokeWidth={2} />
      <line x1={24} y1={15} x2={24} y2={19} stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={40} y1={15} x2={40} y2={19} stroke={p.glyph} strokeWidth={2.4} strokeLinecap="round" />
      {cells}
    </g>
  );
}

/** "100" inside the gold laurel — a hundred questions answered. */
function GlyphCentury({ p }: GlyphProps) {
  const leaf = 'M0 0 Q3.2 -3.4 1.6 -8 Q-1.8 -4.4 0 0 Z';
  return (
    <g>
      <path d="M22.5 19.5 C16.5 27 16.5 38 23.5 45.5" fill="none" stroke={p.accent} strokeWidth={2} strokeLinecap="round" />
      <path d="M41.5 19.5 C47.5 27 47.5 38 40.5 45.5" fill="none" stroke={p.accent} strokeWidth={2} strokeLinecap="round" />
      <path d={leaf} fill={p.accent} transform="translate(19.4,24.9) rotate(6)" />
      <path d={leaf} fill={p.accent} transform="translate(17.6,32.5) rotate(-15)" />
      <path d={leaf} fill={p.accent} transform="translate(19.6,40.3) rotate(-41)" />
      <path d={leaf} fill={p.accent} transform="translate(44.6,24.9) rotate(-6) scale(-1,1)" />
      <path d={leaf} fill={p.accent} transform="translate(46.4,32.5) rotate(15) scale(-1,1)" />
      <path d={leaf} fill={p.accent} transform="translate(44.4,40.3) rotate(41) scale(-1,1)" />
      <text x={32} y={36} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={11} fill={p.glyph}>
        100
      </text>
    </g>
  );
}

/** Card stack half-filled gold with "285" — halfway through the bank. */
function GlyphHalfBank({ p }: GlyphProps) {
  return (
    <g>
      <rect x={23.5} y={23.5} width={23} height={15} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.2} opacity={0.5} />
      <rect x={21.5} y={26.5} width={23} height={15} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.2} opacity={0.75} />
      <rect x={19.5} y={29.5} width={23} height={15.5} rx={2} fill={p.field} stroke={p.glyph} strokeWidth={2.4} />
      <path d="M19.5 37.25 H42.5 V43 A2 2 0 0 1 40.5 45 H21.5 A2 2 0 0 1 19.5 43 Z" fill={p.accent} opacity={0.45} />
      <text
        x={31}
        y={40.5}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={9}
        letterSpacing={0.5}
        fill={p.glyph}
      >
        285
      </text>
    </g>
  );
}

/** Twin-peak mountain, gold summit flag, "100" at the base — marathon day. */
function GlyphMarathonDay({ p }: GlyphProps) {
  return (
    <g>
      <path d="M15.5 45.5 L27.5 24.5 L33.5 33.5 L39.5 25.5 L48 45.5 Z" fill="none" stroke={p.glyph} strokeWidth={2.6} strokeLinejoin="round" />
      <line x1={27.5} y1={24.5} x2={27.5} y2={14.5} stroke={p.glyph} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M27.5 14.5 L34 16.6 L27.5 18.7 Z" fill={p.accent} />
      <text x={32.5} y={43} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={8} fill={p.accent}>
        100
      </text>
    </g>
  );
}

/** Gold-forged streak flame with "30" — iron streak. */
function GlyphIronStreak30({ p }: GlyphProps) {
  return (
    <g>
      <path
        d="M32 13.5 C36.5 19.5 43 24.5 43 33 C43 40.4 38.1 46.5 32 46.5 C25.9 46.5 21 40.4 21 33 C21 28.3 23.3 25 26 22.2 C25.7 26.3 27.5 28.6 29.3 28.1 C28.3 23.2 29.6 17.8 32 13.5 Z"
        fill={p.accent}
        fillOpacity={0.3}
        stroke={p.accent}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <text x={32} y={41} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={10} fill={p.glyph}>
        30
      </text>
    </g>
  );
}

/** Crossed wrenches over a gold "25" — fix master. */
function GlyphFixMaster({ p }: GlyphProps) {
  return (
    <g>
      <path d="M19.09 22.96 A6 6 0 1 0 23.96 18.09" fill="none" stroke={p.glyph} strokeWidth={4} strokeLinecap="round" />
      <line x1={29.3} y1={28.3} x2={40} y2={39} stroke={p.glyph} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M44.91 22.96 A6 6 0 1 1 40.04 18.09" fill="none" stroke={p.glyph} strokeWidth={4} strokeLinecap="round" />
      <line x1={34.7} y1={28.3} x2={24} y2={39} stroke={p.glyph} strokeWidth={4.5} strokeLinecap="round" />
      <text x={32} y={51} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={10} fill={p.accent}>
        25
      </text>
    </g>
  );
}

/**
 * Shared "completed world" base: miniaturized section glyph above a gold
 * banner ribbon carrying a navy check. Used by the four world-* badges.
 */
function GlyphWorld({ p, Section }: GlyphProps & { Section: (props: GlyphProps) => React.ReactElement }) {
  return (
    <g>
      <g transform="translate(32 26.5) scale(0.72) translate(-32 -31.5)">
        <Section p={p} />
      </g>
      <path d="M15.5 41.75 H48.5 L45.3 45.5 L48.5 49.25 H15.5 L18.7 45.5 Z" fill={p.accent} />
      <polyline
        points="28.7,45.4 31.4,48 36,42.9"
        fill="none"
        stroke={p.field}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Dotted winding trail rising to a big gold star — Study Path complete. */
function GlyphPathComplete({ p }: GlyphProps) {
  return (
    <g>
      <path
        d="M20.5 50 C36 48.5 40.5 41.5 30.5 37 C20.5 32.5 22 25 33.5 22.5"
        fill="none"
        stroke={p.glyph}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeDasharray="4.5 4"
      />
      <circle cx={20.5} cy={50} r={2.4} fill={p.accent} />
      <path d={starPath(40, 16.5, 6.5)} fill={p.accent} />
      <path d={starPath(17.5, 20, 2.4)} fill={p.accent} />
      <path d={starPath(47, 32, 2.2)} fill={p.accent} />
    </g>
  );
}

/** Gold crown over a quartered gold shield — the ultimate badge. */
function GlyphUniversalBoss({ p }: GlyphProps) {
  return (
    <g>
      <path d="M20 22.5 V13.5 L26 18 L32 11 L38 18 L44 13.5 V22.5 Z" fill={p.accent} />
      <circle cx={32} cy={18.5} r={1.5} fill={p.field} />
      <path d="M32 26 L45 31 V38.5 H32 Z" fill={p.accent} opacity={0.55} />
      <path d="M32 38.5 V54.8 C24.5 51.8 19 46.8 19 38.5 Z" fill={p.accent} opacity={0.55} />
      <path d="M32 26 L19 31 V38.5 H32 Z" fill={p.accent} opacity={0.22} />
      <path d="M32 38.5 V54.8 C39.5 51.8 45 46.8 45 38.5 Z" fill={p.accent} opacity={0.22} />
      <path
        d="M32 26 L45 31 V38.5 C45 46.8 39.5 51.8 32 54.8 C24.5 51.8 19 46.8 19 38.5 V31 Z"
        fill="none"
        stroke={p.accent}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <line x1={32} y1={26.5} x2={32} y2={54.3} stroke={p.accent} strokeWidth={1.8} />
      <line x1={19.5} y1={38.5} x2={44.5} y2={38.5} stroke={p.accent} strokeWidth={1.8} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Badge registry                                                      */
/* ------------------------------------------------------------------ */

type BadgeDef = {
  title: string;
  /** Rim override (streak tiers use bronze/silver). Default gold. */
  rim?: string;
  /** Field override (universal uses deep ink). Default navy. */
  field?: string;
  /** Richer medallion chrome (universal tier). */
  rich?: boolean;
  /** Grandest chrome — rich plus an extra inner gold band (universal-boss only). */
  grand?: boolean;
  Glyph: (props: GlyphProps) => React.ReactElement;
};

const BADGES: Record<BadgeId, BadgeDef> = {
  'core-ready': { title: 'Core Ready', Glyph: GlyphCoreReady },
  'type1-ready': { title: 'Type I Ready', Glyph: GlyphType1 },
  'type2-ready': { title: 'Type II Ready', Glyph: GlyphType2 },
  'type3-ready': { title: 'Type III Ready', Glyph: GlyphType3 },
  'universal-ready': { title: 'Universal Ready', field: INK, rich: true, Glyph: GlyphUniversal },
  'boss-down': { title: 'Boss Down', Glyph: GlyphBossDown },
  'perfect-10': { title: 'Perfect 10', Glyph: GlyphPerfect10 },
  'streak-3': { title: '3-Day Streak', rim: BRONZE, Glyph: (props) => <GlyphStreak {...props} days={3} /> },
  'streak-7': { title: '7-Day Streak', rim: SILVER, Glyph: (props) => <GlyphStreak {...props} days={7} /> },
  'streak-14': { title: '14-Day Streak', rim: GOLD, Glyph: (props) => <GlyphStreak {...props} days={14} /> },
  'full-bank': { title: 'Full Bank', Glyph: GlyphFullBank },
  'beat-the-clock': { title: 'Beat the Clock', Glyph: GlyphBeatTheClock },
  fixer: { title: 'Fixer', Glyph: GlyphFixer },
  'first-test': { title: 'First Test', Glyph: GlyphFirstTest },
  'first-level': { title: 'First Level', Glyph: GlyphFirstLevel },
  sharpshooter: { title: 'Sharpshooter', Glyph: GlyphSharpshooter },
  'flawless-exam': { title: 'Flawless Exam', Glyph: GlyphFlawlessExam },
  'speed-runner': { title: 'Speed Runner', Glyph: GlyphSpeedRunner },
  'hat-trick': { title: 'Hat Trick', Glyph: GlyphHatTrick },
  'comeback-kid': { title: 'Comeback Kid', Glyph: GlyphComebackKid },
  'night-owl': { title: 'Night Owl', Glyph: GlyphNightOwl },
  'weekend-warrior': { title: 'Weekend Warrior', Glyph: GlyphWeekendWarrior },
  century: { title: 'Century', Glyph: GlyphCentury },
  'half-bank': { title: 'Half Bank', Glyph: GlyphHalfBank },
  'marathon-day': { title: 'Marathon Day', Glyph: GlyphMarathonDay },
  'iron-streak-30': { title: '30-Day Iron Streak', Glyph: GlyphIronStreak30 },
  'fix-master': { title: 'Fix Master', Glyph: GlyphFixMaster },
  'world-core': { title: 'Core World Complete', Glyph: (props) => <GlyphWorld {...props} Section={GlyphCoreReady} /> },
  'world-type1': { title: 'Type I World Complete', Glyph: (props) => <GlyphWorld {...props} Section={GlyphType1} /> },
  'world-type2': { title: 'Type II World Complete', Glyph: (props) => <GlyphWorld {...props} Section={GlyphType2} /> },
  'world-type3': { title: 'Type III World Complete', Glyph: (props) => <GlyphWorld {...props} Section={GlyphType3} /> },
  'path-complete': { title: 'Path Complete', field: INK, rich: true, Glyph: GlyphPathComplete },
  'universal-boss': { title: 'Universal Boss', field: INK, rich: true, grand: true, Glyph: GlyphUniversalBoss },
};

/* ------------------------------------------------------------------ */
/* Public components                                                   */
/* ------------------------------------------------------------------ */

export function BadgeIcon({
  id,
  size = 56,
  locked = false,
}: {
  id: BadgeId;
  size?: number;
  locked?: boolean;
}) {
  const def = BADGES[id];
  const rimWidth = def.rich ? 3.5 : 2.5;
  const p: Palette = locked
    ? LOCKED_PALETTE
    : { rim: def.rim ?? GOLD, field: def.field ?? NAVY, glyph: WHITE, accent: GOLD };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={locked ? `${def.title} (locked)` : def.title}
      opacity={locked ? 0.7 : undefined}
    >
      <circle cx={32} cy={32} r={30} fill={p.field} />
      <circle cx={32} cy={32} r={30 - rimWidth / 2} fill="none" stroke={p.rim} strokeWidth={rimWidth} />
      {def.rich && <circle cx={32} cy={32} r={27.25} fill="none" stroke={p.rim} strokeWidth={0.75} opacity={0.5} />}
      <circle cx={32} cy={32} r={25.5} fill="none" stroke={p.rim} strokeWidth={1} opacity={def.rich ? 0.6 : 0.35} />
      {def.grand && <circle cx={32} cy={32} r={24} fill="none" stroke={p.rim} strokeWidth={0.75} opacity={0.5} />}
      <def.Glyph p={p} />
    </svg>
  );
}

export function RankInsignia({ rank, size = 40 }: { rank: RankId; size?: number }) {
  const idx = RANKS.findIndex((r) => r.id === rank);
  const count = Math.max(1, idx + 1); // 1 chevron (apprentice) → 5 (master-tech)
  const isMaster = rank === 'master-tech';
  const label = RANKS[Math.max(0, idx)].label;

  const step = 8;
  const bandHeight = 15;
  const stackHeight = (count - 1) * step + bandHeight;
  const starRoom = isMaster ? 10 : 0;
  const y0 = (64 - stackHeight - starRoom) / 2 + starRoom;

  const bands: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const y = y0 + i * step;
    bands.push(
      <path
        key={i}
        d={`M32 ${y} L47 ${y + 9} V${y + 15} L32 ${y + 6} L17 ${y + 15} V${y + 9} Z`}
        fill={isMaster ? GOLD : NAVY}
        stroke={isMaster ? INK : 'none'}
        strokeWidth={isMaster ? 1 : 0}
        strokeLinejoin="round"
      />,
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${label} rank insignia`}>
      {bands}
      {isMaster && <path d={starPath(32, y0 - 6.5, 4)} fill={GOLD} stroke={INK} strokeWidth={1} strokeLinejoin="round" />}
    </svg>
  );
}
