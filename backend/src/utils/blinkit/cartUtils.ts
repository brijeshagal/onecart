import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'puppeteer';
import { ISimplifiedCartItem } from '../../models/Cart';
import { CheckoutCartResponse } from '../../types/checkout';
import { waitForSearchResults } from './searchUtils';

export async function addProductToCart(
  page: Page,
  cartItemData: ISimplifiedCartItem,
  quantity: number
): Promise<void> {
  const searchResultsPromise = waitForSearchResults(page, cartItemData.name);

  const searchUrl = new URL('https://blinkit.com/s/');
  searchUrl.searchParams.set('q', cartItemData.name);

  await page.goto(searchUrl.toString(), { waitUntil: 'networkidle2' });

  const searchResults = await searchResultsPromise;

  // Get the product ID from cart item
  const cartItemProductId = cartItemData.identityId;

  // Loop through search results to find matching product
  let matchingProduct = searchResults.some(searchResult => {
    const searchResultProductId = searchResult.data.identity.id;
    if (searchResultProductId === cartItemProductId) {
      return true;
    }
    return false;
  });
  if (!matchingProduct) {
    throw new Error(
      `Product not found in search results: "${cartItemData.name}" (ID: ${cartItemData.identityId}). Product may be discontinued or unavailable.`
    );
  }

  // Use Puppeteer to select the div with product ID
  await new Promise(resolve => setTimeout(resolve, 400));
  let productElement = await page.$(`[id="${cartItemProductId}"]`);
  if (!productElement) {
    throw new Error(
      `Product element not found for ID: ${cartItemProductId}. Product may be out of stock or unavailable.`
    );
  }
  console.log(`Found product element with ID: ${cartItemProductId}`);

  // Scroll the element into view
  await productElement.evaluate(el =>
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  const addButton = await productElement.$('div.tw-rounded-md.tw-bg-green-050');
  if (addButton) {
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    throw new Error(
      `ADD button not found for product ID: ${cartItemProductId}. Product may be out of stock or unavailable.`
    );
  }
  await productElement.dispose();
  productElement = await page.$(`[id="${cartItemProductId}"]`);
  if (!productElement) {
    throw new Error(
      `Product element disappeared during quantity increment for product ID: ${cartItemProductId}`
    );
  }
  for (let i = 1; i < quantity; i++) {
    const plusButton = await productElement.$(
      'button span.icon-plus.tw-inline-flex.tw-mr-2.tw-font-extrabold'
    );

    if (!plusButton) {
      throw new Error(
        `Plus button not found for quantity increment ${i} of product ID: ${cartItemProductId}`
      );
    }
    await plusButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export async function waitForCartResponse(
  page: Page,
  timeoutMs: number = 10000
): Promise<CheckoutCartResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const responseHandler = async (response: any) => {
      try {
        const url = response.url();

        // Check if this is the cart API response we're looking for
        if (
          !url.includes('/v6/cart/checkout') &&
          !url.includes('blinkit.com/v6/cart/checkout') &&
          !url.includes('/v5/carts') &&
          !url.includes('blinkit.com/v5/carts')
        ) {
          return;
        }

        console.log('🛒 Cart API response detected:', url);

        const json: CheckoutCartResponse = await response.json();

        // Save cart response to cache for debugging
        try {
          const cacheDir = path.join(process.cwd(), 'cache');
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          const cacheFile = path.join(cacheDir, 'cart-response.json');
          fs.writeFileSync(cacheFile, JSON.stringify(json, null, 2));
          console.log('💾 Cart response saved to cache');
        } catch (err) {
          console.warn('⚠️ Failed to cache cart response:', err);
        }

        cleanup();
        settled = true;
        resolve(json);
      } catch (err) {
        console.error('Error processing cart response:', err);
        // Continue listening for other responses
      }
    };

    const cleanup = () => {
      try {
        page.off('response', responseHandler);
      } catch (error) {
        console.warn('Error removing response listener:', error);
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      cleanup();
      console.warn('⚠️ Cart response timeout');
      reject(new Error('Cart response timeout'));
    }, timeoutMs);

    // Attach the response listener
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
