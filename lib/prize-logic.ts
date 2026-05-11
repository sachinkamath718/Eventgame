export type Prize = {
  id: string
  rank: number
  name: string
  description?: string
  image_url?: string
  quantity?: number        // how many can be won in total
  claimed?: number         // how many have been claimed so far
  is_consolation?: boolean
  is_grand_prize?: boolean
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
 * Check whether a prize still has remaining quantity.
 * If quantity is undefined/null we treat it as unlimited.
 */
function hasStock(prize: Prize): boolean {
  if (prize.quantity == null) return true
  const claimed = prize.claimed ?? 0
  return claimed < prize.quantity
}

/**
 * Assigns a prize to a participant based on:
 *  1. Their designation → finds a matching rule
 *  2. Probability roll  → win or consolation
 *  3. Quantity check    → if the target prize is exhausted, fall back to consolation
 *
 * Returns { prize, won }
 *   won = true  → real prize (pointer lands on that segment)
 *   won = false → consolation / better-luck-next-time
 */
export function assignPrize(
  designation: string,
  rules: DesignationRule[],
  prizes: Prize[],
): AssignResult {
  const consolation = prizes.find(p => p.is_consolation) ?? null

  // No matching rule → consolation
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )
  if (!rule) return { prize: consolation, won: false }

  // Probability roll
  const roll = Math.random() * 100
  const won  = roll < rule.win_probability
  if (!won) return { prize: consolation, won: false }

  // Find the target prize
  const target = prizes.find(p => p.rank === rule.prize_rank)

  // Quantity guard — if prize is sold out, fall back to consolation
  if (!target || !hasStock(target)) {
    return { prize: consolation, won: false }
  }

  return { prize: target, won: true }
}

/**
 * Lighter helper used in some places — kept for backwards compat.
 */
export function determinePrize(
  designation: string,
  rules: Array<{ designations: string[]; prize_rank: number; win_probability: number }>,
): { prizeRank: number; won: boolean } {
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )
  if (!rule) return { prizeRank: 99, won: false }
  const won = Math.random() * 100 < rule.win_probability
  return { prizeRank: won ? rule.prize_rank : 99, won }
}

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
