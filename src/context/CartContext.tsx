// src/context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import api, { apiErrorMessage } from '../services/api';

export interface CartItemType {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  variant?: string;
  [key: string]: any;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'fixed' | 'shipping';
  minSpend?: number;
  maxDiscount?: number;
  description: string;
  is_game_reward?: boolean;
  source?: string;
  created_at?: string;
  expires_at?: string;
  gained_at?: string;
}

export interface EventItem {
  id?: string;
  _id?: string;
  title: string;
  discount_amount: number;
  start_date: string;
  end_date: string;
  status?: string;
  [key: string]: any;
}

interface CartContextType {
  cartItems: CartItemType[];
  totalItems: number;
  cartCount: number;
  getTotalItems: () => number;
  addToCart: (item: CartItemType | Omit<CartItemType, 'quantity'>) => void;
  updateQuantity: (id: string | number, delta: number) => void;
  removeFromCart: (id: string | number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  couponInput: string;
  setCouponInput: (val: string) => void;
  couponError: string;
  couponSuccess: string;
  isApplying: boolean;
  handleApplyCoupon: () => Promise<void>;
  handleRemoveCoupon: () => void;
  activeEvents: EventItem[];
  eventDiscountTotal: number;
  taxRate: number;
  discountAmount: number;
  tax: number;
  shipping: number;
  total: number;
  refreshCoupons: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const DEFAULT_COUPONS: Coupon[] = [
  {
    code: 'EGBBACKYARD',
    discount: 10,
    type: 'percent',
    maxDiscount: 50,
    description: '10% off your EGB Backyard order',
    source: 'store',
  },
  {
    code: 'FREESHIP',
    discount: 100,
    type: 'shipping',
    description: 'Free shipping reward',
    source: 'store',
  },
];

const isGameReward = (c: {
  code?: string;
  is_game_reward?: boolean;
  source?: string;
}): boolean =>
  Boolean(
    c.is_game_reward ||
      c.source === 'game' ||
      String(c.code || '')
        .toUpperCase()
        .startsWith('EGB-')
  );

const normalizeCoupon = (item: any): Coupon | null => {
  if (!item?.code) return null;
  const code = String(item.code).toUpperCase();
  const game = isGameReward(item);
  return {
    code,
    discount: Math.min(100, Number(item.discount) || 0),
    type:
      item.type === 'fixed' || item.type === 'shipping'
        ? item.type
        : game
          ? 'fixed'
          : 'percent',
    minSpend: Number(item.minSpend ?? item.min_spend ?? 0),
    maxDiscount:
      item.maxDiscount != null
        ? Math.min(100, Number(item.maxDiscount))
        : game
          ? 100
          : 100,
    description:
      item.description ||
      item.label ||
      (game ? 'EGB Backyard Farm Catcher Reward' : 'Store voucher'),
    is_game_reward: game,
    source: item.source || (game ? 'game' : 'store'),
    created_at: item.created_at || item.createdAt,
    expires_at: item.expires_at || item.expiresAt || item.expiry_date,
    gained_at: item.gained_at || item.gainedAt || item.issued_at,
  };
};

const keepSingleGameReward = (list: Coupon[]): Coupon[] => {
  const store = list.filter((c) => !isGameReward(c));
  const games = list.filter(isGameReward);
  if (games.length === 0) return store;

  games.sort((a, b) => {
    if (b.discount !== a.discount) return b.discount - a.discount;
    const ta = new Date(a.gained_at || a.created_at || 0).getTime();
    const tb = new Date(b.gained_at || b.created_at || 0).getTime();
    return tb - ta;
  });
  return [...store, games[0]];
};

const persistedCodesThisSession = new Set<string>();

const persistGameCouponOnce = async (coupon: Coupon) => {
  if (!isGameReward(coupon)) return;
  const code = coupon.code.toUpperCase();
  if (persistedCodesThisSession.has(code)) return;
  persistedCodesThisSession.add(code);

  try {
    await api.post('/api/v1/coupons/claim-game-reward', {
      code,
      discount: coupon.discount,
      type: coupon.type === 'shipping' ? 'fixed' : coupon.type,
      minSpend: coupon.minSpend || 0,
      description: coupon.description,
      is_game_reward: true,
      source: 'game',
      replace_previous_game_rewards: true,
    });
  } catch {
    try {
      await api.post('/api/v1/coupons', {
        code,
        discount: coupon.discount,
        type: coupon.type === 'shipping' ? 'fixed' : coupon.type,
        minSpend: coupon.minSpend || 0,
        description: coupon.description,
        is_game_reward: true,
        source: 'game',
      });
    } catch {
      // ignore
    }
  }
};

export const CartProvider: React.FC<{
  children: ReactNode;
  userId?: string | null;
}> = ({ children, userId: propUserId }) => {
  const { user } = useAuth() as any;
  const currentUserId = propUserId || user?.id || user?._id || user?.email;
  const storageKey = currentUserId ? `egb_cart_${currentUserId}` : 'egb_cart_guest';

  const [cartItems, setCartItems] = useState<CartItemType[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed)
          ? parsed.map((item: any) => ({
              ...item,
              quantity: Number(item.quantity) || 1,
            }))
          : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);

  const [activeEvents, setActiveEvents] = useState<EventItem[]>([]);
  const [eventDiscountTotal, setEventDiscountTotal] = useState(0);
  const [taxRate, setTaxRate] = useState<number>(0.08);

  const fetchInFlight = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      try {
        const taxRes = await api.get('/api/v1/tax').catch(() => api.get('/tax'));
        const taxData = taxRes.data?.data ?? taxRes.data;
        const rate = taxData?.taxRate ?? taxData?.tax_rate;
        if (typeof rate === 'number') {
          setTaxRate(rate <= 1 ? rate : rate / 100);
        }
      } catch {
        // ignore
      }

      try {
        const eventsRes = await api.get('/api/v1/events').catch(() => api.get('/events'));
        const data = eventsRes.data;
        const eventsArray = Array.isArray(data) ? data : data?.events || data?.data || [];
        const now = new Date();

        const currentActiveEvents = eventsArray.filter((ev: any) => {
          if (!ev.start_date || !ev.end_date) return false;
          const start = new Date(ev.start_date);
          const end = new Date(ev.end_date);
          const statusActive = !ev.status || String(ev.status).toLowerCase() === 'active';
          return statusActive && now >= start && now <= end && Number(ev.discount_amount) > 0;
        });

        setActiveEvents(currentActiveEvents);
        setEventDiscountTotal(
          currentActiveEvents.reduce(
            (sum: number, ev: EventItem) => sum + (Number(ev.discount_amount) || 0),
            0
          )
        );
      } catch {
        // ignore
      }

      try {
        const [storeRes, gameRes] = await Promise.all([
          api.get('/api/v1/coupons').catch(() => ({ data: [] })),
          api.get('/api/v1/game/coupons').catch(() => ({ data: [] })),
        ]);

        const extract = (payload: any): any[] => {
          const d = payload?.data ?? payload;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.coupons)) return d.coupons;
          if (Array.isArray(d?.data)) return d.data;
          if (Array.isArray(d?.items)) return d.items;
          return [];
        };

        const remote = [...extract(storeRes.data), ...extract(gameRes.data)]
          .map(normalizeCoupon)
          .filter((c): c is Coupon => Boolean(c));

        // Check local storage for any single game reward
        let localGames: Coupon[] = [];
        try {
          const savedLocal = localStorage.getItem('egb_saved_coupons');
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed)) {
              localGames = parsed.map(normalizeCoupon).filter((c): c is Coupon => Boolean(c && isGameReward(c)));
            }
          }
        } catch {
          // ignore
        }

        const map = new Map<string, Coupon>();
        DEFAULT_COUPONS.forEach((c) => map.set(c.code.toUpperCase(), c));
        remote.forEach((c) => map.set(c.code.toUpperCase(), c));
        localGames.forEach((c) => map.set(c.code.toUpperCase(), c));

        const finalCoupons = keepSingleGameReward(Array.from(map.values()));
        const bestGame = finalCoupons.find(isGameReward);
        if (bestGame) {
          void persistGameCouponOnce(bestGame);
        }

        setAvailableCoupons(finalCoupons);
      } catch {
        setAvailableCoupons(DEFAULT_COUPONS);
      }
    } finally {
      fetchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCartItems(Array.isArray(parsed) ? parsed : []);
      } else {
        setCartItems([]);
      }
      setAppliedCoupon(null);
      setCouponError('');
      setCouponSuccess('');
    } catch {
      setCartItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      if (cartItems.length) {
        localStorage.setItem(storageKey, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore
    }
  }, [cartItems, storageKey]);

  const totalItems = cartItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1),
    0
  );
  const cartCount = totalItems;
  const getTotalItems = useCallback(() => totalItems, [totalItems]);

  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  let couponDiscountValue = 0;
  let effectiveShipping = 0;

  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent' || appliedCoupon.type === 'fixed') {
      const meetsMinimum =
        !appliedCoupon.minSpend || cartSubtotal >= appliedCoupon.minSpend;
      if (meetsMinimum) {
        let calc =
          appliedCoupon.type === 'percent'
            ? (cartSubtotal * appliedCoupon.discount) / 100
            : appliedCoupon.discount;

        const maxDisc =
          appliedCoupon.maxDiscount != null
            ? Math.min(100, appliedCoupon.maxDiscount)
            : appliedCoupon.type === 'fixed'
              ? appliedCoupon.discount
              : 100;
        if (calc > maxDisc) calc = maxDisc;
        if (appliedCoupon.type === 'fixed') {
          calc = Math.min(calc, cartSubtotal);
        }
        couponDiscountValue = Math.round(calc * 100) / 100;
      }
    } else if (appliedCoupon.type === 'shipping') {
      effectiveShipping = 0;
    }
  }

  const discountAmount = Math.min(
    cartSubtotal,
    eventDiscountTotal + couponDiscountValue
  );
  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  const tax = Math.round(taxableAmount * taxRate * 100) / 100;
  const total = Math.max(0, taxableAmount + effectiveShipping + tax);

  const addToCart = useCallback(
    (newItem: CartItemType | Omit<CartItemType, 'quantity'>) => {
      setCartItems((prev) => {
        const quantityToAdd =
          Number((newItem as any).quantity) > 0
            ? Number((newItem as any).quantity)
            : 1;
        const itemId = newItem.id ?? (newItem as any)._id;

        const existingIndex = prev.findIndex(
          (item) =>
            String(item.id ?? (item as any)._id) === String(itemId) &&
            item.variant === newItem.variant
        );

        if (existingIndex > -1) {
          return prev.map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  quantity: (Number(item.quantity) || 1) + quantityToAdd,
                }
              : item
          );
        }

        return [...prev, { ...newItem, id: itemId, quantity: quantityToAdd }];
      });
    },
    []
  );

  const updateQuantity = useCallback((id: string | number, delta: number) => {
    setCartItems(
      (prev) =>
        prev
          .map((item) => {
            if (String(item.id ?? (item as any)._id) === String(id)) {
              const currentQty = Number(item.quantity) || 1;
              const newQty = currentQty + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItemType[]
    );
  }, []);

  const removeFromCart = useCallback((id: string | number) => {
    setCartItems((prev) =>
      prev.filter((item) => String(item.id ?? (item as any)._id) !== String(id))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    setIsApplying(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const code = couponInput.trim().toUpperCase();
      let found = availableCoupons.find(
        (coupon) => coupon.code.trim().toUpperCase() === code
      );

      if (!found) {
        setCouponError('Invalid offer code. Please verify and try again.');
        return;
      }

      if (found.minSpend && cartSubtotal < found.minSpend) {
        setCouponError(
          `Minimum spend of ₱${found.minSpend} required for this offer.`
        );
        return;
      }

      if (isGameReward(found)) {
        void persistGameCouponOnce(found);
      }

      setAppliedCoupon(found);
      setCouponSuccess(`${found.code} applied successfully!`);
      setCouponInput('');
    } catch (err: any) {
      setCouponError(apiErrorMessage(err, 'Failed to apply coupon.'));
    } finally {
      setIsApplying(false);
    }
  }, [couponInput, availableCoupons, cartSubtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  }, []);

  const refreshCoupons = useCallback(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalItems,
        cartCount,
        getTotalItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        availableCoupons,
        appliedCoupon,
        couponInput,
        setCouponInput,
        couponError,
        couponSuccess,
        isApplying,
        handleApplyCoupon,
        handleRemoveCoupon,
        activeEvents,
        eventDiscountTotal,
        taxRate,
        discountAmount,
        tax,
        shipping: effectiveShipping,
        total,
        refreshCoupons,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
