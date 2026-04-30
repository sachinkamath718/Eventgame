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
  // Find matching rule (case-insensitive)
  const rule = rules.find(r =>
    r.designations.some(d => d.toLowerCase() === designation.toLowerCase())
  )

  if (!rule) {
    // No rule found → default consolation (rank 5)
    return { prizeRank: 5, won: false }
  }

  // Roll the dice
  const roll = Math.random() * 100
  const won = roll < rule.win_probability

  return {
    prizeRank: won ? rule.prize_rank : 5,
    won,
  }
}

/** Default designation groups for quick setup */
export const DEFAULT_DESIGNATION_GROUPS = [
  {
    label: 'C-Suite / VP',
    designations: ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CHRO', 'VP', 'President', 'Director'],
    prize_rank: 1,
    win_probability: 90,
  },
  {
    label: 'Senior Engineers / Managers',
    designations: ['Engineering Manager', 'Senior Engineer', 'Senior Developer', 'Tech Lead', 'Architect', 'Manager'],
    prize_rank: 2,
    win_probability: 80,
  },
  {
    label: 'Engineers / Analysts',
    designations: ['Software Engineer', 'Data Engineer', 'Data Analyst', 'Business Analyst', 'Developer', 'QA Engineer'],
    prize_rank: 3,
    win_probability: 70,
  },
  {
    label: 'Students / Interns',
    designations: ['Student', 'Intern', 'Fresher', 'Trainee', 'Graduate'],
    prize_rank: 4,
    win_probability: 50,
  },
]

export const ALL_DESIGNATIONS = DEFAULT_DESIGNATION_GROUPS.flatMap(g => g.designations)
