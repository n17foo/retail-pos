import { useState, useEffect, useCallback } from 'react';
import { returnService, RefundData, RefundResult, RefundRecord } from '../services/returns/ReturnService';
import { useLogger } from '../hooks/useLogger';
import { ECommercePlatform } from '../utils/platforms';

/**
 * Hook for return and refund operations in the POS system.
 * Uses the unified ReturnService which handles both returns and refunds.
 */
export function useReturns(platform?: ECommercePlatform) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const logger = useLogger('useReturns');

  // Initialize the refund subsystem within ReturnService
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const initialized = await returnService.initializeRefundService();

        setIsInitialized(initialized);
        if (!initialized) {
          setError('Failed to initialize returns service');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize returns service';
        logger.error({ message: 'Failed to initialize returns service' }, err instanceof Error ? err : new Error(errorMessage));
        setError(errorMessage);
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [logger]);

  /**
   * Process a refund for an e-commerce order
   */
  const processEcommerceRefund = useCallback(
    async (orderId: string, refundData: RefundData): Promise<RefundResult> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isInitialized) {
          logger.warn('Attempting to process e-commerce refund with uninitialized service');
          throw new Error('Returns service not initialized');
        }

        logger.info(`Processing e-commerce refund for order: ${orderId}`);

        const result = await returnService.processRefund(orderId, refundData, platform);

        if (!result.success) {
          const errorMessage = result.error || 'Failed to process e-commerce refund';
          logger.error({ message: `E-commerce refund failed: ${errorMessage}` });
          setError(errorMessage);
        } else {
          logger.info(`Successfully processed e-commerce refund for order: ${orderId}`);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process e-commerce refund';
        logger.error(
          { message: `Error processing e-commerce refund for order: ${orderId}` },
          err instanceof Error ? err : new Error(errorMessage)
        );
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
          timestamp: new Date(),
        };
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, platform, logger]
  );

  /**
   * Process a refund for a payment transaction
   */
  const processPaymentRefund = useCallback(
    async (transactionId: string, amount: number, reason?: string): Promise<RefundResult> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isInitialized) {
          logger.warn('Attempting to process payment refund with uninitialized service');
          throw new Error('Returns service not initialized');
        }

        logger.info(`Processing payment refund for transaction: ${transactionId}`);

        const result = await returnService.processPaymentRefund(transactionId, amount, reason);

        if (!result.success) {
          const errorMessage = result.error || 'Failed to process payment refund';
          logger.error({ message: `Payment refund failed: ${errorMessage}` });
          setError(errorMessage);
        } else {
          logger.info(`Successfully processed payment refund for transaction: ${transactionId}`);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process payment refund';
        logger.error(
          { message: `Error processing payment refund for transaction: ${transactionId}` },
          err instanceof Error ? err : new Error(errorMessage)
        );
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
          timestamp: new Date(),
        };
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, logger]
  );

  /**
   * Get refund history for an order
   */
  const getRefundHistory = useCallback(
    async (orderId: string): Promise<RefundRecord[]> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isInitialized) {
          logger.warn('Attempting to get refund history with uninitialized service');
          throw new Error('Returns service not initialized');
        }

        logger.info(`Retrieving refund history for order: ${orderId}`);

        return await returnService.getRefundHistory(orderId, platform);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get refund history';
        logger.error(
          { message: `Error retrieving refund history for order: ${orderId}` },
          err instanceof Error ? err : new Error(errorMessage)
        );
        setError(errorMessage);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, platform, logger]
  );

  return {
    isInitialized,
    isLoading,
    error,
    processEcommerceRefund,
    processPaymentRefund,
    getRefundHistory,
  };
}
