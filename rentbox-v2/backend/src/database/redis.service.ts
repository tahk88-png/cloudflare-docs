import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService - Distributed cache and locking
 * 
 * Used for:
 * - Distributed locks to prevent race conditions
 * - Idempotency key storage
 * - Session caching
 * - Rate limiting counters
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB') || 0,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Acquire a distributed lock
   * 
   * Uses Redis SET NX with expiration for atomic lock acquisition.
   * This prevents double-booking race conditions when the database
   * exclusion constraint is the last line of defense.
   */
  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    
    const result = await this.client.set(
      lockKey,
      lockValue,
      'PX',
      ttlMs,
      'NX'
    );

    return result === 'OK';
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.client.del(lockKey);
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set a value with expiration
   */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  /**
   * Set a value without expiration
   */
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Increment a counter (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Set expiration on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(keys);
  }

  /**
   * Publish message to a channel (for real-time updates)
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  /**
   * Get the underlying Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
