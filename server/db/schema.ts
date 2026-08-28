import { pgTable, pgEnum, bigserial, bigint, varchar, text, timestamp, date, time, primaryKey, unique } from "drizzle-orm/pg-core"
import { user } from "./auth-schema"

export const visitorSituationEnum = pgEnum("visitor_situation", [
	"civil",
	"inativo_pensionista",
	"militar_outra_om",
	"militar_reserva",
])

export const categories = pgTable("categories", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	name: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_categories_name").on(table.name),]);

export const comments = pgTable("comments", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	ticketId: bigint("ticket_id", { mode: 'number' }),
	authorId: text("author_id").references(() => user.id),
	authorName: varchar("author_name", { length: 255 }),
	content: text(),
	createdAt: timestamp("created_at", { withTimezone: true }),
});

export const graduations = pgTable("graduations", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	abbreviation: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_graduations_abbreviation").on(table.abbreviation),]);

export const sections = pgTable("sections", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	name: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
	unique("uni_sections_name").on(table.name),]);

export const ticketAssignees = pgTable("ticket_assignees", {
	ticketId: bigint("ticket_id", { mode: 'number' }).references(() => tickets.id),
	userId: text("user_id").references(() => user.id),
}, (table) => [
	primaryKey({ columns: [table.ticketId, table.userId], name: "ticket_assignees_pkey"}),
]);

export const visitorLogs = pgTable("visitor_logs", {
	id: bigserial({ mode: 'number' }).primaryKey(),
	cpf: varchar({ length: 20 }),
	name: text(),
	badgeNumber: varchar("badge_number", { length: 50 }),
	destination: text(),
	situation: visitorSituationEnum("situation"),
	visitDate: date("visit_date"),
	entryTime: time("entry_time"),
	exitTime: time("exit_time"),
	createdAt: timestamp("created_at", { withTimezone: true }),
});

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
