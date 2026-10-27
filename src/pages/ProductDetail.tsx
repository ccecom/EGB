import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Minus,
} from 'lucide-react';

interface Product {
  id?: string | number;
  _id?: string | number;
  name?: string;
  description?: string;
  price?: number | string;
  compare_at_price?: number | string;
  compareAtPrice?: number | string;
  images?: string[] | string;
  imageUrl?: string;
  image?: string;
  category?: string;
  badge?: string;
  sku?: string;
  stock?: number | string;
  inventory?: number | string;
  sizes?: string[] | string;
  colors?: string[] | string;
}

type ProductTab = 'description' | 'shipping' | 'returns';

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const FALLBACK_IMAGE =
  'https://via.placeholder.com/800x800.png?text=Product+Image';

/**
 * Robustly resolves a raw image path/URL against the API origin.
 */
function resolveImageUrl(rawPath: any): string {
  if (rawPath == null) return FALLBACK_IMAGE;
  const value = String(rawPath).trim();
  if (!value) return FALLBACK_IMAGE;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (value.startsWith('/')) return API_ORIGIN + value;
  return API_ORIGIN + '/' + value;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { fetchProductById, products } = useProducts();
  const { addToCart, cartItems } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeTab, setActiveTab] =
    useState<ProductTab>('description');

  const isAddingRef = useRef(false);

  /*
   * ------------------------------------------------------------
   * PRODUCT FETCHING
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      if (!id || id === 'undefined' || id === 'null') {
        if (isMounted) {
          setError('Invalid product ID.');
          setProduct(null);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setError(null);
        setProduct(null);
      }

      try {
        if (typeof fetchProductById === 'function') {
          const result = await fetchProductById(id);

          if (!result) {
            throw new Error('Product not found.');
          }

          if (isMounted) {
            setProduct(result);
          }
        } else {
          const found = products.find(
            (item: any) =>
              String(item.id) === String(id) ||
              String(item._id) === String(id)
          );

          if (!found) {
            throw new Error('Product not found.');
          }

          if (isMounted) {
            setProduct(found);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load this product. Please try again.'
          );
          setProduct(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  /*
   * ------------------------------------------------------------
   * NORMALIZED PRODUCT DATA & IMAGE GALLERY RESOLUTION
   * ------------------------------------------------------------
   */

  const imageGallery = useMemo<string[]>(() => {
    if (!product) {
      return [FALLBACK_IMAGE];
    }

    let rawList: any[] = [];

    if (Array.isArray(product.images)) {
      rawList = product.images;
    } else if (typeof product.images === 'string') {
      rawList = product.images
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeof product.imageUrl === 'string') {
      rawList = [product.imageUrl];
    } else if (typeof product.image === 'string') {
      rawList = [product.image];
    }

    const validImages = rawList
      .filter(
        (item) =>
          item != null && String(item).trim().length > 0
      )
      .map((item) => resolveImageUrl(item));

    return validImages.length > 0
      ? validImages
      : [FALLBACK_IMAGE];
  }, [product]);

  const sizes = useMemo<string[]>(() => {
    if (!product?.sizes) {
      return [];
    }

    if (Array.isArray(product.sizes)) {
      return product.sizes
        .filter(
          (size): size is string =>
            typeof size === 'string' && size.trim().length > 0
        )
        .map((size) => size.trim());
    }

    if (typeof product.sizes === 'string') {
      return product.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean);
    }

    return [];
  }, [product]);

  const colors = useMemo<string[]>(() => {
    if (!product?.colors) {
      return [];
    }

    if (Array.isArray(product.colors)) {
      return product.colors
        .filter(
          (color): color is string =>
            typeof color === 'string' && color.trim().length > 0
        )
        .map((color) => color.trim());
    }

    if (typeof product.colors === 'string') {
      return product.colors
        .split(',')
        .map((color) => color.trim())
        .filter(Boolean);
    }

    return [];
  }, [product]);

  /*
   * ------------------------------------------------------------
   * DEFAULT VARIANTS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    setSelectedSize(sizes.length === 1 ? sizes[0] : null);
    setSelectedColor(colors.length === 1 ? colors[0] : null);
  }, [sizes, colors]);

  /*
   * ------------------------------------------------------------
   * PRODUCT METRICS
   * ------------------------------------------------------------
   */

  const availableStock = useMemo(() => {
    if (!product) {
      return 0;
    }

    const value = Number(
      product.inventory ?? product.stock ?? 0
    );

    return Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : 0;
  }, [product]);

  const isOutOfStock = availableStock <= 0;

  const productId = product?._id ?? product?.id;

  const currentPrice = Number(product?.price ?? 0);

  const comparePrice = Number(
    product?.compare_at_price ??
      product?.compareAtPrice ??
      0
  );

  const discount =
    comparePrice > currentPrice && currentPrice > 0
      ? Math.round(
          ((comparePrice - currentPrice) / comparePrice) * 100
        )
      : null;

  const variantName =
    [selectedSize, selectedColor]
      .filter(Boolean)
      .join(' - ') || 'Standard';

  const missingOptions =
    (sizes.length > 0 && !selectedSize) ||
    (colors.length > 0 && !selectedColor);

  /*
   * ------------------------------------------------------------
   * CART STOCK CALCULATION
   * ------------------------------------------------------------
   */

  const existingCartItem = cartItems?.find(
    (item: any) =>
      String(item.id) === String(productId) &&
      String(item.variant || 'Standard') === variantName
  );

  const quantityInCart = existingCartItem
    ? Number(existingCartItem.quantity) || 0
    : 0;

  const maxSelectable = Math.max(
    0,
    availableStock - quantityInCart
  );

  const isMaxStockReached =
    !isOutOfStock && maxSelectable <= 0;

  /*
   * ------------------------------------------------------------
   * PRICE FORMATTING
   * ------------------------------------------------------------
   */

  const formatPrice = (value: number | string | undefined) => {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(
      Number.isFinite(numericValue) ? numericValue : 0
    );
  };

  /*
   * ------------------------------------------------------------
   * IMAGE CONTROLS
   * ------------------------------------------------------------
   */

  const goToPreviousImage = () => {
    setActiveImageIndex((current) =>
      current === 0
        ? imageGallery.length - 1
        : current - 1
    );
  };

  const goToNextImage = () => {
    setActiveImageIndex((current) =>
      current === imageGallery.length - 1
        ? 0
        : current + 1
    );
  };

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const target = event.currentTarget;
    target.onerror = null;
    target.src = FALLBACK_IMAGE;
  };

  /*
   * ------------------------------------------------------------
   * QUANTITY
   * ------------------------------------------------------------
   */

  const handleQuantityChange = (delta: number) => {
    setQuantity((current) => {
      const next = current + delta;

      if (next < 1) {
        return 1;
      }

      if (maxSelectable > 0 && next > maxSelectable) {
        return maxSelectable;
      }

      return next;
    });
  };

  /*
   * ------------------------------------------------------------
   * ADD TO CART
   * ------------------------------------------------------------
   */

  const handleAddToCart = () => {
    if (
      !product ||
      productId === undefined ||
      productId === null ||
      isOutOfStock ||
      missingOptions ||
      isAddingRef.current ||
      isMaxStockReached ||
      quantity < 1
    ) {
      return;
    }

    isAddingRef.current = true;
    setIsDispatching(true);

    try {
      addToCart({
        id: productId,
        name: product.name || 'Product',
        price: product.price ?? 0,
        image: imageGallery[0],
        category: product.category || 'General',
        variant: variantName,
        quantity,
      });

      window.setTimeout(() => {
        isAddingRef.current = false;
        setIsDispatching(false);
        setQuantity(1);
      }, 450);
    } catch (err) {
      isAddingRef.current = false;
      setIsDispatching(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * SHARE
   * ------------------------------------------------------------
   */

  const handleShare = async () => {
    const shareData = {
      title: product?.name || 'Product',
      text: `Check out ${
        product?.name || 'this product'
      } on CC Ecom!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          window.location.href
        );

        window.alert(
          'Product link copied to clipboard.'
        );
      }
    } catch {
      // Sharing cancelled or unavailable.
    }
  };

  /*
   * ------------------------------------------------------------
   * LOADING STATE
   * ------------------------------------------------------------
   */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div
          className="flex flex-col items-center text-center"
          role="status"
          aria-live="polite"
        >
          <div className="w-11 h-11 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Loading product
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Please wait a moment.
          </p>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * ERROR STATE
   * ------------------------------------------------------------
   */

  if (error || !product) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle
              size={30}
              className="text-red-500"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900 tracking-tight">
            Product unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error ||
              'The product you are looking for could not be found or is no longer available.'}
          </p>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 mt-7 min-h-11 px-6 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * MAIN PRODUCT PAGE
   * ------------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-white text-slate-900 pt-20 sm:pt-24 pb-16 sm:pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ======================================================
            BREADCRUMBS / PAGE HEADER
        ====================================================== */}

        <div className="border-b border-slate-200 pb-5 mb-7 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 min-w-0 text-xs font-medium text-slate-500"
            >
              <Link
                to="/"
                className="hover:text-slate-900 transition-colors"
              >
                Home
              </Link>

              <ChevronRight
                size={13}
                className="text-slate-300 shrink-0"
              />

              <Link
                to="/shop"
                className="hover:text-slate-900 transition-colors"
              >
                Shop
              </Link>

              <ChevronRight
                size={13}
                className="text-slate-300 shrink-0"
              />

              <span className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-[360px]">
                {product.name}
              </span>
            </nav>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 self-start sm:self-auto text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Share this product"
            >
              <Share2 size={16} />
              Share Product
            </button>
          </div>
        </div>

        {/* ======================================================
            PRODUCT CONTENT
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-14 items-start">

          {/* ====================================================
              PRODUCT GALLERY
          ==================================================== */}

          <section className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="relative">

              <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center">

                <img
                  src={
                    imageGallery[activeImageIndex] ||
                    FALLBACK_IMAGE
                  }
                  alt={product.name || 'Product image'}
                  onError={handleImageError}
                  className="w-full h-full object-contain p-4 sm:p-8 lg:p-10"
                />

                {/* Discount Badge */}

                {discount !== null && !isOutOfStock && (
                  <span className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold tracking-wide">
                    {discount}% OFF
                  </span>
                )}

                {/* Stock Badge */}

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-[0.12em]">
                      Out of Stock
                    </span>
                  </div>
                )}

                {/* Previous Image */}

                {imageGallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      aria-label="Previous product image"
                      className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={goToNextImage}
                      aria-label="Next product image"
                      className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}

              {imageGallery.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {imageGallery.map(
                    (image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() =>
                          setActiveImageIndex(index)
                        }
                        aria-label={`View product image ${
                          index + 1
                        }`}
                        aria-current={
                          index === activeImageIndex
                        }
                        className={`relative w-[68px] h-[68px] sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-50 transition-all ${
                          index === activeImageIndex
                            ? 'border-2 border-slate-900'
                            : 'border border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={image}
                          alt=""
                          onError={handleImageError}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  )}
                </div>
              )}

              {/* Image Counter */}

              {imageGallery.length > 1 && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  {activeImageIndex + 1} /{' '}
                  {imageGallery.length}
                </p>
              )}
            </div>
          </section>

          {/* ====================================================
              PRODUCT INFORMATION
          ==================================================== */}

          <section className="lg:col-span-5">

            {/* Category / Badge */}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-[0.1em]">
                {product.category || 'General'}
              </span>

              {product.badge && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-[0.1em]">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Product Name */}

            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-bold tracking-tight leading-[1.12] text-slate-950">
              {product.name}
            </h1>

            {/* Price */}

            <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                ₱{formatPrice(currentPrice)}
              </span>

              {comparePrice > currentPrice && (
                <span className="text-base sm:text-lg text-slate-400 line-through mb-1">
                  ₱{formatPrice(comparePrice)}
                </span>
              )}
            </div>

            {/* Stock Status */}

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOutOfStock
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
              />

              <span
                className={`text-sm font-semibold ${
                  isOutOfStock
                    ? 'text-red-600'
                    : 'text-emerald-700'
                }`}
              >
                {isOutOfStock
                  ? 'Currently unavailable'
                  : availableStock < 10
                  ? `Only ${availableStock} remaining`
                  : 'In stock'}
              </span>
            </div>

            {/* Divider */}

            <div className="my-7 border-t border-slate-200" />

            {/* ==================================================
                VARIANTS
            ================================================== */}

            <div className="space-y-7">

              {/* Color */}

              {colors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <label className="text-sm font-bold text-slate-900">
                      Color
                    </label>

                    {selectedColor && (
                      <span className="text-sm text-slate-500">
                        {selectedColor}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setSelectedColor(color)
                        }
                        disabled={isOutOfStock}
                        aria-pressed={
                          selectedColor === color
                        }
                        className={`min-h-11 px-4 rounded-lg border text-sm font-semibold transition-all ${
                          selectedColor === color
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size */}

              {sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <label className="text-sm font-bold text-slate-900">
                      Size
                    </label>

                    {selectedSize && (
                      <span className="text-sm text-slate-500">
                        {selectedSize}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setSelectedSize(size)
                        }
                        disabled={isOutOfStock}
                        aria-pressed={
                          selectedSize === size
                        }
                        className={`min-w-12 min-h-11 px-4 rounded-lg border text-sm font-semibold transition-all ${
                          selectedSize === size
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="product-quantity"
                    className="text-sm font-bold text-slate-900"
                  >
                    Quantity
                  </label>

                  {quantityInCart > 0 && (
                    <span className="text-xs text-slate-500">
                      {quantityInCart} already in cart
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  {/* Quantity Controller */}

                  <div className="h-12 w-full sm:w-32 flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(-1)
                      }
                      disabled={
                        quantity <= 1 ||
                        isOutOfStock ||
                        maxSelectable <= 0
                      }
                      aria-label="Decrease quantity"
                      className="w-11 h-full flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </button>

                    <div
                      id="product-quantity"
                      className="flex-1 text-center text-sm font-bold text-slate-900"
                      aria-live="polite"
                    >
                      {quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(1)
                      }
                      disabled={
                        quantity >= maxSelectable ||
                        isOutOfStock ||
                        maxSelectable <= 0
                      }
                      aria-label="Increase quantity"
                      className="w-11 h-full flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Add To Cart */}

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={
                      isOutOfStock ||
                      missingOptions ||
                      isDispatching ||
                      isMaxStockReached ||
                      quantity < 1
                    }
                    className="flex-1 min-h-12 px-5 rounded-lg bg-slate-900 text-white flex items-center justify-center gap-2.5 text-sm font-bold hover:bg-slate-800 active:bg-slate-950 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    {isDispatching ? (
                      <>
                        <RefreshCw
                          size={17}
                          className="animate-spin"
                        />
                        Adding to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={17} />

                        {isOutOfStock
                          ? 'Out of Stock'
                          : isMaxStockReached
                          ? 'Maximum Quantity Reached'
                          : missingOptions
                          ? 'Select Options'
                          : 'Add to Cart'}
                      </>
                    )}
                  </button>
                </div>

                {/* Variant Notice */}

                {missingOptions && !isOutOfStock && (
                  <p className="mt-3 text-xs text-amber-600">
                    Please select all available product
                    options before adding this item to your
                    cart.
                  </p>
                )}
              </div>
            </div>

            {/* ==================================================
                PRODUCT INFORMATION TABS
            ================================================== */}

            <div className="mt-9 border-t border-slate-200">

              <div className="flex border-b border-slate-200">
                {[
                  {
                    id: 'description' as ProductTab,
                    label: 'Description',
                  },
                  {
                    id: 'shipping' as ProductTab,
                    label: 'Shipping',
                  },
                  {
                    id: 'returns' as ProductTab,
                    label: 'Returns',
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`relative flex-1 min-h-12 px-2 text-xs sm:text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'text-slate-950'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}

                    {activeTab === tab.id && (
                      <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>

              <div className="py-6 text-sm leading-6 text-slate-600">

                {activeTab === 'description' && (
                  <div className="space-y-5">
                    <p>
                      {product.description ||
                        'This product is designed to provide dependable quality, practical performance, and everyday usability.'}
                    </p>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 mb-3">
                        Product Information
                      </h2>

                      <ul className="space-y-2.5">
                        <li className="flex gap-3">
                          <span className="text-slate-300">•</span>
                          <span>Quality materials and careful construction</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-slate-300">•</span>
                          <span>Designed for reliable everyday use</span>
                        </li>

                        {product.sku && (
                          <li className="flex gap-3">
                            <span className="text-slate-300">•</span>
                            <span>
                              SKU:{' '}
                              <span className="font-mono font-semibold text-slate-800">
                                {product.sku}
                              </span>
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Truck
                          size={19}
                          className="text-slate-800"
                        />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Standard Delivery
                        </h2>
                        <p className="mt-1">
                          Standard delivery is available across the Philippines. Estimated delivery is within 3–5 business days, subject to location and courier availability.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'returns' && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                        <RotateCcw
                          size={19}
                          className="text-slate-800"
                        />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Return Policy
                        </h2>
                        <p className="mt-1">
                          Eligible items may be returned within 30 days, provided they remain in their original condition and meet the applicable return requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                TRUST / SERVICE INFORMATION
            ================================================== */}

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-slate-200 rounded-xl p-4">
                <ShieldCheck
                  size={20}
                  className="text-slate-800 mb-3"
                />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  Secure Checkout
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Secure purchasing experience.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <Truck
                  size={20}
                  className="text-slate-800 mb-3"
                />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  Reliable Delivery
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Delivery support across the Philippines.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <Package
                  size={20}
                  className="text-slate-800 mb-3"
                />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  Quality Products
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Carefully presented product information.
                </p>
              </div>
            </div>

          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;
