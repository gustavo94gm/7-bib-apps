import { drizzle } from 'drizzle-orm/node-postgres'
import { categories } from '../db/schema'

export default defineEventHandler(async () => {
  const db = drizzle(process.env.DATABASE_URL!)
  return db.select().from(categories)
})
