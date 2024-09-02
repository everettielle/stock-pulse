import * as vscode from 'vscode';
import { StockInformation } from './StockModel';

export class StockStatusBar {
    private stockSymbolItem: vscode.StatusBarItem;
    private stockPriceItem: vscode.StatusBarItem;

    private currencySymbolsMap: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'INR': '₹',
        'RUB': '₽',
        'KRW': '₩',
    };

    private static readonly PRIORITY = 100;

    constructor() {
        this.stockSymbolItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, StockStatusBar.PRIORITY);
        this.stockPriceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, StockStatusBar.PRIORITY - 1);

        this.stockSymbolItem.text = '$(graph) -';
        this.stockPriceItem.text = '- (-%) $(circle-outline)';

        this.show();
    }

    /**
     * Sets the stock symbol in the status bar.
     * @param stockSymbol - The stock symbol to display.
     */
    public setStockSymbol(stockInformation: StockInformation): void {
        this.stockSymbolItem.text = `$(graph) ${stockInformation.symbol}`;
        this.stockSymbolItem.tooltip = new vscode.MarkdownString(`### ${stockInformation.name}\n${stockInformation.exchange} / ${stockInformation.currency}\n\n * Sector: ${stockInformation.sector}\n * Timezone: ${stockInformation.timezone}\n * Previous Close: ${stockInformation.price.previous_close.toFixed(2)}`);
        this.show(); // Ensure all items are visible when updated
    }

    /**
     * Sets the stock price and percentage change in the status bar.
     * @param currency - The currency code for the stock price.
     * @param price - The current stock price.
     * @param percent - The percentage change in the stock price.
     */
    public setStockPrice(stockInformation: StockInformation): void {
        const price = stockInformation.price;
        const priceText = price.current.toFixed(2);

        const percent = (price.current / price.previous_close * 100) - 100;
        const percentText = percent > 0 ? `+${percent.toFixed(2)}` : percent.toFixed(2);

        const currency = stockInformation.type === 'INDEX' ? '' : this.currencySymbolsMap[stockInformation.currency || ''] || stockInformation.currency;

        this.stockPriceItem.text = `${currency}${priceText} (${percentText}%) $(circle-outline)`;
        this.stockPriceItem.tooltip = new vscode.MarkdownString(`* Day Range: ${stockInformation.price.day_low.toFixed(2)} - ${stockInformation.price.day_high.toFixed(2)}\n* Day Volume: ${stockInformation.price.day_volume || '-'}\n* Updated At: ${stockInformation.price.updated_at?.toLocaleTimeString()}`);
        this.show(); // Ensure all items are visible when updated
    }

    /**
     * Blinks the indicator to signal an update.
     */
    public blinkIndicator(): void {
        this.stockPriceItem.text = this.stockPriceItem.text.replace('$(circle-outline)', '$(circle-filled)');
        setTimeout(() => {
            this.stockPriceItem.text = this.stockPriceItem.text.replace('$(circle-filled)', '$(circle-outline)');
        }, 100);
    }

    /**
     * Shows all status bar items to ensure they appear as a unified group.
     */
    public show(): void {
        this.stockSymbolItem.show();
        this.stockPriceItem.show();
    }

    /**
     * Hides all status bar items.
     */
    public hide(): void {
        this.stockSymbolItem.hide();
        this.stockPriceItem.hide();
    }

    /**
     * Disposes of the status bar items to free up resources.
     */
    public dispose(): void {
        this.stockSymbolItem.dispose();
        this.stockPriceItem.dispose();
    }
}

export default StockStatusBar;