import { env } from '../config/env';

/**
 * Configuration service that provides type-safe access to environment variables
 */
export class ConfigService {
  /**
   * Get the current environment
   */
  static getEnvironment(): string {
    return env.NODE_ENV;
  }

  /**
   * Check if we're in development mode
   */
  static isDevelopment(): boolean {
    return env.NODE_ENV === 'development';
  }

  /**
   * Check if we're in production mode
   */
  static isProduction(): boolean {
    return env.NODE_ENV === 'production';
  }

  /**
   * Check if we're in test mode
   */
  static isTest(): boolean {
    return env.NODE_ENV === 'test';
  }

  /**
   * Get the server port
   */
  static getPort(): number {
    return env.PORT;
  }

  /**
   * Get the CORS origin
   */
  static getCorsOrigin(): string {
    return env.CORS_ORIGIN;
  }

  /**
   * Get MongoDB URI (if configured)
   */
  static getMongoDbUri(): string | undefined {
    return env.MONGODB_URI;
  }

  /**
   * Get Redis URL (if configured)
   */
  static getRedisUrl(): string | undefined {
    return env.REDIS_URL;
  }

  /**
   * Get JWT secret (if configured)
   */
  static getJwtSecret(): string | undefined {
    return env.JWT_SECRET;
  }

  /**
   * Get JWT expiration time (if configured)
   */
  static getJwtExpiresIn(): string | undefined {
    return env.JWT_EXPIRES_IN;
  }

  /**
   * Get API version (if configured)
   */
  static getApiVersion(): string | undefined {
    return env.API_VERSION;
  }

  /**
   * Get API prefix (if configured)
   */
  static getApiPrefix(): string | undefined {
    return env.API_PREFIX;
  }
}
