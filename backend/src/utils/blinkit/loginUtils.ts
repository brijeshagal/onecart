import dotenv from 'dotenv';
import fs from 'fs';
import { Browser, Page } from 'puppeteer';
import readline from 'readline';
import { env } from '../../config/env';
import BrowserManager from '../BrowserManager';
import { setAddressOnPage } from './searchUtils';

dotenv.config();

const SESSION_FILE = 'session.json';

function waitForInput(prompt: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function saveSession(page: Page) {
  const cookies = await page.cookies();
  const localStorageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    const ls = (globalThis as any).localStorage as any;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key) data[key] = ls.getItem(key) || '';
    }
    return data;
  });

  fs.writeFileSync(
    SESSION_FILE,
    JSON.stringify({ cookies, localStorage: localStorageData }, null, 2)
  );
}

async function loadSession(page: Page) {
  if (!fs.existsSync(SESSION_FILE)) return false;

  const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));

  // Set cookies
  if (session.cookies) {
    await page.setCookie(...session.cookies);
  }

  // Set local storage
  await page.goto('https://blinkit.com', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (data: Record<string, string>) => {
      const ls = (globalThis as any).localStorage as any;
      for (const key in data) {
        ls.setItem(key, (data as any)[key]);
      }
    },
    session.localStorage as Record<string, string>
  );

  return true;
}

export async function loginUser(receiverAddress: string): Promise<{ page: Page; browser: Browser }> {
  const browser = await BrowserManager.initialize();
  const [page] = (await browser.pages()) as [Page];

  // Try loading session
  const sessionLoaded = await loadSession(page);

  await page.goto('https://blinkit.com', { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 4000));
  if (!sessionLoaded) {
    await setAddressOnPage(receiverAddress, page);

    // ---- LOGIN FLOW ----
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.waitForSelector('.ProfileButton__Container-sc-975teb-3');
    await page.click('.ProfileButton__Container-sc-975teb-3');
    await page.waitForSelector('.login-phone__input');
    await page.type('.login-phone__input', env.BLINKIT_PHONE || '');
    await page.keyboard.press('Enter');

    const otp = await waitForInput('Enter the OTP shown in the browser: ');
    await page.waitForSelector('.otp-input-container input');
    const otpContainer = await page.$('.otp-input-container');
    if (otpContainer) {
      const otpInputs = await otpContainer.$$('input');
      const otpChars = otp.split('');
      for (let i = 0; i < otpInputs.length && i < otpChars.length; i++) {
        if (otpInputs[i]) {
          await (otpInputs[i] as any).click();
          await (otpInputs[i] as any).type(otpChars[i] || '');
        }
      }
    }

    await saveSession(page);
    console.log('✅ Session saved!');
  } else {
    console.log('✅ Session loaded successfully!');
  }
  return { page, browser };
}
