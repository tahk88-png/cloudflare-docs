import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const logLevels: Prisma.LogLevel[] = 
      configService.get('NODE_ENV') === 'development' 
        ? ['query', 'warn', 'error'] 
        : ['warn', 'error'];

    super({
      log: logLevels.map(level => ({ emit: 'event', level })),
      errorFormat: 'pretty',
    });

    // Log slow queries in development
    if (configService.get('NODE_ENV') === 'development') {
      (this as any).$on('query', (e: any) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Execute a raw query with proper error handling
   */
  async executeRaw<T = unknown>(sql: string, ...values: unknown[]): Promise<T> {
    try {
      return await this.$queryRawUnsafe<T>(sql, ...values);
    } catch (error) {
      this.logger.error(`Raw query failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Execute operations in a transaction with automatic retries for deadlocks
   */
  async executeInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxRetries?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await this.$transaction(fn, {
          isolationLevel: options?.isolationLevel ?? Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (error: any) {
        attempt++;
        
        // Retry on deadlock or serialization failure
        const isRetryable = 
          error.code === 'P2034' || // Prisma transaction conflict
          error.code === '40001' || // PostgreSQL serialization_failure
          error.code === '40P01';   // PostgreSQL deadlock_detected

        if (isRetryable && attempt < maxRetries) {
          this.logger.warn(`Transaction retry ${attempt}/${maxRetries} due to: ${error.code}`);
          await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw new Error('Transaction failed after max retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
