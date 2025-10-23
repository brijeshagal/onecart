import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define the shape of our environment variables
interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGIN: string;
  MONGODB_URI: string;
  REDIS_URL?: string | undefined;
  JWT_SECRET?: string | undefined;
  JWT_EXPIRES_IN?: string | undefined;
  API_VERSION?: string | undefined;
  API_PREFIX?: string | undefined;
  RZPAY_TEST_KEY_ID?: string | undefined;
  RZPAY_TEST_KEY_SECRET?: string | undefined;
  BLINKIT_PHONE?: string | undefined;
}

// Type-safe environment variable getter
function getEnvVar(key: keyof Environment): string | undefined {
  return process.env[key as string];
}

// Type-safe environment variable getter with default
function getEnvVarWithDefault<T>(key: keyof Environment, defaultValue: T): string | T {
  return process.env[key as string] || defaultValue;
}

// Validate required environment variables
function validateEnv(): void {
  const requiredVars: (keyof Environment)[] = ['NODE_ENV'];

  for (const varName of requiredVars) {
    if (!process.env[varName as string]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
}

// Parse and validate environment variables
const parseEnv = (): Environment => {
  validateEnv();

  return {
    NODE_ENV: (process.env['NODE_ENV'] as Environment['NODE_ENV']) || 'development',
    PORT: parseInt(process.env['PORT'] || '3000', 10),
    CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    MONGODB_URI: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/onecart',
    REDIS_URL: process.env['REDIS_URL'] || undefined,
    JWT_SECRET: process.env['JWT_SECRET'] || undefined,
    JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || undefined,
    API_VERSION: process.env['API_VERSION'] || undefined,
    API_PREFIX: process.env['API_PREFIX'] || undefined,
    RZPAY_TEST_KEY_ID: process.env['RZPAY_TEST_KEY_ID'] || undefined,
    RZPAY_TEST_KEY_SECRET: process.env['RZPAY_TEST_KEY_SECRET'] || undefined,
    BLINKIT_PHONE: process.env['BLINKIT_PHONE'] || undefined,
  };
};

// Export the parsed environment configuration
export const env = parseEnv();

// Export individual getters for convenience
export const getEnv = getEnvVar;
export const getEnvWithDefault = getEnvVarWithDefault;
