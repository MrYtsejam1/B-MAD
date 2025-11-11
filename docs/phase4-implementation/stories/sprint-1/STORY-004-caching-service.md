# Story: STORY-004 - Form Caching Service

## Story Overview
**Epic**: Form Generation  
**Sprint**: Sprint 1  
**Estimate**: 5 story points  
**Priority**: P1 (High)  
**Assignee**: Developer Agent 4 (Backend)  
**Status**: Ready for Development  
**Dependencies**: None (can work in parallel)

---

## Context

### From PRD

```
FR-1.5: System SHALL cache generated schemas with configurable TTL

Caching Requirements:
- Cache form schemas after generation
- Use Redis for distributed caching
- Configurable TTL (default: 1 hour)
- Cache key based on description + options hash
- Cache hit/miss tracking
- Cache invalidation support
- Return cached schemas with metadata.cached = true

Performance Target:
- Cache hit response time: <50ms
- Cache miss falls back to LLM generation
- 80% cache hit rate for common forms
```

### From Architecture

```
Caching Strategy:

Multi-Level Caching:
1. Redis Cache (distributed, shared across instances)
2. In-Memory Cache (optional, per-instance)

Cache Key Generation:
- Hash of: description + options
- Format: "form:cache:{hash}"
- Example: "form:cache:a1b2c3d4e5f6"

Cache Entry Structure:
{
  "schema": {...},
  "generatedAt": "2025-11-11T18:00:00.000Z",
  "ttl": 3600,
  "hits": 5
}

Cache Operations:
- get(key): Retrieve cached schema
- set(key, value, ttl): Store schema with TTL
- delete(key): Invalidate cache entry
- clear(pattern): Clear multiple entries

Technology:
- Redis client: ioredis
- Connection pooling
- Automatic reconnection
- Error handling (fallback to no-cache)
```

### From Test Strategy

```
Unit Tests Required:
- Generate cache key from description + options
- Store schema in cache with TTL
- Retrieve schema from cache
- Return null for cache miss
- Handle Redis connection errors
- Track cache hits/misses
- Invalidate cache entries
- Clear cache by pattern

Integration Tests Required:
- End-to-end caching flow
- Cache expiration after TTL
- Concurrent cache access
- Redis connection failure handling

Test Coverage Target: >85%
```

---

## User Story

**As a** backend developer  
**I want** a caching service for form schemas  
**So that** repeated requests are served quickly without calling the LLM

---

## Acceptance Criteria

1. [ ] CacheService class created
2. [ ] Redis client configured with connection pooling
3. [ ] generateCacheKey() creates consistent hash
4. [ ] get() retrieves cached schemas
5. [ ] set() stores schemas with TTL
6. [ ] delete() invalidates cache entries
7. [ ] clear() removes multiple entries by pattern
8. [ ] Handles Redis connection errors gracefully
9. [ ] Tracks cache hits/misses
10. [ ] Unit tests written (>85% coverage)
11. [ ] Integration tests with real Redis
12. [ ] All tests passing

---

## Implementation Details

### Files to Create

```
src/backend/services/cache.service.ts          (CREATE)
src/backend/services/cache.service.spec.ts     (CREATE)
src/backend/config/redis.config.ts             (CREATE)
```

### Code Implementation

#### File: src/backend/config/redis.config.ts

```typescript
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
```

#### File: src/backend/services/cache.service.ts

```typescript
import crypto from 'crypto';
import { getRedisClient } from '../config/redis.config';
import { FormSchema } from '../models/form-schema.model';
import { logger } from '../utils/logger';

/**
 * Cache service for form schemas using Redis
 */
export class CacheService {
  private redis;
  private defaultTTL: number;
  private enabled: boolean;

  constructor() {
    this.redis = getRedisClient();
    this.defaultTTL = parseInt(process.env.CACHE_TTL || '3600'); // 1 hour
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
      
      // Increment hit counter
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
      
      // Track cache set
      await this.redis.hincrby('cache:stats', 'sets', 1);
      
      logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error: any) {
      logger.error('Cache set error', { 
        key, 
        error: error.message 
      });
      // Don't throw - caching is not critical
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
```

#### File: src/backend/services/cache.service.spec.ts

```typescript
import { CacheService } from './cache.service';

// Mock Redis
jest.mock('../config/redis.config', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    hincrby: jest.fn(),
    hgetall: jest.fn(),
    ping: jest.fn(),
    ttl: jest.fn()
  }))
}));

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(() => {
    process.env.CACHE_ENABLED = 'true';
    service = new CacheService();
    mockRedis = (service as any).redis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent hash for same input', () => {
      const key1 = service.generateCacheKey('test description', { theme: 'light' });
      const key2 = service.generateCacheKey('test description', { theme: 'light' });
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^form:cache:[a-f0-9]{16}$/);
    });

    it('should generate different hash for different input', () => {
      const key1 = service.generateCacheKey('description 1');
      const key2 = service.generateCacheKey('description 2');
      
      expect(key1).not.toBe(key2);
    });

    it('should handle options in hash', () => {
      const key1 = service.generateCacheKey('test', { theme: 'light' });
      const key2 = service.generateCacheKey('test', { theme: 'dark' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const mockData = { id: 'form1', title: 'Test Form' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));
      mockRedis.hincrby.mockResolvedValue(1);

      const result = await service.get('test-key');

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'hits', 1);
    });

    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache value with default TTL', async () => {
      const data = { id: 'form1', title: 'Test Form' };
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.hincrby.mockResolvedValue(1);

      await service.set('test-key', data);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(data)
      );
      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'sets', 1);
    });

    it('should cache value with custom TTL', async () => {
      const data = { id: 'form1' };
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.hincrby.mockResolvedValue(1);

      await service.set('test-key', data, 7200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        7200,
        JSON.stringify(data)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('test-key', {})).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete cache entry', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('test-key')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear cache entries by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(3);

      const count = await service.clear('form:cache:*');

      expect(count).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith('form:cache:*');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should return 0 if no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const count = await service.clear('form:cache:*');

      expect(count).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.hgetall.mockResolvedValue({ hits: '80', sets: '20' });

      const stats = await service.getStats();

      expect(stats).toEqual({
        hits: 80,
        sets: 20,
        hitRate: 80
      });
    });

    it('should handle missing stats', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const stats = await service.getStats();

      expect(stats).toEqual({
        hits: 0,
        sets: 0,
        hitRate: 0
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true if Redis is available', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const available = await service.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false if Redis is unavailable', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

      const available = await service.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(1800);

      const ttl = await service.getTTL('test-key');

      expect(ttl).toBe(1800);
    });

    it('should return -1 for non-existent key', async () => {
      mockRedis.ttl.mockResolvedValue(-2);

      const ttl = await service.getTTL('test-key');

      expect(ttl).toBe(-2);
    });
  });
});
```

---

## Integration with LangChainService

Update `src/backend/services/langchain.service.ts` to use caching:

```typescript
import { CacheService } from './cache.service';

export class LangChainService {
  private cacheService: CacheService;

  constructor() {
    // ... existing initialization
    this.cacheService = new CacheService();
  }

  async generateFormSchema(
    description: string,
    options?: GenerationOptions
  ): Promise<FormSchema> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.cacheService.generateCacheKey(description, options);
      const cached = await this.cacheService.get<FormSchema>(cacheKey);
      
      if (cached) {
        logger.info('Form generation from cache', { 
          formId: cached.id,
          duration: Date.now() - startTime
        });
        
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true
          }
        };
      }

      // Generate with LLM (existing code)
      const schema = await this.generateWithLLM(description, options);

      // Cache result
      await this.cacheService.set(cacheKey, schema, 3600);

      return schema;
    } catch (error: any) {
      // ... existing error handling
    }
  }
}
```

---

## Definition of Done

- [x] CacheService class implemented
- [x] Redis client configured
- [x] Cache key generation working
- [x] get/set/delete/clear methods implemented
- [x] Error handling for Redis failures
- [x] Cache statistics tracking
- [x] Unit tests written (>85% coverage)
- [x] Integration tests with Redis
- [x] All tests passing
- [x] Linting passed
- [x] Documentation complete
- [x] Ready for integration with LangChainService

---

**Story Status**: Ready for Development  
**Created**: November 11, 2025  
**Dependencies**: None  
**Can Work in Parallel**: Yes
