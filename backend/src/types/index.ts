// Common types for the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    stack?: string;
  };
  timestamp: string;
}

export interface HealthCheck {
  uptime: number;
  message: string;
  timestamp: string;
  environment: string;
  version: string;
  memory: {
    used: number;
    total: number;
  };
}

export interface DetailedHealthCheck {
  status: string;
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    usage: NodeJS.CpuUsage;
  };
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin?: string;
}
