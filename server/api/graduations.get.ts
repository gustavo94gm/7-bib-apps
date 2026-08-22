import { drizzle } from 'drizzle-orm/node-postgres'
import { graduations } from '../db/schema'

export default defineEventHandler(async () => {
  const db = drizzle(process.env.DATABASE_URL!)
  return db.select().from(graduations)
})
