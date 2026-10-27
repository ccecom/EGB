// src/pages/CartPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api, { apiErrorMessage } from "../services/api";
import {
  calculateCheckoutPricing,
  formatPHP,
} from "../utils/checkoutPricing";

const FALLBACK_IMAGE =
  "https://placehold.co/600x600/f3efe3/36543a?text=EGB+Backyard";

interface EventItem {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  event_type?: string;
  discount_amount: number;
  start_date?: string;
  end_date?: string;
  status: string;
  is_featured?: boolean;
}

function normalizeImageValue(value: unknown): string[] {
  if (typeof value === "string") {
    const image = value.trim();
    return image ? [image] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(normalizeImageValue);
  }
  if (value && typeof value === "object") {
    const imageObject = value as Record<string, unknown>;
    for (const key of ["url", "src", "image", "imageUrl", "image_url", "path"]) {
      const images = normalizeImageValue(imageObject[key]);
      if (images.length) return images;
    }
  }
  return [];
}

function getCartItemImage(item: any): string {
  const candidates = [
    item?.image,
    item?.imageUrl,
    item?.image_url,
    item?.img,
    item?.images,
    item?.thumbnail,
    item?.product_image,
    item?.productImage,
    item?.product?.image,
    item?.product?.imageUrl,
    item?.product?.image_url,
    item?.product?.images,
  ];

  for (const candidate of candidates) {
    const images = normalizeImageValue(candidate);
    if (images.length) return images[0];
  }
  return "";
}

const CartPage: React.FC = () => {
  const cart = useCart() as any;

  const {
    cartItems = [],
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal = 0,
    appliedCoupon,
    couponInput,
    setCouponInput,
    couponError,
    couponSuccess,
    isApplying,
    handleApplyCoupon,
    handleRemoveCoupon,
    taxRate,
    refreshCoupons,
  } = cart;

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeEvents, setActiveEvents] = useState<EventItem[]>([]);
  const [eventsError, setEventsError] = useState("");
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchActiveEvents = useCallback(async () => {
    setIsLoadingEvents(true);

    try {
      const response = await api.get("/api/v1/events");
      const data = response.data;

      const list: EventItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.events)
          ? data.events
          : Array.isArray(data?.data)
            ? data.data
            : [];

      const now = Date.now();

      setActiveEvents(
        list.filter((event) => {
          if (event.status?.toLowerCase() !== "active") return false;
          if (event.start_date) {
            const start = new Date(event.start_date).getTime();
            if (Number.isFinite(start) && start > now) return false;
          }
          if (event.end_date) {
            const end = new Date(event.end_date).getTime();
            if (Number.isFinite(end) && end < now) return false;
          }
          return true;
        })
      );

      setEventsError("");
    } catch (error) {
      setEventsError(apiErrorMessage(error, "Unable to load promotions."));
      setActiveEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void fetchActiveEvents();
    if (typeof refreshCoupons === "function") {
      void Promise.resolve(refreshCoupons()).catch(() => undefined);
    }
  }, [fetchActiveEvents, refreshCoupons]);

  const eventDiscountTotal = useMemo(
    () =>
      activeEvents.reduce(
        (sum, event) => sum + Math.max(0, Number(event.discount_amount) || 0),
        0
      ),
    [activeEvents]
  );

  const pricing = useMemo(
    () =>
      calculateCheckoutPricing({
        subtotal: Number(cartSubtotal) || 0,
        eventDiscountTotal,
        coupon: appliedCoupon,
        taxRate,
        shipping: 0,
      }),
    [cartSubtotal, eventDiscountTotal, appliedCoupon, taxRate]
  );

  const handleCouponKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleApplyCoupon();
    }
  };

  const proceedToCheckout = () => {
    if (!cartItems.length) return;
    navigate("/checkout", {
      state: {
        summary: pricing,
      },
    });
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 pb-20 pt-24 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-stone-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">
              EGB Backyard / Your Basket
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Your Cart
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">
              Review your selected poultry products before confirming delivery.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-stone-300 px-5 text-sm font-semibold transition hover:bg-white sm:self-auto"
          >
            Continue shopping <ArrowRight size={16} />
          </Link>
        </header>

        {!cartItems.length ? (
          <section className="rounded-3xl border border-stone-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <ShoppingBag size={30} />
            </div>

            <h2 className="text-2xl font-bold">Your cart is empty</h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">
              Browse the backyard collection and add products to your basket.
            </p>

            <Link
              to="/shop"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-7 text-sm font-bold text-white transition hover:bg-emerald-900"
            >
              Explore the shop
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-5">
                <div>
                  <h2 className="text-lg font-bold">Basket items</h2>

                  <p className="mt-1 text-sm text-stone-500">
                    {cartItems.length} product
                    {cartItems.length === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <Trash2 size={16} /> Clear cart
                </button>
              </div>

              <div className="space-y-6">
                {cartItems.map((item: any, index: number) => {
                  const id = item.id ?? item._id ?? item.product_id;
                  const itemImage = getCartItemImage(item);
                  const itemKey = String(id ?? `cart-item-${index}`);
                  const quantity = Number(item.quantity) || 0;
                  const price = Number(item.price) || 0;

                  return (
                    <article
                      key={itemKey}
                      className="flex flex-col gap-4 border-b border-stone-100 pb-6 last:border-0 last:pb-0 sm:flex-row"
                    >
                      <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 sm:h-32 sm:w-36">
                        <img
                          src={itemImage || FALLBACK_IMAGE}
                          alt={item.name || "Cart product"}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            const image = event.currentTarget;
                            if (image.dataset.fallbackApplied === "true") {
                              image.style.visibility = "hidden";
                              return;
                            }
                            image.dataset.fallbackApplied = "true";
                            image.src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                              {item.category || "Backyard collection"}
                            </p>

                            <h3 className="mt-1 break-words text-lg font-bold">
                              {item.name || "Farm product"}
                            </h3>

                            {item.variant && (
                              <p className="mt-1 text-sm text-stone-500">
                                {item.variant}
                              </p>
                            )}
                          </div>

                          <div className="sm:text-right">
                            <p className="font-bold">{formatPHP(price)}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              Per unit
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="inline-flex h-10 items-center overflow-hidden rounded-lg border border-stone-200">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name || "product"}`}
                              disabled={quantity <= 1}
                              onClick={() => updateQuantity(id, -1)}
                              className="h-full w-10 text-lg transition hover:bg-stone-100 disabled:opacity-30"
                            >
                              −
                            </button>

                            <span className="min-w-10 text-center text-sm font-semibold">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name || "product"}`}
                              onClick={() => updateQuantity(id, 1)}
                              className="h-full w-10 text-lg transition hover:bg-stone-100"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-bold">
                              {formatPHP(price * quantity)}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeFromCart(id)}
                              className="text-sm font-semibold text-rose-700 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Order summary</h2>

                <p className="mt-1 text-sm text-stone-500">
                  Discounts and totals for this basket.
                </p>

                {activeEvents.length > 0 && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-900">
                      <Sparkles size={17} /> Active promotions
                    </div>

                    {activeEvents.map((event) => (
                      <div
                        key={event.id || event._id || event.title}
                        className="flex justify-between gap-3 py-1 text-sm text-emerald-900"
                      >
                        <span>{event.title}</span>

                        <span className="shrink-0 font-semibold">
                          {formatPHP(Number(event.discount_amount) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isLoadingEvents && (
                  <p className="mt-3 text-xs text-stone-500">
                    Checking current promotions…
                  </p>
                )}

                {eventsError && (
                  <div
                    role="status"
                    className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"
                  >
                    {eventsError}

                    <button
                      type="button"
                      onClick={() => void fetchActiveEvents()}
                      className="ml-1 font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="mt-5">
                  <label
                    htmlFor="coupon"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600"
                  >
                    Coupon code
                  </label>

                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      value={couponInput || ""}
                      onChange={(event) => setCouponInput(event.target.value)}
                      onKeyDown={handleCouponKeyDown}
                      disabled={!!appliedCoupon}
                      placeholder="Enter code"
                      className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                    />

                    <button
                      type="button"
                      onClick={() => void handleApplyCoupon()}
                      disabled={
                        isApplying ||
                        !couponInput?.trim() ||
                        !!appliedCoupon
                      }
                      className="rounded-xl bg-stone-900 px-4 text-xs font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isApplying ? "Wait…" : "Apply"}
                    </button>
                  </div>

                  {couponError && (
                    <p role="alert" className="mt-2 text-sm text-rose-700">
                      {couponError}
                    </p>
                  )}

                  {couponSuccess && (
                    <p role="status" className="mt-2 text-sm text-emerald-700">
                      {couponSuccess}
                    </p>
                  )}

                  {appliedCoupon && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                      <div>
                        <p className="font-bold">{appliedCoupon.code}</p>

                        <p className="mt-1 text-xs text-stone-500">
                          {appliedCoupon.description || "Coupon applied"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-rose-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3 border-t border-stone-200 pt-5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-medium">
                      {formatPHP(pricing.subtotal)}
                    </span>
                  </div>

                  {pricing.eventDiscountTotal > 0 && (
                    <div className="flex justify-between gap-3 text-emerald-800">
                      <span>Event discount</span>
                      <span>
                        −{formatPHP(pricing.eventDiscountTotal)}
                      </span>
                    </div>
                  )}

                  {pricing.couponDiscountAmount > 0 && (
                    <div className="flex justify-between gap-3 text-emerald-800">
                      <span>Coupon discount</span>
                      <span>
                        −{formatPHP(pricing.couponDiscountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between gap-3">
                    <span className="text-stone-600">Shipping</span>
                    <span className="font-semibold text-emerald-800">
                      Free
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-stone-600">
                      Tax ({pricing.taxPercentageLabel}%)
                    </span>
                    <span className="font-medium">
                      {formatPHP(pricing.tax)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-stone-200 pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-sm font-bold">Total</span>

                    <span className="text-2xl font-black tracking-tight">
                      {formatPHP(pricing.total)}
                    </span>
                  </div>

                  <p className="mt-1 text-right text-xs text-stone-500">
                    Philippine peso · Tax included
                  </p>
                </div>

                <button
                  type="button"
                  onClick={proceedToCheckout}
                  disabled={!cartItems.length}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proceed to checkout <ArrowRight size={17} />
                </button>

                {!isAuthenticated && (
                  <p className="mt-3 text-center text-xs leading-5 text-stone-500">
                    You will need to log in before placing your order.
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage;
