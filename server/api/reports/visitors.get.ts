import { drizzle } from 'drizzle-orm/node-postgres'
import { visitorLogs } from '../../db/schema'
import { ilike, and, gte, lte, desc, SQL } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = drizzle(process.env.DATABASE_URL!)
  const query = getQuery(event)

  const cpf = query.cpf as string | undefined
  const badgeNumber = query.badgeNumber as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined

  const conditions: SQL[] = []

  if (cpf) conditions.push(ilike(visitorLogs.cpf, `%${cpf}%`))
  if (badgeNumber) conditions.push(ilike(visitorLogs.badgeNumber, `%${badgeNumber}%`))
  if (dateFrom) conditions.push(gte(visitorLogs.visitDate, dateFrom))
  if (dateTo) conditions.push(lte(visitorLogs.visitDate, dateTo))

  return db
    .select()
    .from(visitorLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visitorLogs.visitDate))
})
