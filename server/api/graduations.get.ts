import { db } from '~~/server/index'
import { graduations } from '../db/schema'

export default defineEventHandler(async () => {
  return db.select().from(graduations)
})
