import { db } from '~~/server/index'
import { visitorLogs, visitorSituations } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const date = getQuery(event).date as string | undefined

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
    .where(date ? eq(visitorLogs.visitDate, date) : undefined)
    .orderBy(desc(visitorLogs.createdAt))
})
