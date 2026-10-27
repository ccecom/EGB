
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import api, { apiErrorMessage } from '../services/api';
import {
  calculateCheckoutPricing,
  formatPHP,
} from '../utils/checkoutPricing';

const inputClass =
  'mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100';

const labelClass =
  'block text-xs font-bold uppercase tracking-wider text-stone-600';

const CheckoutPage: React.FC = () => {
  const cart = useCart() as any;
  const {
    cartItems = [],
    cartSubtotal = 0,
    clearCart,
    appliedCoupon,
    eventDiscountTotal = 0,
    tax,
    taxRate,
    total,
  } = cart;

  const {
    shippingInfo,
    updateShippingInfo,
    checkoutStep,
    setCheckoutStep,
    resetCheckout,
  } = useCheckout();

  const { user, isAuthenticated } = useAuth();
  const orderContext = useOrders() as any;
  const fetchUserOrders = orderContext?.fetchUserOrders;

  const navigate = useNavigate();
  const location = useLocation();

  const [showReceipt, setShowReceipt] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const activeUserId = isAuthenticated && user
    ? String((user as any).id || (user as any)._id || '')
    : '';

  const passedSummary = (location.state as any)?.summary;

  // Use the single summary calculated by Cart whenever it is available.
  // Recalculate only when there is no navigation summary (e.g. direct visit).
  const pricing = passedSummary
    ? passedSummary
    : calculateCheckoutPricing({
        subtotal: Number(cartSubtotal) || 0,
        eventDiscountTotal: Number(eventDiscountTotal) || 0,
        coupon: appliedCoupon,
        taxRate,
        shipping: 0,
      });

  const finalTotal = Math.max(0, Number(pricing.total ?? total) || 0);

  useEffect(() => {
    if (cartItems.length === 0 && !showReceipt) {
      navigate('/shop', { replace: true });
    }
  }, [cartItems.length, navigate, showReceipt]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    updateShippingInfo({
      fullName:
        shippingInfo.fullName || (user as any).fullName || (user as any).username || '',
      email: shippingInfo.email || (user as any).email || '',
      mobileNumber: shippingInfo.mobileNumber || (user as any).mobile || '',
    });
    // Prefill only; don't overwrite details the customer has entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateShippingInfo({ [event.target.name]: event.target.value });
  };

  const handleNextStep = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setCheckoutStep(2);
  };

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmitting) return;

    if (!isAuthenticated || !activeUserId) {
      setSubmitError('Please log in before placing your order.');
      return;
    }

    if (!cartItems.length) {
      setSubmitError('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      user_id: activeUserId,
      subtotal: Number(pricing.subtotal ?? cartSubtotal) || 0,
      discount_amount:
        (Number(pricing.eventDiscountTotal) || 0) +
        (Number(pricing.couponDiscountAmount) || 0),
      tax_amount: Number(pricing.tax ?? tax) || 0,
      shipping_fee: Number(pricing.shipping) || 0,
      total_amount: finalTotal,
      total: finalTotal,
      applied_coupon: appliedCoupon?.code || null,
      items: cartItems.map((item: any) => ({
        id: String(item.id || item._id),
        product_id: String(item.id || item._id),
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        image: item.image || item.imageUrl || '',
        category: item.category || '',
      })),
      shipping_full_name: shippingInfo.fullName,
      shipping_email: shippingInfo.email,
      shipping_mobile_number: shippingInfo.mobileNumber,
      shipping_street: shippingInfo.street,
      shipping_barangay: shippingInfo.barangay,
      shipping_city: shippingInfo.city,
      shipping_region: shippingInfo.region,
      shipping_zip_code: shippingInfo.zipCode,
      shipping_landmark: shippingInfo.landmark || '',
      shipping_country: 'Philippines',
      payment_method: 'cash_on_delivery',
      date: new Date().toISOString(),
    };

    try {
      // api.ts handles the shared base URL, authorization token and HTTP errors.
      const response = await api.post('/api/v1/orders/', payload, {
        timeout: 20000,
      });

      const data = response.data || {};
      const savedOrder =
        data.order ||
        data.data ||
        data;

      const reference =
        savedOrder.order_number ||
        savedOrder.order_id ||
        savedOrder._id ||
        data.order_number ||
        data.order_id ||
        data._id;

      setOrderReference(String(reference || `EGB-${Date.now().toString().slice(-8)}`));

      // A refresh failure should not turn a successful order into a failed order.
      if (typeof fetchUserOrders === 'function') {
        try {
          await fetchUserOrders();
        } catch (refreshError) {
          console.warn('[Checkout] Order saved, but order list refresh failed.', refreshError);
        }
      }

      setShowReceipt(true);
    } catch (error) {
      setSubmitError(
        apiErrorMessage(error, 'Unable to place your order. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    isAuthenticated,
    activeUserId,
    cartItems,
    pricing,
    cartSubtotal,
    tax,
    finalTotal,
    appliedCoupon,
    shippingInfo,
    fetchUserOrders,
  ]);

  const finishOrder = () => {
    clearCart();
    resetCheckout();
    navigate('/orders', { replace: true });
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 pb-20 pt-24 text-stone-900 sm:px-6 lg:px-10">
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/60 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            className="my-8 w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <CheckCircle2 size={36} />
            </div>
            <h2 id="receipt-title" className="text-center text-2xl font-black">
              Order received
            </h2>
            <p className="mt-2 text-center text-sm text-stone-500">
              Your order has been submitted successfully.
            </p>
            <div className="my-6 rounded-2xl bg-stone-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Order reference
              </p>
              <p className="mt-1 break-all font-mono text-lg font-bold">
                {orderReference}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
                <span className="text-sm text-stone-600">Cash on delivery</span>
                <span className="text-xl font-black">{formatPHP(finalTotal)}</span>
              </div>
            </div>
            <p className="mb-6 text-center text-sm leading-6 text-stone-500">
              Thank you for shopping with EGB Backyard. You can view your order
              in your account.
            </p>
            <button
              type="button"
              onClick={finishOrder}
              className="min-h-12 w-full rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900"
            >
              Continue to my orders
            </button>
          </section>
        </div>
      )}

      <div className={`mx-auto max-w-6xl ${showReceipt ? 'pointer-events-none blur-sm' : ''}`}>
        <header className="mb-9 border-b border-stone-200 pb-7">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition hover:text-emerald-800"
          >
            <ArrowLeft size={16} /> Back to cart
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">
            EGB Backyard / Checkout
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Secure checkout
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Step {checkoutStep} of 2 · Delivery details and order review
          </p>
          <div className="mt-5 flex gap-2">
            <div className={`h-1.5 flex-1 rounded-full ${checkoutStep === 1 ? 'bg-emerald-800' : 'bg-emerald-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${checkoutStep === 2 ? 'bg-emerald-800' : 'bg-stone-200'}`} />
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            {checkoutStep === 1 ? (
              <form onSubmit={handleNextStep}>
                <div className="mb-7 flex items-center gap-3 border-b border-stone-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <MapPin size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Delivery information</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Where should we send your order?
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="fullName">Full name *</label>
                    <input id="fullName" className={inputClass} required minLength={2} name="fullName" value={shippingInfo.fullName || ''} onChange={handleInputChange} autoComplete="name" placeholder="Juan Dela Cruz" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="mobileNumber">Mobile number *</label>
                    <input id="mobileNumber" className={inputClass} required type="tel" pattern="[0-9]{11}" title="Enter an 11-digit mobile number" name="mobileNumber" value={shippingInfo.mobileNumber || ''} onChange={handleInputChange} autoComplete="tel" placeholder="09171234567" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="email">Email address *</label>
                    <input id="email" className={inputClass} required type="email" name="email" value={shippingInfo.email || ''} onChange={handleInputChange} autoComplete="email" placeholder="juan@example.com" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="region">Region / province *</label>
                    <input id="region" className={inputClass} required minLength={3} name="region" value={shippingInfo.region || ''} onChange={handleInputChange} autoComplete="address-level1" placeholder="Central Visayas" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="city">City / municipality *</label>
                    <input id="city" className={inputClass} required minLength={2} name="city" value={shippingInfo.city || ''} onChange={handleInputChange} autoComplete="address-level2" placeholder="Your city or municipality" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="barangay">Barangay *</label>
                    <input id="barangay" className={inputClass} required minLength={2} name="barangay" value={shippingInfo.barangay || ''} onChange={handleInputChange} placeholder="Your barangay" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="zipCode">ZIP code *</label>
                    <input id="zipCode" className={inputClass} required pattern="[0-9]{4}" title="Enter a 4-digit ZIP code" name="zipCode" value={shippingInfo.zipCode || ''} onChange={handleInputChange} autoComplete="postal-code" placeholder="6035" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="street">House number and street *</label>
                    <input id="street" className={inputClass} required minLength={3} name="street" value={shippingInfo.street || ''} onChange={handleInputChange} autoComplete="street-address" placeholder="House number, street name" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="landmark">Nearest landmark *</label>
                    <input id="landmark" className={inputClass} required minLength={3} name="landmark" value={shippingInfo.landmark || ''} onChange={handleInputChange} placeholder="Nearby store, school, or landmark" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-8 min-h-12 w-full rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900"
                >
                  Review my order
                </button>
              </form>
            ) : (
              <div>
                <div className="mb-7 flex items-center gap-3 border-b border-stone-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <ShieldCheck size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Review your order</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Confirm the delivery details before placing it.
                    </p>
                  </div>
                </div>

                <section className="rounded-xl border border-stone-200 bg-stone-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold">Delivery details</h3>
                    <button type="button" onClick={() => setCheckoutStep(1)} className="text-sm font-bold text-emerald-800 hover:underline">
                      Edit
                    </button>
                  </div>
                  <p className="mt-4 font-semibold">{shippingInfo.fullName}</p>
                  <p className="mt-1 text-sm text-stone-600">{shippingInfo.mobileNumber}</p>
                  <p className="text-sm text-stone-600">{shippingInfo.email}</p>
                  <p className="mt-3 text-sm leading-6 text-stone-700">
                    {shippingInfo.street}, Brgy. {shippingInfo.barangay},
                    {' '}{shippingInfo.city}, {shippingInfo.region} {shippingInfo.zipCode}
                  </p>
                  {shippingInfo.landmark && (
                    <p className="mt-2 text-sm text-stone-500">
                      Landmark: {shippingInfo.landmark}
                    </p>
                  )}
                </section>

                <section className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-5">
                  <div>
                    <p className="text-sm font-bold">Cash on delivery</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Pay when your order arrives.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    COD
                  </span>
                </section>

                {submitError && (
                  <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                    {submitError}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Please log in to place an order and save it to your account.
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="ml-1 font-bold underline"
                    >
                      Log in
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handlePlaceOrder()}
                  disabled={isSubmitting || !isAuthenticated}
                  className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting order…' : `Place order · ${formatPHP(finalTotal)}`}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutStep(1)}
                  disabled={isSubmitting}
                  className="mt-3 min-h-11 w-full rounded-xl border border-stone-300 px-5 text-sm font-semibold transition hover:bg-stone-50 disabled:opacity-50"
                >
                  Back to delivery details
                </button>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">Order summary</h2>
            <div className="mt-5 max-h-64 space-y-4 overflow-y-auto">
              {cartItems.map((item: any) => (
                <div key={item.id || item._id} className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {(item.image || item.imageUrl) && (
                      <img
                        src={item.image || item.imageUrl}
                        alt={item.name || 'Product'}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatPHP((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-stone-200 pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-stone-600">Subtotal</span>
                <span>{formatPHP(Number(pricing.subtotal ?? cartSubtotal) || 0)}</span>
              </div>
              {Number(pricing.eventDiscountTotal) > 0 && (
                <div className="flex justify-between gap-3 text-emerald-800">
                  <span>Event discount</span>
                  <span>−{formatPHP(Number(pricing.eventDiscountTotal))}</span>
                </div>
              )}
              {Number(pricing.couponDiscountAmount) > 0 && (
                <div className="flex justify-between gap-3 text-emerald-800">
                  <span>Coupon discount</span>
                  <span>−{formatPHP(Number(pricing.couponDiscountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-stone-600">Shipping</span>
                <span className="font-semibold text-emerald-800">
                  {Number(pricing.shipping) > 0 ? formatPHP(Number(pricing.shipping)) : 'Free'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-600">
                  Tax ({Number(pricing.taxPercentageLabel) || 0}%)
                </span>
                <span>{formatPHP(Number(pricing.tax ?? tax) || 0)}</span>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3 border-t border-stone-200 pt-5">
              <span className="text-sm font-bold">Total</span>
              <span className="text-2xl font-black">{formatPHP(finalTotal)}</span>
            </div>
            <p className="mt-2 text-right text-xs text-stone-500">
              Payment method: Cash on delivery
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
