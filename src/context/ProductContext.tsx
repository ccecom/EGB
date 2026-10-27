import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import api from '../services/api';

export interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  inventory: number;
  category: 'rooster' | 'hen' | 'chick' | string;
  badge?: string | null;
  sizes: string[];
  colors: string[];
  images: string[];
  specifications: Record<string, any>;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product>;
  createProduct: (productData: Partial<Product>) => Promise<Product>;
  updateProduct: (
    id: string,
    productData: Partial<Product>
  ) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

const PRODUCTS_ENDPOINT = '/api/v1/products';

export const ProductContext = createContext<
  ProductContextType | undefined
>(undefined);

const extractErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;

  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item: any) => item.msg || '').join(', ');
  }
  if (typeof data?.message === 'string') return data.message;
  if (typeof error?.message === 'string') return error.message;

  return fallback;
};

const unwrapResponse = (responseData: any): any => {
  let data = responseData?.data ?? responseData ?? {};

  if (data?.data && !data?.product && !data?.products) {
    data = data.data;
  }

  return data;
};

const normalizeProduct = (product: any, fallbackId = ''): Product => {
  const id = String(product?._id ?? product?.id ?? fallbackId);

  return {
    ...product,
    _id: id,
    id,
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: Number(product?.price) || 0,
    compare_at_price:
      product?.compare_at_price == null
        ? null
        : Number(product.compare_at_price),
    sku: product?.sku ?? '',
    inventory: Number(
      product?.inventory ?? product?.stock ?? product?.quantity ?? 0
    ),
    category: product?.category ?? 'chick',
    badge: product?.badge ?? null,
    sizes: Array.isArray(product?.sizes) ? product.sizes : [],
    colors: Array.isArray(product?.colors) ? product.colors : [],
    images: Array.isArray(product?.images)
      ? product.images
      : product?.image
        ? [product.image]
        : [],
    specifications:
      product?.specifications &&
      typeof product.specifications === 'object'
        ? product.specifications
        : {},
    status: product?.status ?? 'active',
    created_at: product?.created_at ?? product?.createdAt,
    updated_at: product?.updated_at ?? product?.updatedAt,
  };
};

const getProductList = (responseData: any): any[] => {
  const data = unwrapResponse(responseData);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

export const ProductProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFetchRef = useRef<Promise<any> | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!activeFetchRef.current) {
        activeFetchRef.current = api
          .get(PRODUCTS_ENDPOINT, { timeout: 15000 })
          .then((response) => response.data);
      }

      const data = await activeFetchRef.current;
      const normalized = getProductList(data).map((product) =>
        normalizeProduct(product)
      );

      setProducts(normalized);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to fetch products.');
      console.error('[ProductContext] Fetch failed:', message);
      setError(message);
    } finally {
      activeFetchRef.current = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const fetchProductById = useCallback(
    async (id: string): Promise<Product> => {
      if (!id || id === 'undefined') {
        throw new Error('Invalid product ID provided.');
      }

      try {
        const response = await api.get(
          `${PRODUCTS_ENDPOINT}/${encodeURIComponent(id)}`,
          { timeout: 15000 }
        );

        const data = unwrapResponse(response.data);
        const product = normalizeProduct(data?.product ?? data, id);

        setProducts((previous) => {
          const index = previous.findIndex(
            (item) => item.id === id || item._id === id
          );

          if (index < 0) return [product, ...previous];

          const updated = [...previous];
          updated[index] = product;
          return updated;
        });

        return product;
      } catch (err: any) {
        throw new Error(
          extractErrorMessage(err, 'Failed to fetch product details.')
        );
      }
    },
    []
  );

  const createProduct = useCallback(
    async (productData: Partial<Product>): Promise<Product> => {
      try {
        const response = await api.post(PRODUCTS_ENDPOINT, productData, {
          timeout: 15000,
        });

        const data = unwrapResponse(response.data);
        const product = normalizeProduct(data?.product ?? data);

        setProducts((previous) => [product, ...previous]);

        return product;
      } catch (err: any) {
        throw new Error(
          extractErrorMessage(err, 'Failed to create product.')
        );
      }
    },
    []
  );

  const updateProduct = useCallback(
    async (
      id: string,
      productData: Partial<Product>
    ): Promise<Product> => {
      if (!id || id === 'undefined') {
        throw new Error('Invalid product ID provided.');
      }

      try {
        const response = await api.put(
          `${PRODUCTS_ENDPOINT}/${encodeURIComponent(id)}`,
          productData,
          { timeout: 15000 }
        );

        const data = unwrapResponse(response.data);
        const product = normalizeProduct(data?.product ?? data, id);

        setProducts((previous) =>
          previous.map((item) =>
            item.id === id || item._id === id ? product : item
          )
        );

        return product;
      } catch (err: any) {
        throw new Error(
          extractErrorMessage(err, 'Failed to update product.')
        );
      }
    },
    []
  );

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid product ID provided.');
    }

    try {
      await api.delete(
        `${PRODUCTS_ENDPOINT}/${encodeURIComponent(id)}`,
        { timeout: 15000 }
      );

      setProducts((previous) =>
        previous.filter((product) => product.id !== id && product._id !== id)
      );
    } catch (err: any) {
      throw new Error(
        extractErrorMessage(err, 'Failed to delete product.')
      );
    }
  }, []);

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        loading: isLoading,
        error,
        fetchProducts,
        fetchProductById,
        createProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error(
      'useProducts must be used within a ProductProvider'
    );
  }

  return context;
};

export default ProductProvider;

