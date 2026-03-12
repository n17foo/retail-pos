import { SquarespaceGiftCardService } from './SquarespaceGiftCardService';

// Mock the dependencies
jest.mock('../../secrets/SecretsService', () => ({
  __esModule: true,
  default: {
    getSecret: jest.fn(),
  },
}));

jest.mock('../../token/TokenUtils', () => ({
  getPlatformToken: jest.fn(),
}));

jest.mock('../../token/TokenInitializer', () => ({
  TokenInitializer: {
    getInstance: jest.fn(() => ({
      initializePlatformToken: jest.fn().mockResolvedValue(true),
    })),
  },
}));

jest.mock('../../token/TokenIntegration', () => ({
  withTokenRefresh: jest.fn(),
}));

jest.mock('../../logger/LoggerFactory', () => ({
  LoggerFactory: {
    getInstance: jest.fn(() => ({
      createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })),
    })),
  },
}));

import { getPlatformToken } from '../../token/TokenUtils';
import { withTokenRefresh } from '../../token/TokenIntegration';

describe('SquarespaceGiftCardService', () => {
  let service: SquarespaceGiftCardService;
  const mockApiClient = {
    isInitialized: jest.fn(),
    initialize: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SquarespaceGiftCardService();
    (service as unknown as { apiClient: typeof mockApiClient }).apiClient = mockApiClient;

    (getPlatformToken as jest.Mock).mockResolvedValue('test-token');
    (withTokenRefresh as jest.Mock).mockImplementation(async (platform, fn) => fn());
    mockApiClient.isInitialized.mockReturnValue(true);
    mockApiClient.initialize.mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();
      expect(result).toBe(true);
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('checkBalance', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return balance for valid gift card', async () => {
      const mockCard = {
        id: 'card-1',
        code: 'TEST100',
        balance: { value: '65.00', currency: 'USD' },
        status: 'ACTIVE',
      };
      mockApiClient.get.mockResolvedValue(mockCard);

      const result = await service.checkBalance('TEST100');

      expect(result).toEqual({
        code: 'TEST100',
        balance: 65,
        currency: 'USD',
        status: 'active',
      });
    });

    it('should handle redeemed gift cards', async () => {
      const mockCard = {
        id: 'card-1',
        code: 'REDEEMED',
        balance: { value: '0.00', currency: 'USD' },
        status: 'REDEEMED',
      };
      mockApiClient.get.mockResolvedValue(mockCard);

      const result = await service.checkBalance('REDEEMED');
      expect(result.status).toBe('disabled');
    });
  });

  describe('redeemGiftCard', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should simulate redemption successfully', async () => {
      const mockCard = {
        id: 'card-1',
        code: 'TEST100',
        balance: { value: '100.00', currency: 'USD' },
        status: 'ACTIVE',
      };
      mockApiClient.get.mockResolvedValue(mockCard);

      const result = await service.redeemGiftCard('TEST100', 35);

      expect(result).toEqual({
        success: true,
        amountDeducted: 35,
        remainingBalance: 65,
      });
    });

    it('should reject redemption when balance is insufficient', async () => {
      const mockCard = {
        id: 'card-1',
        code: 'TEST100',
        balance: { value: '20.00', currency: 'USD' },
        status: 'ACTIVE',
      };
      mockApiClient.get.mockResolvedValue(mockCard);

      const result = await service.redeemGiftCard('TEST100', 40);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });
  });
});
