import { db } from '~~/server/index'
import { visitorLogs } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)


  const [visitor] = await db.insert(visitorLogs).values({
    cpf: body.cpf,
    name: body.name,
    badgeNumber: body.badgeNumber,
    destination: body.destination,
    situationId: body.situationId,
    visitDate: body.visitDate,
    entryTime: body.entryTime,
    exitTime: body.exitTime || null,
    createdAt: new Date(),
  }).returning()

  return visitor
})
