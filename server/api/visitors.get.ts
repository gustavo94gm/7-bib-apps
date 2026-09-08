import { db } from '~~/server/index'
import { visitorLogs } from '../db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db
    .select()
    .from(visitorLogs)
    .orderBy(desc(visitorLogs.createdAt))
})
