import axios, { AxiosInstance, AxiosResponse } from 'axios';
import WebSocket from 'ws';
import StockInformation from './StockModel';

const YAHOO_COOKIE_URL = 'https://fc.yahoo.com/';
const YAHOO_CRUMB_URL = 'https://query1.finance.yahoo.com/v1/test/getcrumb';
const YAHOO_QUOTE_URL = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/';
const YAHOO_PRICE_URL = 'https://query2.finance.yahoo.com/v8/finance/chart/';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36';

export class YahooFinance {
    private cookie: string | null = null;
    private crumb: string | null = null;
    private axiosInstance: AxiosInstance;
    private webSocket: WebSocket | null = null;

    constructor() {
        this.axiosInstance = axios.create();
    }

    /**
     * Initializes the YahooFinance instance by fetching the required cookie and crumb values.
     */
    public async initialize(): Promise<void> {
        try {
            this.cookie = await this.fetchCookie();
            this.crumb = await this.fetchCrumb();
            console.log('YahooFinance initialized');
        } catch (error) {
            console.error('Failed to initialize Yahoo Finance API:', error);
            throw new Error('YahooFinance initialization failed');
        }
    }

    /**
     * Fetches the cookie required for making requests to the Yahoo Finance API.
     * @returns The cookie string.
     */
    private async fetchCookie(): Promise<string> {
        const response: AxiosResponse = await this.axiosInstance.get(YAHOO_COOKIE_URL, {
            validateStatus: (status) => status === 404,
            headers: {
                'User-Agent': USER_AGENT,
            },
        });

        return response.headers['set-cookie']?.[0] || '';
    }

    /**
     * Fetches the crumb value required for making requests to the Yahoo Finance API.
     * @returns The crumb string.
     */
    private async fetchCrumb(): Promise<string> {
        if (!this.cookie) {
            throw new Error('Cookie not set');
        }

        const response: AxiosResponse = await this.axiosInstance.get(YAHOO_CRUMB_URL, {
            headers: {
                Cookie: this.cookie,
                'User-Agent': USER_AGENT,
            },
        });

        return response.data;
    }

    /**
     * Retrieves stock information for the given ticker symbol.
     * @param symbol - The stock ticker symbol.
     * @returns The stock information or null if the symbol is not found.
     */
    public async getQuote(symbol: string): Promise<StockInformation | null> {
        if (!this.crumb || !this.cookie) {
            throw new Error('YahooFinance is not initialized. Call initialize() first.');
        }

        const quoteResponse: AxiosResponse = await this.fetchTickerQuote(symbol);

        if (quoteResponse.status === 404) {
            console.warn(`Quote not found for ticker symbol: ${symbol}`);
            return null;
        }

        const priceResponse: AxiosResponse = await this.fetchTickerPrice(symbol);

        return this.parseStockInformation(quoteResponse, priceResponse);
    }

    /**
     * YahooFinance API request
     * @param url - The URL to make the request to.
     * @param params - The request parameters.
     * @returns The Axios response object.
     */
    private async request(url: string, params: any): Promise<AxiosResponse> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                return await this.axiosInstance.get(url, {
                    headers: {
                        Cookie: this.cookie,
                        'User-Agent': USER_AGENT,
                    },
                    params: {
                        crumb: this.crumb,
                        ...params,
                    },
                    validateStatus: (status) => status >= 200 && status < 300 || status === 404,
                });
            } catch (error) {
                console.error(`Failed to fetch data. Retrying... (${attempts + 1}/${maxAttempts})`, error);
                await this.initialize();
                attempts++;
            }
        }

        throw new Error('Failed to fetch data after multiple attempts');
    }

    /**
     * Fetches stock data from the Yahoo Finance API.
     * @param symbol - The stock ticker symbol.
     * @returns The Axios response object.
     */
    private async fetchTickerQuote(symbol: string): Promise<AxiosResponse> {
        return await this.request(`${YAHOO_QUOTE_URL}${symbol}`, {
            modules: 'quoteType,summaryDetail,assetProfile',
            corsDomain: 'finance.yahoo.com',
            formatted: 'false',
            symbol: symbol,
        });
    }

    /**
     * Fetches stock price data from the Yahoo Finance API.
     * @param symbol - The stock ticker symbol.
     * @returns The Axios response object.
     */
    private async fetchTickerPrice(symbol: string): Promise<AxiosResponse> {
        return await this.request(`${YAHOO_PRICE_URL}${symbol}`, {
            range: '1d',
            interval: '1d',
            includePrePost: 'false',
        });
    }

    /**
     * Parses the stock information from the Axios response.
     * @param response - The Axios response object.
     * @param symbol - The stock ticker symbol.
     * @returns The parsed StockInformation object.
     */
    private parseStockInformation(quoteResponse: AxiosResponse, priceResponse: AxiosResponse): StockInformation {
        const quoteResult = quoteResponse.data.quoteSummary.result[0];
        const priceResult = priceResponse.data.chart.result[0];

        return {
            type: quoteResult.quoteType.quoteType,
            symbol: quoteResult.quoteType.symbol,
            name: quoteResult.quoteType.longName || quoteResult.quoteType.shortName || '',
            timezone: quoteResult.quoteType.timeZoneFullName || '',
            currency: quoteResult.summaryDetail.currency || null,
            exchange: priceResult.meta.fullExchangeName || priceResult.meta.exchangeName || null,
            sector: quoteResult.assetProfile?.sector || null,
            price: {
                current: priceResult.meta.regularMarketPrice || 0,
                day_high: quoteResult.summaryDetail.dayHigh || 0,
                day_low: quoteResult.summaryDetail.dayLow || 0,
                previous_close: quoteResult.summaryDetail.regularMarketPreviousClose || 0,
                day_volume: priceResult.meta.regularMarketVolume || 0,
                updated_at: new Date(priceResult.meta.regularMarketTime * 1000),
            },
        };
    }

    /**
     * Establishes a WebSocket connection to subscribe to live stock price updates.
     * @param ticker - The stock ticker to subscribe to.
     * @param onMessage - The callback function to handle incoming messages.
     */
    public subscribeToStockPrice(ticker: string, onMessage: (data: any) => void): void {
        if (this.webSocket) {
            this.webSocket.close();
        }

        this.webSocket = new WebSocket('wss://streamer.finance.yahoo.com/');

        this.webSocket.onopen = () => {
            this.webSocket?.send(JSON.stringify({ subscribe: [ticker] }));
        };

        this.webSocket.onmessage = onMessage;

        this.webSocket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        this.webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    /**
     * Dispose the YahooFinance instance and clean up resources.
     */
    public dispose(): void {
        if (this.webSocket) {
            this.webSocket.close();
        }

        console.log('YahooFinance disposed');
    }
}

export default YahooFinance;