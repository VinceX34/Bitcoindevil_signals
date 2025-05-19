/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/db.ts
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env-var ontbreekt (.env.local)');
}

const sql: NeonQueryFunction<false, false> = neon(process.env.DATABASE_URL);

export type SimpleTradingViewSignal = {
  id: number;
  raw_data: any;
  received_at: string;          // ISO-string
};

// ---------- query helper --------------------------------------------------
export async function executeQuery(
  query: string,
  params: any[] = [],
): Promise<any[]> {
  console.log('SQL:', query, 'PARAMS:', params);
  try {
    const rows = await sql.query(query, params);
    return rows;
  } catch (e) {
    console.error('DB-error:', e);
    throw e;
  }
}

// ---------- extra type voor forwarded_signals -----------------------------
export interface ForwardedSignal {
  id: number;
  tradingview_signal_id: number | null;
  tradingview_payload: any;
  cryptohopper_payload: any;
  cryptohopper_response: any;
  status: 'SUCCESS' | 'FAILURE';
  error_message: string | null;
  hopper_id: string;
  created_at: string;            // ISO-string
}
