/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/db.ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// 'db' is nu het object van de Neon driver waarop je .query() kunt aanroepen.
const db = neon(process.env.DATABASE_URL);

// ---------- Type Definities (onveranderd of voeg je types hier toe) --------
export type SimpleTradingViewSignal = {
  id: number;
  raw_data: any;
  received_at: string; // ISO-string
};

export interface ForwardedSignal {
  id: number;
  tradingview_signal_id: number | null;
  tradingview_payload: any;
  cryptohopper_payload: any;
  cryptohopper_response: any;
  status: 'SUCCESS' | 'FAILURE' | 'DB_LOG_FAILURE' | 'SKIPPED_API_BUSY'; // Zorg dat deze types alle mogelijke statussen dekken
  error_message: string | null;
  hopper_id: string;
  created_at: string; // ISO-string
  db_log_status?: 'DB_LOG_FAILURE'; // Optioneel als je dit specifiek wilt tracken
}

export interface QueuedSignal {
  id: number;
  payload: {
    original_tv_signal_id: number | null;
    hopper_id: string;
    access_token: string;
    payload_to_ch_api: any;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  error_message: string | null;
}

// ---------- Algemene Query Helper (Gebruikt .query()) ---------------------
/**
 * Voert een enkele SQL query uit.
 */
export async function executeQuery(
  queryText: string,
  params: any[] = [],
): Promise<any[]> { // Neon's .query() retourneert direct de array van rijen
  console.log('SQL:', queryText, 'PARAMS:', params);
  try {
    const rows = await db.query(queryText, params);
    return rows;
  } catch (e) {
    console.error('DB-error:', e);
    throw e;
  }
}

// ---------- Transactie Helper (Gebruikt .query() voor BEGIN/COMMIT/ROLLBACK) ---
/**
 * Voert een callback functie uit binnen een database transactie.
 * De callback ontvangt een `executeQueryInTransaction` functie om queries binnen de transactie uit te voeren.
 */
export async function executeTransaction<T>(
  callback: (executeQueryInTransaction: (queryText: string, params?: any[]) => Promise<any[]>) => Promise<T>,
): Promise<T> {
  console.log('Starting transaction...');
  await db.query('BEGIN');
  try {
    // Definieer een helper die binnen de transactie queries uitvoert
    const executeQueryInTransaction = async (queryText: string, params: any[] = []): Promise<any[]> => {
      console.log('SQL (Transaction):', queryText, 'PARAMS:', params);
      // Gebruikt dezelfde 'db' instantie; Neon handelt de transactiecontext af
      return db.query(queryText, params);
    };

    const result = await callback(executeQueryInTransaction);
    await db.query('COMMIT');
    console.log('Transaction committed.');
    return result;
  } catch (error) {
    console.error('Error in transaction, rolling back:', error);
    await db.query('ROLLBACK');
    console.log('Transaction rolled back.');
    throw error;
  }
}