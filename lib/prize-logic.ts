export type Prize = {
  id: string
  rank: number
  name: string
  description?: string
  image_url?: string
  is_consolation?: boolean
}

export type DesignationRule = {
  designations: string[]
  prize_rank: number
  win_probability: number
}

/**
 * Assigns a full prize object to a participant based on their designation.
 * Returns the matched prize, or consolation prize if they don't win.
 */
export function assignPrize(
  designation: string,
  rules: DesignationRule[],
  prizes: Prize[]
): Prize | null {
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )
  if (!rule) {
    return prizes.find(p => p.is_consolation) ?? null
  }
  const roll = Math.random() * 100
  const won  = roll < rule.win_probability
  if (!won) return prizes.find(p => p.is_consolation) ?? null
  return prizes.find(p => p.rank === rule.prize_rank) ?? null
}

/**
 * Determines which prize a participant wins based on their designation.
 * Returns { prizeRank, won } where won=false means consolation prize.
 */
export function determinePrize(
  designation: string,
  rules: Array<{
    designations: string[]
    prize_rank: number
    win_probability: number
  }>
): { prizeRank: number; won: boolean } {
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )
  if (!rule) {
    return { prizeRank: 5, won: false }
  }
  const roll = Math.random() * 100
  const won = roll < rule.win_probability
  return {
    prizeRank: won ? rule.prize_rank : 5,
    won,
  }
}

/**
 * Default designation groups with win probabilities:
 * - C-Suite / VP / Director  → 90% win chance  (90:10)
 * - Engineers / Developers   → 80% win chance  (80:20)
 * - Students                 → 50% win chance  (50:50)
 * - Interns / Freshers       → 60% win chance  (60:40)
 */
export const DEFAULT_DESIGNATION_GROUPS = [
  {
    label: 'C-Suite / VP / Director',
    designations: ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CHRO', 'VP', 'President', 'Director'],
    prize_rank: 1,
    win_probability: 90, // 90:10
  },
  {
    label: 'Engineers / Developers',
    designations: [
      'Engineering Manager', 'Senior Engineer', 'Senior Developer',
      'Tech Lead', 'Architect', 'Manager',
      'Software Engineer', 'Data Engineer', 'Data Analyst',
      'Business Analyst', 'Developer', 'QA Engineer',
    ],
    prize_rank: 2,
    win_probability: 80, // 80:20
  },
  {
    label: 'Students',
    designations: ['Student', 'Graduate'],
    prize_rank: 3,
    win_probability: 50, // 50:50
  },
  {
    label: 'Interns / Freshers',
    designations: ['Intern', 'Fresher', 'Trainee'],
    prize_rank: 4,
    win_probability: 60, // 60:40
  },
]

export const ALL_DESIGNATIONS = DEFAULT_DESIGNATION_GROUPS.flatMap(g => g.designations)
