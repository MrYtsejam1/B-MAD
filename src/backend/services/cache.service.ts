import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

export class CacheService {
}
