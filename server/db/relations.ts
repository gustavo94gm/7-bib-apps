import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

export const relations = defineRelations({ ...schema, ...authSchema }, (r) => ({
	ticketAssignees: {
		ticket: r.one.tickets({
			from: r.ticketAssignees.ticketId,
			to: r.tickets.id
		}),
	},
	tickets: {
		ticketAssignees: r.many.ticketAssignees(),
		category: r.one.categories({
			from: r.tickets.categoryId,
			to: r.categories.id
		}),
		graduation: r.one.graduations({
			from: r.tickets.requesterGraduationId,
			to: r.graduations.id
		}),
		section: r.one.sections({
			from: r.tickets.requesterSectionId,
			to: r.sections.id
		}),
	},
	categories: {
		tickets: r.many.tickets(),
	},
	graduations: {
		tickets: r.many.tickets(),
	},
	sections: {
		tickets: r.many.tickets(),
	},
	user: {
		sessions: r.many.session({
			from: r.user.id,
			to: r.session.userId,
		}),
		accounts: r.many.account({
			from: r.user.id,
			to: r.account.userId,
		})
	},
	session: {
		user: r.one.user({
			from: r.session.userId,
			to: r.user.id,
		})
	},
	account: {
		user: r.one.user({
			from: r.account.userId,
			to: r.user.id,
		})
	}
}))