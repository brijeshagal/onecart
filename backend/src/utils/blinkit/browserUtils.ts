import puppeteer, { Browser, BrowserContext, LaunchOptions, Page } from 'puppeteer';
import { env } from '../../config/env';

export async function launchBrowser(
  options: LaunchOptions = {
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  }
): Promise<Browser> {
  const isLocal = env.NODE_ENV === 'development';
  const launchOptions: LaunchOptions = isLocal
    ? options
    : {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-geolocation',
          '--use-fake-ui-for-media-stream',
        ],
      };
  const browser = await puppeteer.launch(launchOptions);
  return browser;
}

export async function createIncognitoPage(
  browser: Browser,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  return { page, context };
}
