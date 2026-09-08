import { db } from '~~/server/index'
import { sections } from '../db/schema'

export default defineEventHandler(async () => {
  return db.select().from(sections)
})
