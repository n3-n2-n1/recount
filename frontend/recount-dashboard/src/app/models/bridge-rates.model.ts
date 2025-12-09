export interface BridgeRatesData {
  eur_usd: {
    buy: string;
    sell: string;
    mid: string;
    lastUpdate: Date;
  };
}

export interface BridgeRatesResponse {
  success: boolean;
  rates: BridgeRatesData;
  cached?: boolean;
  fallback?: boolean;
  message?: string;
  error?: string;
}