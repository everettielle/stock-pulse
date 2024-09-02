import * as vscode from 'vscode';
import WebSocket from 'ws';
import * as protobuf from 'protobufjs';
import StockInformation from './StockModel';
import StockStatusBar from './StockStatusBar';
import YahooFinance from './YahooFinance';

let stockStatusBar: StockStatusBar | null = null;
let stockInformation: StockInformation;
let ws: WebSocket | null = null;
let PricingData: protobuf.Type = protobuf.parse(`
syntax = "proto3";

message PricingData {
	enum QuoteType {
		NONE = 0;
		ALTSYMBOL = 5;
		HEARTBEAT = 7;
		EQUITY = 8;
		INDEX = 9;
		MUTUALFUND = 11;
		MONEYMARKET = 12;
		OPTION = 13;
		CURRENCY = 14;
		WARRANT = 15;
		BOND = 17;
		FUTURE = 18;
		ETF = 20;
		COMMODITY = 23;
		ECNQUOTE = 28;
		CRYPTOCURRENCY = 41;
		INDICATOR = 42;
		INDUSTRY = 1000;
	};

	enum OptionType {
		CALL = 0;
		PUT = 1;
	};

	enum MarketHoursType {
		PRE_MARKET = 0;
		REGULAR_MARKET = 1;
		POST_MARKET = 2;
		EXTENDED_HOURS_MARKET = 3;
	};

	string id = 1;
	float price = 2;
	sint64 time = 3;
	string currency = 4;
	string exchange = 5;
	QuoteType quoteType = 6;
	MarketHoursType marketHours = 7;
	float changePercent = 8;
	sint64 dayVolume = 9;
	float dayHigh = 10;
	float dayLow = 11;
	float change = 12;
	string shortName = 13;
	sint64 expireDate = 14;
	float openPrice = 15;
	float previousClose = 16;
	float strikePrice = 17;
	string underlyingSymbol = 18;
	sint64 openInterest = 19;
	OptionType optionsType = 20;
	sint64 miniOption = 21;
	sint64 lastSize = 22;
	float bid = 23;
	sint64 bidSize = 24;
	float ask = 25;
	sint64 askSize = 26;
	sint64 priceHint = 27;
	sint64 vol_24hr = 28;
	sint64 volAllCurrencies = 29;
	string fromcurrency = 30;
	string lastMarket = 31;
	double circulatingSupply = 32;
	double marketcap = 33;
}
	`).root.lookupType('PricingData');

/**
 * Activate the extension
 * @param context - VSCode extension context
 */
export function activate(context: vscode.ExtensionContext) {
	// Load the Protobuf definitions on activation
	const disposable = vscode.commands.registerCommand('stock-pulse.showStock', async () => {
		const ticker = await promptForTicker();

		if (!ticker) {
			vscode.window.showErrorMessage('Ticker symbol is required to fetch stock information.');
			return;
		}

		const newStockInformation = await fetchStockInformation(ticker);
		
		if (!newStockInformation) {
			vscode.window.showErrorMessage(`Failed to fetch stock information for ${ticker}`);
			return;
		}

		stockInformation = newStockInformation;

		updateStockStatusBar(stockInformation);

		// Establish WebSocket connection and subscribe to live updates
		subscribeToStockPrice(ticker);
	});

	context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension and clean up resources
 */
export function deactivate() {
	if (stockStatusBar) {
		stockStatusBar.dispose();
	}
	if (ws) {
		ws.close();
	}
}

/**
 * Prompt the user to enter a stock ticker symbol
 * @returns The entered ticker symbol or undefined if input was canceled
 */
async function promptForTicker(): Promise<string | undefined> {
	return vscode.window.showInputBox({
		prompt: 'Enter a stock ticker symbol (e.g., AAPL, MSFT)',
		placeHolder: 'AAPL',
	});
}

/**
 * Fetch stock information for the given ticker symbol
 * @param ticker - The ticker symbol to fetch data for
 * @returns The StockInformation object or null if fetching failed
 */
async function fetchStockInformation(ticker: string): Promise<StockInformation | null> {
	try {
		const yahooFinance = new YahooFinance();
		await yahooFinance.initialize();

		const stockInformation = await yahooFinance.getQuote(ticker.toUpperCase());
		return stockInformation;
	} catch (error) {
		console.error(`Failed to fetch stock information: ${error}`);
		return null;
	}
}

/**
 * Update the status bar with the fetched stock information
 * @param stockInformation - The stock information to display
 */
function updateStockStatusBar(stockInformation: StockInformation): void {
	if (!stockStatusBar) {
		stockStatusBar = new StockStatusBar();
	}

	stockStatusBar.setStockSymbol(stockInformation);
	stockStatusBar.setStockPrice(stockInformation);
	stockStatusBar.blinkIndicator();
}

/**
 * Establishes a WebSocket connection to subscribe to live stock price updates
 * @param ticker - The stock ticker to subscribe to
 */
function subscribeToStockPrice(ticker: string): void {
	// Close existing WebSocket connection if any
	if (ws) {
		ws.close();
	}

	// Create a new WebSocket connection
	ws = new WebSocket('wss://streamer.finance.yahoo.com/');

	ws.on('open', () => {
		// Subscribe to the selected ticker
		ws?.send(JSON.stringify({ subscribe: [ticker] }));
	});

	ws.on('message', (data: any) => {
		try {
			const binaryString = atob(data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			let content = PricingData.decode(bytes).toJSON();

			if (!stockInformation) {
				console.error('Stock information is not available');
				return;
			}
	
			// Update the status bar with the new price
			if (stockStatusBar && content.id === ticker) {
				stockInformation.price.current = content.price;
				stockInformation.price.day_high = content.dayHigh || stockInformation.price.day_high;
				stockInformation.price.day_low = content.dayLow || stockInformation.price.day_low;
				stockInformation.price.day_volume = content.dayVolume || stockInformation.price.day_volume;
				stockInformation.price.updated_at = new Date(parseInt(content.time));

				stockStatusBar.setStockPrice(stockInformation);
				stockStatusBar.blinkIndicator();
			}
		} catch (error) {
			console.error('Failed to process WebSocket message:', error);
		}
	});

	ws.on('error', (error: any) => {
		console.error('WebSocket error:', error);
	});
}
