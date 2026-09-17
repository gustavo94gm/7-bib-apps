import { db } from '~~/server/index'
import { visitorLogs, visitorSituations } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
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
    .orderBy(desc(visitorLogs.createdAt))
})
