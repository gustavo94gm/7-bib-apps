import { pgTable, bigserial, bigint, varchar, text, timestamp, foreignKey, primaryKey, unique } from "drizzle-orm/pg-core"

export const categories = pgTable("categories", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_categories_name").on(table.name),]);

export const comments = pgTable("comments", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	ticketId: bigint("ticket_id", { mode: 'number' }).notNull(),
	authorId: bigint("author_id", { mode: 'number' }),
	authorName: varchar("author_name", { length: 255 }),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
});

export const graduations = pgTable("graduations", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	abbreviation: varchar({ length: 20 }).notNull(),
	order: bigint({ mode: 'number' }).default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_graduations_abbreviation").on(table.abbreviation),]);

export const sections = pgTable("sections", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_sections_name").on(table.name),]);

export const ticketAssignees = pgTable("ticket_assignees", {
	ticketId: bigint("ticket_id", { mode: 'number' }).notNull().references(() => tickets.id),
	userId: bigint("user_id", { mode: 'number' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.ticketId, table.userId], name: "ticket_assignees_pkey"}),
]);

export const tickets = pgTable("tickets", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	title: text(),
	description: text(),
	status: text(),
	categoryId: bigint("category_id", { mode: 'number' }).references(() => categories.id),
	requesterName: text("requester_name"),
	requesterGraduationId: bigint("requester_graduation_id", { mode: 'number' }).references(() => graduations.id),
	requesterSectionId: bigint("requester_section_id", { mode: 'number' }).references(() => sections.id),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	closedAt: timestamp("closed_at", { withTimezone: true }),
});
