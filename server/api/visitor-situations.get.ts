import { db } from '~~/server/index'
import { visitorSituations } from '../db/schema'

export default defineEventHandler(async () => {
  return db.select().from(visitorSituations)
})
