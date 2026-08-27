import { drizzle } from 'drizzle-orm/node-postgres'
import { visitorLogs } from '../db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = drizzle(process.env.DATABASE_URL!)

  return db
    .select()
    .from(visitorLogs)
    .orderBy(desc(visitorLogs.createdAt))
})
