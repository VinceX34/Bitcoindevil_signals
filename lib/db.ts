/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/db.ts
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// We slaan de verbinding hier op nadat deze voor het eerst is gemaakt.
let dbInstance: NeonQueryFunction<false, false> | null = null;

// Een "getter" functie die de verbinding opzet als deze nog niet bestaat.
function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      // Deze fout wordt nu pas gegooid als de variabele echt mist tijdens runtime.
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    console.log('Creating new Neon DB connection instance.');
    dbInstance = neon(process.env.DATABASE_URL);
  }
  return dbInstance;
}

// ---------- Type Definities (onveranderd) --------
export type SimpleTradingViewSignal = {
  id: number;
  raw_data: any;
  received_at: string; // ISO-string
  signal_group?: 'default' | 'btc' | 'ai';
  status?: 'new' | 'queued' | 'error';
};

export interface ForwardedSignal {
  id: number;
  tradingview_signal_id: number | null;
  task_sub_id: number | null;
  http_status_code: number | null;
  tradingview_payload: any;
  cryptohopper_payload: any;
  cryptohopper_response: any;
  status: 'SUCCESS' | 'FAILURE' | 'DB_LOG_FAILURE' | 'SKIPPED_API_BUSY';
  error_message: string | null;
  hopper_id: string;
  exchange_name: string;
  created_at: string;
  db_log_status?: 'DB_LOG_FAILURE';
}

export interface QueuedSignalPayload {
  original_tv_signal_id: number | null;
  task_sub_id: number;
  hopper_id: string;
  exchange_name: string;
  access_token: string;
  payload_to_ch_api: any;
}

export interface QueuedSignal {
  id: number;
  payload: QueuedSignalPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rate_limited';
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  error_message: string | null;
}

export interface WealthSnapshot {
  id: number;
  snapshot_at: string;
  total_value_usd: number;
}

// ---------- Algemene Query Helper (aangepast) ---------------------
/**
 * Voert een enkele SQL query uit.
 */
export async function executeQuery(
  queryText: string,
  params: any[] = [],
): Promise<any[]> {
  const db = getDb(); // Haal de verbinding op
  console.log('SQL:', queryText, 'PARAMS:', params);
  try {
    const rows = await db.query(queryText, params);
    return rows;
  } catch (e) {
    console.error('DB-error:', e);
    throw e;
  }
}

// ---------- Transactie Helper (aangepast) ---
/**
 * Voert een callback functie uit binnen een database transactie.
 */
export async function executeTransaction<T>(
  callback: (executeQueryInTransaction: (queryText: string, params?: any[]) => Promise<any[]>) => Promise<T>,
): Promise<T> {
  const db = getDb(); // Haal de verbinding op
  console.log('Starting transaction...');
  await db.query('BEGIN');
  try {
    // Definieer een helper die binnen de transactie queries uitvoert
    const executeQueryInTransaction = async (queryText: string, params: any[] = []): Promise<any[]> => {
      console.log('SQL (Transaction):', queryText, 'PARAMS:', params);
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