# StockPulse

Stock Pulse is a Visual Studio Code extension that allows users to track real-time stock price updates directly within the editor. It provides up-to-date stock information based on YahooFinance API, helping you stay informed on the latest market movements while programming in VS Code.

## Features

- **Search for Stock Information**: Prompt users for a stock ticker symbol (e.g., AAPL, MSFT) and fetch detailed stock data such as price, high/low, volume, and more.

- **Real-Time Price Updates**: Subscribe to stock price updates via WebSocket connection to Yahoo Finance. Get real-time changes on the status bar for stocks you're monitoring.

- **Interactive Stock Status Bar**: Display real-time stock price data directly in the status bar, with an automatic price update.

## How to Use

1. **Activate the Extension**: After installing the extension, activate it by running the command Stock Pulse: Show Stock in the VS Code Command Palette.
2. **Enter Ticker Symbo**l: You will be prompted to enter a stock ticker symbol (e.g., AAPL, MSFT). The extension will then fetch the stock’s current data from Yahoo Finance and display it.
3. **Real-Time Updates**: Once a ticker is selected, the extension will subscribe to real-time updates. The stock price will be displayed in the status bar, and the extension will update it as new pricing information is received.

## Requirements

- An active internet connection
- **Axios**
- **WebSocket**
- **ProtobufJS**

## Installation

```bash
npm install
```

## Extension Settings

This extension doesn’t contribute custom settings currently, but you can expect future updates that will allow more user customization for stock data displays and update intervals.

## Known Issues

- The extension may not work as expected if the Yahoo Finance API is down or if the user's internet connection is unstable.

## Release Notes

### 1.0.0

Initial release of StockPulse.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
