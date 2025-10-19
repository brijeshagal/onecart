import { Page } from 'puppeteer';
import { AddressData } from '../../types/address';
import { BlinkitProductResponse } from '../../types/cart';
/**
 * Utility function to wait for search results from Blinkit's search API
 * This function listens for network responses to the search endpoint and extracts results
 *
 * @param page - Puppeteer Page instance
 * @param query - Search query string
 * @param timeoutMs - Timeout in milliseconds (default: 4000ms)
 * @returns Promise that resolves with search results data
 */
export async function waitForSearchResults(
  page: Page,
  query: string,
  timeoutMs: number = 4000
): Promise<BlinkitProductResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const responseHandler = async (response: any) => {
      try {
        const url = response.url();
        if (!url.includes('/v1/layout/search')) return;

        // Basic guard to ensure we're looking at the right query context
        const firstToken = query.split(' ')[0];
        if (firstToken && !url.includes(firstToken)) {
          return;
        }

        const json: any = await response.json();
        const snippets = json?.response?.snippets ?? [];
        cleanup();
        settled = true;
        resolve(snippets);
      } catch (err) {
        // Swallow parsing errors for non-JSON responses
      }
    };

    const cleanup = () => {
      try {
        page.off('response', responseHandler);
      } catch {}
    };

    const timer = setTimeout(() => {
      if (settled) return;
      cleanup();
      console.warn('Search request timeout for query:', query);
      reject(new Error('Search request timeout'));
    }, timeoutMs);

    // attach
    page.on('response', responseHandler);

    // Ensure we clear timer on natural resolve/reject
    const originalResolve = resolve as any;
    const originalReject = reject as any;
    resolve = ((value: any) => {
      clearTimeout(timer);
      originalResolve(value);
    }) as any;
    reject = ((reason: any) => {
      clearTimeout(timer);
      originalReject(reason);
    }) as any;
  });
}

/**
 * Perform a complete Blinkit search by navigating to search URL and waiting for results
 * @param page - Puppeteer Page instance
 * @param query - Search query string
 * @returns Promise that resolves with search results data
 */
export async function performBlinkitSearch(
  page: Page,
  query: string
): Promise<BlinkitProductResponse> {
  const blinkitSearchPromise = waitForSearchResults(page, query);

  const searchUrl = new URL('https://blinkit.com/s/');
  searchUrl.searchParams.set('q', query);

  await page.goto(searchUrl.toString(), {
    waitUntil: 'networkidle2',
  });

  return await blinkitSearchPromise;
}

/**
 * Set delivery address on Blinkit using puppeteer automation.
 * Ensures subsequent searches are location-aware by updating the site address.
 */
export async function setAddressOnPage(
  suggestion: AddressData | string,
  page: Page,
  waitAfterMs: number = 500
): Promise<void> {
  try {
    // 1) Open the location selector
    await page.waitForSelector('.LocationBar__Container-sc-x8ezho-6');
    await page.click('.LocationBar__Container-sc-x8ezho-6');
    await page.waitForSelector('.LocationSearchBox__InputSelect-sc-1k8u6a6-0');
    await page.click('.LocationSearchBox__InputSelect-sc-1k8u6a6-0');

    // 2) Type the suggestion text
    const queryText =
      typeof suggestion === 'string'
        ? suggestion
        : suggestion.display_address ||
          suggestion.line1 ||
          suggestion.name ||
          '';

    if (queryText) {
      await page.type(
        '.LocationSearchBox__InputSelect-sc-1k8u6a6-0',
        queryText
      );
    }

    // Small wait for suggestions to populate
    await new Promise(resolve => setTimeout(resolve, 900));

    // 3) Pick the first suggestion from the list
    await page.waitForSelector('.address-container-v1');
    await page.click('.address-container-v1:first-child');

    // Allow UI to settle
    if (waitAfterMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitAfterMs));
    }
    // eslint-disable-next-line no-console
    console.log('Address successfully set and confirmed');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Address confirmation timeout, but continuing...', error);
  } finally {
    // Final small wait to reduce race conditions after selection
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
