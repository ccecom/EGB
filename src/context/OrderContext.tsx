import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import axios from "axios";
import api, { apiErrorMessage } from "../services/api";
import { useAuth } from "./AuthContext";

export interface OrderItem {
  id: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  _id?: string;
}

export interface Order {
  _id?: string;
  id?: string;
  order_number?: string;
  user_id?: string;
  total_amount?: number;
  total?: number;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  items: OrderItem[];
  created_at?: string;
  createdAt?: string;
  date?: string;
  estimated_delivery?: string;
  estimatedDelivery?: string;
  shipping_full_name?: string;
  shipping_mobile_number?: string;
  shipping_street?: string;
  shipping_barangay?: string;
  shipping_city?: string;
  shipping_region?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipping_landmark?: string;
  shippingAddress?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  notes?: string;
  [key: string]: any;
}

interface OrderContextType {
  orders: Order[];
  fetchUserOrders: () => Promise<void>;
  syncOrders: () => Promise<void>;
  cancelOrder: (orderId: string, backendId?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const API_V1 = "/api/v1";
const REQUEST_TIMEOUT_MS = 30000;

function normalizeOrderList(data: any): Order[] | null {
  if (Array.isArray(data)) return data;

  for (const key of ["orders", "data", "items", "results"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return null;
}

export const OrderProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();

  const requestInFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {  
      mounted.current = false;  
    };
  }, []);

  const fetchUserOrders = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user) {
      setOrders([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (requestInFlight.current) {  
      return requestInFlight.current;  
    }  

    const userId = user.id || (user as any)._id;  

    if (!userId) {  
      setError("Your account is missing a user ID.");  
      setOrders([]);  
      return;  
    }  

    const request = (async () => {  
      setIsLoading(true);  
      setError(null);  

      try {  
        const response = await api.get(  
          `${API_V1}/orders/user/${encodeURIComponent(String(userId))}`,  
          { timeout: REQUEST_TIMEOUT_MS },  
        );  

        const nextOrders = normalizeOrderList(response.data);  

        if (nextOrders === null) {  
          throw new Error(  
            "The orders endpoint returned an unexpected response format.",  
          );  
        }  

        if (mounted.current) {  
          setOrders(nextOrders);  
        }  
      } catch (err: unknown) {  
        const status = axios.isAxiosError(err)  
          ? err.response?.status  
          : undefined;  

        const message =  
          apiErrorMessage(err, "Could not load your orders.");  

        if (mounted.current) {  
          setError(  
            status === 503  
              ? "The order service is temporarily unavailable. Please try again shortly."  
              : message,  
          );  
        }  

        console.error("[EGB OrderContext] Fetch orders failed:", {  
          status,  
          message,  
        });  

        throw err;  
      } finally {  
        if (mounted.current) {  
          setIsLoading(false);  
        }  
      }  
    })();  

    requestInFlight.current = request;  

    try {  
      await request;  
    } finally {  
      if (requestInFlight.current === request) {  
        requestInFlight.current = null;  
      }  
    }
  }, [user, isAuthenticated]);

  const cancelOrder = useCallback(
    async (orderId: string, backendId?: string): Promise<void> => {
      const targetId = backendId || orderId;

      if (  
        !targetId ||  
        targetId === "undefined" ||  
        targetId === "null"  
      ) {  
        throw new Error("Invalid order ID.");  
      }  

      setIsLoading(true);  
      setError(null);  

      try {  
        await api.patch(  
          `${API_V1}/orders/${encodeURIComponent(String(targetId))}/status`,  
          { status: "cancelled" },  
          { timeout: REQUEST_TIMEOUT_MS },  
        );  

        setOrders((previous) =>  
          previous.map((order) =>  
            order._id === targetId ||  
            order.id === targetId ||  
            order.order_number === targetId  
              ? { ...order, status: "cancelled" }  
              : order,  
          ),  
        );  
      } catch (err: unknown) {  
        const message = apiErrorMessage(  
          err,  
          "Error cancelling the order.",  
        );  

        setError(message);  
        console.error("[EGB OrderContext] Cancel order failed:", message);  
        throw err;  
      } finally {  
        setIsLoading(false);  
      }  
    },  
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOrders([]);
      setError(null);
      return;
    }

    void fetchUserOrders().catch(() => {  
      // Error is already stored in context.  
    });
  }, [fetchUserOrders, isAuthenticated, user]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        fetchUserOrders,
        syncOrders: fetchUserOrders,
        cancelOrder,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }

  return context;
};

export const useOrder = useOrders;
export default OrderProvider;
