export interface StockInformation {
    type: string;
    symbol: string;
    name: string;
    timezone: string;
    currency: string | null;
    exchange: string | null;
    sector: string | null;
    price: StockPriceData;
}

export interface StockPriceData {
    current: number;
    day_high: number;
    day_low: number;
    previous_close: number;
}

export default StockInformation;
