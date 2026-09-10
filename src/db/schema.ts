import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table required for Firebase Auth integration with Cloud SQL
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').notNull().default('customer'), // 'admin' or 'customer'
  createdAt: timestamp('created_at').defaultNow(),
});

// Dynamic Customer Review System reviews table
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  email: text('email').notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  reviewText: text('review_text').notNull(),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type User = typeof users.$inferSelect;
