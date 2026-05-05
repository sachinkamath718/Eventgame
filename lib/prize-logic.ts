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

export type AssignResult = {
  prize: Prize | null
  won: boolean
}

/**
 * Assigns a prize to a participant based on their designation and probability.
 * Returns { prize, won } — won=false means consolation, won=true means real prize.
 */
export function assignPrize(
  designation: string,
  rules: DesignationRule[],
  prizes: Prize[]
): AssignResult {
  const consolation = prizes.find(p => p.is_consolation) ?? null

  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )

  if (!rule) {
    return { prize: consolation, won: false }
  }

  const roll = Math.random() * 100
  const won  = roll < rule.win_probability

  if (!won) {
    return { prize: consolation, won: false }
  }

  const winPrize = prizes.find(p => p.rank === rule.prize_rank) ?? consolation
  return { prize: winPrize, won: true }
}

export function determinePrize(
  designation: string,
  rules: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
): { prizeRank: number; won: boolean } {
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )
  if (!rule) return { prizeRank: 5, won: false }
  const won = Math.random() * 100 < rule.win_probability
  return { prizeRank: won ? rule.prize_rank : 5, won }
}

/**
 * Default designation groups:
 * C-Suite/VP → 90:10, Engineers/Devs → 80:20, Students → 50:50, Interns → 60:40
 */
export const DEFAULT_DESIGNATION_GROUPS = [
  {
    label: 'C-Suite / VP / Director',
    designations: ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CHRO', 'VP', 'President', 'Director'],
    prize_rank: 1,
    win_probability: 90,
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
    win_probability: 80,
  },
  {
    label: 'Students',
    designations: ['Student', 'Graduate'],
    prize_rank: 3,
    win_probability: 50,
  },
  {
    label: 'Interns / Freshers',
    designations: ['Intern', 'Fresher', 'Trainee'],
    prize_rank: 4,
    win_probability: 60,
  },
]

export const ALL_DESIGNATIONS = DEFAULT_DESIGNATION_GROUPS.flatMap(g => g.designations)
