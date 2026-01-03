import { pgTable, text, serial, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 255 }).primaryKey(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  brandColor: varchar('brand_color', { length: 50 }),
  telegramChatId: varchar('telegram_chat_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 255 }).references(() => tenants.id),
  customerName: varchar('customer_name', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 255 }).references(() => tenants.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  parentId: integer('parent_id'), // Removed self-reference to avoid circular dependency
  createdAt: timestamp('created_at').defaultNow(),
});