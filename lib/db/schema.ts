import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

// Base signal table columns for raw incoming signals
const signalColumns = {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 255 }),
  signal: varchar('signal', { length: 255 }),
  message: text('message'),
  timestamp: timestamp('timestamp', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  full_message: text('full_message'),
};

// Raw signal tables per group, for logging/archiving purposes
export const tradingview_signals = pgTable('tradingview_signals', signalColumns);
export const tradingview_signals_btc = pgTable(
  'tradingview_signals_btc',
  signalColumns,
);
export const tradingview_signals_ai = pgTable(
  'tradingview_signals_ai',
  signalColumns,
);

// A single, unified queue for all signal groups
export const cryptohopper_queue = pgTable('cryptohopper_queue', {
  id: serial('id').primaryKey(),
  signal_id: integer('signal_id').notNull(),
  signal_group: varchar('signal_group', { length: 50 }).notNull(), // 'default', 'btc', 'ai'
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, processing, completed, failed, rate_limited
  process_after: timestamp('process_after', { withTimezone: true }).defaultNow(),
  attempts: integer('attempts').default(0),
  response_message: text('response_message'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// A single, unified table for all forwarded signals
export const forwardedsignals = pgTable('forwardedsignals', {
  id: serial('id').primaryKey(),
  signal_id: integer('signal_id').notNull(),
  signal_group: varchar('signal_group', { length: 50 }).notNull(),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  response_code: integer('response_code'),
  response_message: text('response_message'),
});

// New rate limit status table
export const rateLimitStatus = pgTable('rate_limit_status', {
  id: serial('id').primaryKey(),
  is_limited: boolean('is_limited').default(false).notNull(),
  limited_until: timestamp('limited_until', { withTimezone: true }),
}); 