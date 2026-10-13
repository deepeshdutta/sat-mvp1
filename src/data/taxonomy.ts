export type Section = 'RW' | 'M'
export interface Skill { id: string; name: string; domain: string; synonyms: string[]; prereqs?: string[] }
export interface Domain { id: string; name: string; section: Section; share: number }

// Domain shares approximate the published SAT blueprint (operational weights are versioned policy, AD-4)
export const DOMAINS: Domain[] = [
  { id: 'ii', name: 'Information and Ideas', section: 'RW', share: 0.26 },
  { id: 'cs', name: 'Craft and Structure', section: 'RW', share: 0.28 },
  { id: 'eoi', name: 'Expression of Ideas', section: 'RW', share: 0.20 },
  { id: 'sec', name: 'Standard English Conventions', section: 'RW', share: 0.26 },
  { id: 'alg', name: 'Algebra', section: 'M', share: 0.35 },
  { id: 'adv', name: 'Advanced Math', section: 'M', share: 0.35 },
  { id: 'psda', name: 'Problem-Solving and Data Analysis', section: 'M', share: 0.15 },
  { id: 'geo', name: 'Geometry and Trigonometry', section: 'M', share: 0.15 },
]

export const SKILLS: Skill[] = [
  { id: 'central-ideas', name: 'Central Ideas and Details', domain: 'ii', synonyms: ['main idea', 'summary', 'gist'] },
  { id: 'command-evidence', name: 'Command of Evidence', domain: 'ii', synonyms: ['evidence', 'support claim', 'quantitative evidence', 'graph'] },
  { id: 'inferences', name: 'Inferences', domain: 'ii', synonyms: ['logical completion', 'conclude', 'infer'] },
  { id: 'words-context', name: 'Words in Context', domain: 'cs', synonyms: ['vocabulary', 'vocab', 'word meaning', 'diction'] },
  { id: 'text-structure', name: 'Text Structure and Purpose', domain: 'cs', synonyms: ['purpose', 'function', 'structure'] },
  { id: 'cross-text', name: 'Cross-Text Connections', domain: 'cs', synonyms: ['paired passages', 'two texts', 'compare'] },
  { id: 'transitions', name: 'Transitions', domain: 'eoi', synonyms: ['connectors', 'however', 'therefore', 'logical flow'] },
  { id: 'rhetorical-synthesis', name: 'Rhetorical Synthesis', domain: 'eoi', synonyms: ['notes', 'bullet points', 'student notes'] },
  { id: 'boundaries', name: 'Boundaries', domain: 'sec', synonyms: ['punctuation', 'comma splice', 'semicolon', 'run-on', 'colon', 'sentence boundaries'] },
  { id: 'form-structure', name: 'Form, Structure, and Sense', domain: 'sec', synonyms: ['grammar', 'subject-verb agreement', 'verb tense', 'pronoun', 'modifier'] },
  { id: 'linear-eq', name: 'Linear Equations in One Variable', domain: 'alg', synonyms: ['solve for x', 'linear equation'] },
  { id: 'systems', name: 'Systems of Linear Equations', domain: 'alg', synonyms: ['system', 'simultaneous equations', 'elimination', 'substitution'], prereqs: ['linear-eq'] },
  { id: 'linear-functions', name: 'Linear Functions', domain: 'alg', synonyms: ['slope', 'intercept', 'y = mx + b', 'rate of change'], prereqs: ['linear-eq'] },
  { id: 'nonlinear-eq', name: 'Nonlinear Equations', domain: 'adv', synonyms: ['quadratic', 'quadratics', 'factoring', 'roots', 'zeros'], prereqs: ['linear-eq'] },
  { id: 'equiv-expr', name: 'Equivalent Expressions', domain: 'adv', synonyms: ['simplify', 'expand', 'polynomial', 'exponents'] },
  { id: 'nonlinear-functions', name: 'Nonlinear Functions', domain: 'adv', synonyms: ['exponential', 'growth', 'decay', 'parabola', 'vertex'], prereqs: ['linear-functions'] },
  { id: 'ratios-rates', name: 'Ratios, Rates, and Units', domain: 'psda', synonyms: ['proportion', 'unit conversion', 'rate'] },
  { id: 'percentages', name: 'Percentages', domain: 'psda', synonyms: ['percent', 'percent change', 'discount'] },
  { id: 'statistics', name: 'One-Variable Statistics', domain: 'psda', synonyms: ['mean', 'median', 'average', 'range', 'standard deviation'] },
  { id: 'area-volume', name: 'Area and Volume', domain: 'geo', synonyms: ['volume', 'area', 'perimeter', 'cylinder'] },
  { id: 'right-tri', name: 'Right Triangles and Trigonometry', domain: 'geo', synonyms: ['pythagorean', 'sine', 'cosine', 'trig', 'sohcahtoa'] },
  { id: 'circles', name: 'Circles', domain: 'geo', synonyms: ['radius', 'circle equation', 'arc', 'circumference'] },
]

export const BANDS = ['1 (lowest)', '2', '3', '4', '5', '6', '7 (highest)']
export const domainById = (id: string) => DOMAINS.find(d => d.id === id)!
export const skillById = (id: string) => SKILLS.find(s => s.id === id)!
