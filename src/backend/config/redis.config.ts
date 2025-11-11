import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis configuration and client
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryStrategy: (times: number) => number | void;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
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
    redisClient = new Redis(redisConfig);

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
