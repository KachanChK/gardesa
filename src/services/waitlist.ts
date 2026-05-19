import { db } from '../config/database'

type WaitlistCountRow = {
  count: number
}

export async function getWaitlistCount(): Promise<number | null> {
  const result = await db.query<WaitlistCountRow>(
    'SELECT public.get_waitlist_count() AS count'
  )

  return result.rows[0]?.count ?? null
}

export async function addWaitlistEmail(email: string): Promise<void> {
  await db.query('INSERT INTO waitlist (email) VALUES ($1)', [email])
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

export function getDatabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
