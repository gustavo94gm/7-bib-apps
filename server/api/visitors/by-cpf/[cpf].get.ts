import { db } from '~~/server/index'
import { visitorLogs } from '../../../db/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const cpf = getRouterParam(event, 'cpf');

  const [visitor] = await db
    .select({ name: visitorLogs.name, situationId: visitorLogs.situationId })
    .from(visitorLogs)
    .where(eq(visitorLogs.cpf, cpf!))
    .orderBy(desc(visitorLogs.createdAt))
    .limit(1);

  return visitor ?? null;
});
