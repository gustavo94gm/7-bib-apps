import { drizzle } from 'drizzle-orm/node-postgres'
import { visitorLogs } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const db = drizzle(process.env.DATABASE_URL!)

  const [visitor] = await db.insert(visitorLogs).values({
    cpf: body.cpf,
    name: body.name,
    badgeNumber: body.badgeNumber,
    destination: body.destination,
    situation: body.situation,
    visitDate: body.visitDate,
    entryTime: body.entryTime,
    exitTime: body.exitTime || null,
    createdAt: new Date(),
  }).returning()

  return visitor
})
