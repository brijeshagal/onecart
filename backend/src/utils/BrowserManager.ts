import { Browser, LaunchOptions, Page } from 'puppeteer';
import { launchBrowser } from './blinkit/browserUtils';

export class BrowserManager {
  private static browser: Browser | null = null;

  static async initialize(
    options: LaunchOptions = {
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    }
  ): Promise<Browser> {
    if (!BrowserManager.browser) {
      BrowserManager.browser = await launchBrowser(options);

      // Listen for browser disconnect to reset state
      BrowserManager.browser.on('disconnected', () => {
        BrowserManager.resetState();
      });
    }
    return BrowserManager.browser;
  }

  static async getBrowser(): Promise<Browser> {
    if (!BrowserManager.browser) {
      console.log('🌐 Browser not initialized, auto-initializing...');
      await BrowserManager.initialize();
    }
    return BrowserManager.browser!;
  }

  static async createPage(): Promise<Page> {
    const browser = await BrowserManager.getBrowser();
    return await browser.newPage();
  }

  static async close(): Promise<void> {
    if (BrowserManager.browser) {
      await BrowserManager.browser.close();
      BrowserManager.browser = null;
    }
    BrowserManager.resetState();
  }

  private static resetState(): void {
    BrowserManager.browser = null;
  }
}

export default BrowserManager;
