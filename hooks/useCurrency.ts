import { useMemo } from 'react';
import { useEcommerceSettings } from './useEcommerceSettings';
import { getCurrencySymbol } from '../utils/currency';

/**
 * Hook that returns the currency symbol for the currently configured currency.
 * Falls back to '£' (GBP) if no currency is configured.
 */
export const useCurrency = (): string => {
  const { ecommerceSettings } = useEcommerceSettings();

  const symbol = useMemo(() => {
    const code = ecommerceSettings?.offline?.currency || 'GBP';
    return getCurrencySymbol(code);
  }, [ecommerceSettings?.offline?.currency]);

  return symbol;
};
