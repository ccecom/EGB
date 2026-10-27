
export interface Coupon {
  code?: string;
  type: string;
  discount: number;
  maxDiscount?: number;
  description?: string;
}

export interface CheckoutPricing {
  subtotal: number;
  eventDiscountTotal: number;
  couponDiscountAmount: number;
  netSubtotal: number;
  shipping: number;
  tax: number;
  taxRate: number;
  taxPercentageLabel: number;
  total: number;
}

interface PricingInput {
  subtotal: number;
  eventDiscountTotal?: number;
  coupon?: Coupon | null;
  taxRate?: number;
  shipping?: number;
}

export const formatPHP = (value: number): string =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number.isFinite(value) ? value : 0);

export const normalizeTaxRate = (rate?: number): number => {
  const value = Number(rate);
  if (!Number.isFinite(value) || value < 0) return 0.08;
  return value > 1 ? value / 100 : value;
};

export function calculateCheckoutPricing({
  subtotal,
  eventDiscountTotal = 0,
  coupon,
  taxRate = 0.08,
  shipping = 0,
}: PricingInput): CheckoutPricing {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);

  // Event discounts cannot exceed the cart subtotal.
  const eventDiscount = Math.min(
    safeSubtotal,
    Math.max(0, Number(eventDiscountTotal) || 0),
  );

  const afterEvents = Math.max(0, safeSubtotal - eventDiscount);
  let couponDiscount = 0;

  if (coupon) {
    const discount = Math.max(0, Number(coupon.discount) || 0);

    couponDiscount =
      coupon.type === 'percent'
        ? (afterEvents * discount) / 100
        : discount;

    if (coupon.maxDiscount != null) {
      couponDiscount = Math.min(
        couponDiscount,
        Math.max(0, Number(coupon.maxDiscount) || 0),
      );
    }

    couponDiscount = Math.min(afterEvents, couponDiscount);
  }

  const netSubtotal = Math.max(0, afterEvents - couponDiscount);
  const normalizedTax = normalizeTaxRate(taxRate);
  const safeShipping = Math.max(0, Number(shipping) || 0);
  const tax = netSubtotal * normalizedTax;

  return {
    subtotal: safeSubtotal,
    eventDiscountTotal: eventDiscount,
    couponDiscountAmount: couponDiscount,
    netSubtotal,
    shipping: safeShipping,
    tax,
    taxRate: normalizedTax,
    taxPercentageLabel: Math.round(normalizedTax * 100),
    total: netSubtotal + safeShipping + tax,
  };
}
