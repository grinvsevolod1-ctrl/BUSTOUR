/**
 * The project migrated from SQLite (libsql `file:` URLs) to PostgreSQL.
 * Runtime selfchecks that used to spin up a throwaway .db file now need a
 * real PostgreSQL DATABASE_URL. When it is absent (CI without a database,
 * sandboxes), the runtime portion must SKIP — static source assertions in
 * the same script still run and remain valuable.
 */
export function hasSelfcheckPostgres(): boolean {
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || "")
}

export function skipRuntimeMessage(name: string): string {
  return `${name}: runtime part skipped — requires a PostgreSQL DATABASE_URL (static checks passed)`
}
