import puppeteer, { Browser, LaunchOptions, Page } from "puppeteer";
import { env } from "../config/env";

export class BrowserManager {
  private static browser: Browser | null = null;

  static async initialize(
    options: LaunchOptions = {
      headless: false,
      defaultViewport: null,
      args: ["--start-maximized"],
    }
  ): Promise<Browser> {
    if (!BrowserManager.browser) {
      const isLocal = env.NODE_ENV === 'development';
      const launchOptions: LaunchOptions = isLocal ? options : { 
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-geolocation",
          "--use-fake-ui-for-media-stream",
        ],
      };
      BrowserManager.browser = await puppeteer.launch(launchOptions);

      // Listen for browser disconnect to reset state
      BrowserManager.browser.on("disconnected", () => {
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
