import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const pokerState = sqliteTable('poker_state', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  payload: text('payload').notNull(),
});
