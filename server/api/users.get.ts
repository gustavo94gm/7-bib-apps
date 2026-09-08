import { db } from '~~/server/index'
import { user } from '../db/auth-schema'

export default defineEventHandler(async () => {
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
