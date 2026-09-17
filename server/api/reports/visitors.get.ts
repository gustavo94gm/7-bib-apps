import { db } from '~~/server/index'
import { visitorLogs, visitorSituations } from '../../db/schema'
import { ilike, and, gte, lte, desc, eq, SQL } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
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
    .select({
      id: visitorLogs.id,
      cpf: visitorLogs.cpf,
      name: visitorLogs.name,
      badgeNumber: visitorLogs.badgeNumber,
      destination: visitorLogs.destination,
      visitDate: visitorLogs.visitDate,
      entryTime: visitorLogs.entryTime,
      exitTime: visitorLogs.exitTime,
      createdAt: visitorLogs.createdAt,
      situation: {
        id: visitorSituations.id,
        name: visitorSituations.name,
      },
    })
    .from(visitorLogs)
    .leftJoin(visitorSituations, eq(visitorLogs.situationId, visitorSituations.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visitorLogs.visitDate))
})
