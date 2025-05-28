// API Response Types
export interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: unknown;
}

// Webhook Types
export interface WebhookPayload {
  strategy: {
    order_action: string;
    order_contracts: number;
    order_price: number;
    position_size: number;
    order_symbol: string;
    market_position: string;
    order_comment: string;
  };
  passphrase: string;
  time: string;
  exchange: string;
  ticker: string;
  bar: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

// CryptoHopper Types
export interface CryptoHopperPayload {
  order_type: string;
  market: string;
  amount: number;
  price?: number;
  comment?: string;
}

// Queue Types
export interface QueuePayload {
  original_tv_signal_id: number | null;
  hopper_id: string;
  access_token: string;
  payload_to_ch_api: CryptoHopperPayload;
}

// Error Types
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
} 