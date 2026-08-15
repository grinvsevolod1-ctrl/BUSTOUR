// Requires DATABASE_URL; this is a live PostgreSQL integrity check.
import { client, closeDbPool } from "@/lib/db"

type Check = { name: string; count: number }

async function count(name: string, sql: string): Promise<Check> {
  const result = await client.execute(sql)
  return { name, count: Number(result.rows[0]?.count ?? 0) }
}

async function main() {
  await client.execute("SET TRANSACTION READ ONLY")
  const checks = await Promise.all([
    count("cities_without_country", `SELECT COUNT(*) AS count FROM city_destinations c LEFT JOIN countries p ON p.id = c."countryId" WHERE p.id IS NULL`),
    count("tours_without_country", `SELECT COUNT(*) AS count FROM tours t LEFT JOIN countries p ON p.id = t."countryId" WHERE t."countryId" <> 0 AND p.id IS NULL`),
    count("tours_without_arrival_city", `SELECT COUNT(*) AS count FROM tours t LEFT JOIN city_destinations c ON c.id = t."arrivalCityId" WHERE c.id IS NULL`),
    count("tour_country_city_mismatch", `SELECT COUNT(*) AS count FROM tours t JOIN city_destinations c ON c.id = t."arrivalCityId" WHERE t."countryId" <> c."countryId"`),
  ])
  console.log(JSON.stringify({ readOnly: true, checks, ok: checks.every((c) => c.count === 0) }, null, 2))
  if (checks.some((c) => c.count > 0)) process.exitCode = 1
}

main().finally(closeDbPool)
