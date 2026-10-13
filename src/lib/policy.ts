// Versioned policy configuration (AD-4). Thresholds are configuration, not constants.
export const POLICY = {
  version: 'policy-2026.10-v1',
  practiceTarget: 0.8, // internal practice threshold, NOT an SAT score target
  buckets: { primary: 0.6, next: 0.25, review: 0.15 },
  improving: { window: 10, correct: 8, sessions: 2, mediumPlus: 4 },
  secured: { window: 15, correct: 14, sessions: 3, mediumPlus: 6 },
  delayedCheck: { minDays: 3, maxDays: 7, items: 5, correct: 4 },
  staleDays: 60,
  reviewDays: [3, 7] as [number, number],
  budgetSec: 1200, pauseMaxSec: 300, graceSec: 2,
  freeDailyWorkouts: 1,
  starterPerDomain: 3, focusedMin: 6, focusedMax: 12,
  otp: { ttlMin: 10, maxAttempts: 5, maxPerHour: 5 },
  authSessionDays: 30, recentAuthMin: 15,
  graceDays: 7, refundDays: 7,
  prices: { plus: 15, max: 25 }, terms: { plus: 6, max: 12 },
  aiMonthlyBudget: 150,
}
export const RANGES: Record<string, { label: string; total: [number, number]; section: [number, number]; official: boolean }> = {
  sat: { label: 'Official SAT', total: [400, 1600], section: [200, 800], official: true },
  psat_nmsqt: { label: 'PSAT/NMSQT', total: [320, 1520], section: [160, 760], official: true },
  psat_10: { label: 'PSAT 10', total: [320, 1520], section: [160, 760], official: true },
  psat_8_9: { label: 'PSAT 8/9', total: [240, 1440], section: [120, 720], official: true },
  bluebook: { label: 'Bluebook SAT practice test', total: [400, 1600], section: [200, 800], official: false },
  other: { label: 'Other practice (name the source)', total: [0, 0], section: [0, 0], official: false },
}
