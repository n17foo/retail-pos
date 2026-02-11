import { useState, useCallback, useEffect } from 'react';
import { Product } from '../services/product/ProductServiceInterface';
import { OfflineProductService, offlineProductService } from '../services/product/platforms/OfflineProductService';

interface UseOfflineProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductById: (id: string) => Promise<Product | null>;
  clearAllProducts: () => Promise<void>;
  downloadMenu: () => Promise<{ products: Product[]; categories: any[] }>;
  setMenuUrl: (url: string) => Promise<void>;
  getLastSyncTime: () => Promise<Date | null>;
}

export const useOfflineProducts = (): UseOfflineProductsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await offlineProductService.getProducts({ limit: 1000 });
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = useCallback(
    async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
      setIsLoading(true);
      setError(null);
      try {
        const newProduct = await offlineProductService.createProduct(productData as Product);
        await loadProducts();
        return newProduct;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create product';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadProducts]
  );

  const updateProduct = useCallback(
    async (id: string, data: Partial<Product>): Promise<Product> => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await offlineProductService.updateProduct(id, data);
        await loadProducts();
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update product';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadProducts]
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await offlineProductService.deleteProduct(id);
        await loadProducts();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete product');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadProducts]
  );

  const getProductById = useCallback(async (id: string): Promise<Product | null> => {
    try {
      return await offlineProductService.getProductById(id);
    } catch (err) {
      console.error('Error getting product:', err);
      return null;
    }
  }, []);

  const clearAllProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await offlineProductService.clearLocalProducts();
      setProducts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadMenu = useCallback(async (): Promise<{ products: Product[]; categories: any[] }> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await offlineProductService.downloadMenu();
      await loadProducts();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download menu';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [loadProducts]);

  const setMenuUrl = useCallback(async (url: string): Promise<void> => {
    try {
      await offlineProductService.setMenuUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set menu URL');
      throw err;
    }
  }, []);

  const getLastSyncTime = useCallback(async (): Promise<Date | null> => {
    return await offlineProductService.getLastSyncTime();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    isLoading,
    error,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    clearAllProducts,
    downloadMenu,
    setMenuUrl,
    getLastSyncTime,
  };
};

export type { Product };
