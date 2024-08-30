import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
        } catch (error) {
            console.error('Failed to initialize Yahoo Finance API:', error);
            throw new Error('Initialization failed');
        }
    }

    /**
     * Fetches the cookie required for making requests to the Yahoo Finance API.
     * @returns The cookie string.
     */
    private async fetchCookie(): Promise<string> {
        try {
            const response: AxiosResponse = await this.axiosInstance.get(YAHOO_COOKIE_URL, {
                validateStatus: this.isValidResponse,
                headers: {
                    'User-Agent': USER_AGENT,
                },
            });

            return this.extractCookie(response);
        } catch (error) {
            this.handleError('Failed to fetch cookie', error);
        }
    }

    /**
     * Extracts the cookie from the response headers.
     * @param response - The Axios response object.
     * @returns The extracted cookie string.
     */
    private extractCookie(response: AxiosResponse): string {
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

        try {
            const response: AxiosResponse = await this.axiosInstance.get(YAHOO_CRUMB_URL, {
                headers: {
                    Cookie: this.cookie,
                    'User-Agent': USER_AGENT,
                },
            });

            return this.extractCrumb(response);
        } catch (error) {
            this.handleError('Failed to fetch crumb', error);
        }
    }

    /**
     * Extracts the crumb from the response.
     * @param response - The Axios response object.
     * @returns The extracted crumb string.
     */
    private extractCrumb(response: AxiosResponse): string {
        if (response.status !== 200) {
            throw new Error('Failed to get crumb');
        }
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

        try {
            const quoteResponse: AxiosResponse = await this.fetchTickerQuote(symbol);

            if (quoteResponse.status === 404) {
                console.warn(`Quote not found for ticker symbol: ${symbol}`);
                return null;
            }

            const priceResponse: AxiosResponse = await this.fetchTickerPrice(symbol);

            return this.parseStockInformation(quoteResponse, priceResponse, symbol);
        } catch (error) {
            this.handleError('Failed to fetch quote', error);
        }
    }

    /**
     * Fetches stock data from the Yahoo Finance API.
     * @param symbol - The stock ticker symbol.
     * @returns The Axios response object.
     */
    private async fetchTickerQuote(symbol: string): Promise<AxiosResponse> {
        const url = `${YAHOO_QUOTE_URL}${symbol}`;
        return this.axiosInstance.get(url, {
            headers: {
                Cookie: this.cookie,
            },
            params: {
                crumb: this.crumb,
                modules: 'quoteType,summaryDetail,assetProfile',
                corsDomain: 'finance.yahoo.com',
                formatted: 'false',
                symbol: symbol,
            },
            validateStatus: this.isValidResponse,
        });
    }

    /**
     * Fetches stock price data from the Yahoo Finance API.
     * @param symbol - The stock ticker symbol.
     * @returns The Axios response object.
     */
    private async fetchTickerPrice(symbol: string): Promise<AxiosResponse> {
        const url = `${YAHOO_PRICE_URL}${symbol}`;
        return this.axiosInstance.get(url, {
            params: {
                range: '1d',
                interval: '1d',
                includePrePost: 'false',
            },
            validateStatus: this.isValidResponse,
        });
    }

    /**
     * Parses the stock information from the Axios response.
     * @param response - The Axios response object.
     * @param symbol - The stock ticker symbol.
     * @returns The parsed StockInformation object.
     */
    private parseStockInformation(quoteResponse: AxiosResponse, priceResponse: AxiosResponse, symbol: string): StockInformation | null {
        let stockInformation: StockInformation;

        if (
            quoteResponse.status === 200 && quoteResponse.data?.quoteSummary?.result
            && priceResponse.status === 200 && priceResponse.data?.chart?.result
        ) {
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
                },
            };
        }

        throw new Error('Unexpected response format');
    }

    /**
     * Validates the response status code.
     * @param status - The HTTP status code.
     * @returns True if the status code is valid, false otherwise.
     */
    private isValidResponse(status: number): boolean {
        return status >= 200 && status < 300 || status === 404;
    }

    /**
     * Handles errors by logging them and rethrowing with a specific message.
     * @param message - The error message to log and throw.
     * @param error - The caught error.
     * @throws The error with the provided message.
     */
    private handleError(message: string, error: any): never {
        console.error(message, error);
        throw new Error(message);
    }
}

export default YahooFinance;