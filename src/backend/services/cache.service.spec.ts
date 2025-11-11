import { CacheService } from './cache.service';

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
