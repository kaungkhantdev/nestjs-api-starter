import { Test, TestingModule } from '@nestjs/testing';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockPrismaPg = jest.fn().mockImplementation(() => ({}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: mockPrismaPg,
}));

// Mock PrismaClient as a real class so PrismaService can extend it
jest.mock('generated/prisma/client', () => {
  class MockPrismaClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: unknown) {}
    $connect = mockConnect;
    $disconnect = mockDisconnect;
  }
  return { PrismaClient: MockPrismaClient };
});

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('constructor', () => {
    it('should throw when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;

      expect(() => new PrismaService()).toThrow(
        'DATABASE_URL environment variable is required',
      );
    });

    it('should instantiate successfully when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      expect(() => new PrismaService()).not.toThrow();
    });

    it('should pass the connection string to PrismaPg adapter', () => {
      const connectionString = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.DATABASE_URL = connectionString;

      new PrismaService();

      expect(mockPrismaPg).toHaveBeenCalledWith({ connectionString });
    });
  });

  describe('onModuleInit', () => {
    it('should call $connect on module init', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const module: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const service = module.get<PrismaService>(PrismaService);

      await service.onModuleInit();

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect on module destroy', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const module: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const service = module.get<PrismaService>(PrismaService);

      await service.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
