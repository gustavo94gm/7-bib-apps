import { drizzle } from 'drizzle-orm/node-postgres'
import { user } from '../db/auth-schema'

export default defineEventHandler(async () => {
  const db = drizzle(process.env.DATABASE_URL!)

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)

  return users
})
