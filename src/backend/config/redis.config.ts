import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis configuration and client
 * Supports both REDIS_URL format and individual REDIS_HOST/PORT/PASSWORD env vars
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryStrategy: (times: number) => number | void;
}

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const cleanUrl = url.replace(/^redis:\/\//, '').replace(/^rediss:\/\//, '');
  
  let host = cleanUrl;
  let port = 6379;
  let password: string | undefined;

  if (cleanUrl.includes('@')) {
    const [auth, hostPart] = cleanUrl.split('@');
    host = hostPart;
    if (auth.includes(':')) {
      password = auth.split(':')[1];
    } else {
      password = auth;
    }
  }

  if (host.includes(':')) {
    const [hostPart, portPart] = host.split(':');
    host = hostPart;
    port = parseInt(portPart) || 6379;
  }

  return { host, port, password };
}

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const parsedUrl = redisUrl ? parseRedisUrl(redisUrl) : null;

// Debug logging to help diagnose connection issues
console.log('[Redis Config] Environment variables:', {
  REDIS_URL_SET: !!redisUrl,
  REDIS_URL_VALUE: redisUrl ? `${redisUrl.substring(0, 20)}...` : 'not set',
  REDIS_HOST_SET: !!redisHost,
  REDIS_HOST_VALUE: redisHost || 'not set',
  PARSED_HOST: parsedUrl?.host || 'not parsed',
  PARSED_PORT: parsedUrl?.port || 'not parsed',
});

export const redisConfig: RedisConfig = {
  host: parsedUrl?.host || process.env.REDIS_HOST || 'localhost',
  port: parsedUrl?.port || parseInt(process.env.REDIS_PORT || '6379'),
  password: parsedUrl?.password || process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'bmad:',
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const options: RedisOptions = {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      retryStrategy: redisConfig.retryStrategy,
    };
    
    redisClient = new Redis(options);

    redisClient.on('connect', () => {
      logger.info('Redis connected', { 
        host: redisConfig.host, 
        port: redisConfig.port 
      });
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error', { error: error.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};
