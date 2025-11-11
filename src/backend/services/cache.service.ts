import crypto from 'crypto';
import { getRedisClient } from '../config/redis.config';
import { FormSchema } from '../models/form-schema.model';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

/**
 * Cache service for form schemas using Redis
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private enabled: boolean;

  constructor() {
    this.redis = getRedisClient();
    this.defaultTTL = parseInt(process.env.CACHE_TTL || '3600');
    this.enabled = process.env.CACHE_ENABLED !== 'false';
  }

  /**
   * Generate cache key from description and options
   */
  generateCacheKey(description: string, options?: any): string {
    const data = JSON.stringify({ description, options: options || {} });
    const hash = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
    
    return `form:cache:${hash}`;
  }

  /**
   * Get cached form schema
   */
  async get<T = FormSchema>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      
      if (!cached) {
        logger.debug('Cache miss', { key });
        return null;
      }

      const data = JSON.parse(cached);
      
      await this.redis.hincrby('cache:stats', 'hits', 1);
      
      logger.debug('Cache hit', { key });
      return data as T;
    } catch (error: any) {
      logger.error('Cache get error', { 
        key, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Set cached form schema with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const ttlSeconds = ttl || this.defaultTTL;
      const data = JSON.stringify(value);
      
      await this.redis.setex(key, ttlSeconds, data);
      
      await this.redis.hincrby('cache:stats', 'sets', 1);
      
      logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error: any) {
      logger.error('Cache set error', { 
        key, 
        error: error.message 
      });
    }
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.redis.del(key);
      logger.debug('Cache deleted', { key });
    } catch (error: any) {
      logger.error('Cache delete error', { 
        key, 
        error: error.message 
      });
    }
  }

  /**
   * Clear cache entries by pattern
   */
  async clear(pattern: string = 'form:cache:*'): Promise<number> {
    if (!this.enabled) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      
      logger.info('Cache cleared', { 
        pattern, 
        count: keys.length 
      });
      
      return keys.length;
    } catch (error: any) {
      logger.error('Cache clear error', { 
        pattern, 
        error: error.message 
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hits: number; sets: number; hitRate: number }> {
    if (!this.enabled) {
      return { hits: 0, sets: 0, hitRate: 0 };
    }

    try {
      const stats = await this.redis.hgetall('cache:stats');
      const hits = parseInt(stats.hits || '0');
      const sets = parseInt(stats.sets || '0');
      const total = hits + sets;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return { hits, sets, hitRate };
    } catch (error: any) {
      logger.error('Cache stats error', { error: error.message });
      return { hits: 0, sets: 0, hitRate: 0 };
    }
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    if (!this.enabled) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error: any) {
      logger.error('Cache TTL error', { 
        key, 
        error: error.message 
      });
      return -1;
    }
  }
}
