// Global type declarations for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      CORS_ORIGIN?: string;
      DATABASE_URL?: string;
      REDIS_URL?: string;
      JWT_SECRET?: string;
      JWT_EXPIRES_IN?: string;
      API_VERSION?: string;
      API_PREFIX?: string;
    }
  }
}

// This makes the file a module
export {};
