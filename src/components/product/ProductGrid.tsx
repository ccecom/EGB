import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Product } from '../../types/product';

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const IMAGE_FALLBACK = 'https://via.placeholder.com/400x500?text=No+Image';

/**
 * Robustly resolves a product's image for grid items supporting arrays, 
 * strings, or alternate property variations.
 */
function getProductImageUrl(product: any): string {
  let rawPath: any = null;

  if (Array.isArray(product?.images) && product.images.length > 0) {
    rawPath = product.images[0];
  } else if (typeof product?.images === 'string') {
    rawPath = product.images;
  } else if (typeof product?.imageUrl === 'string') {
    rawPath = product.imageUrl;
  } else if (typeof product?.image === 'string') {
    rawPath = product.image;
  }

  if (rawPath == null) return IMAGE_FALLBACK;
  const value = String(rawPath).trim();
  if (!value) return IMAGE_FALLBACK;

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

interface ProductGridProps {
  products: Product[];
  onResetFilters?: () => void;
}

// Helper to format currency
const formatPHP = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
};

// Helper to determine badge color based on text
const getBadgeStyles = (badgeStr: string) => {
  const lowerBadge = badgeStr.toLowerCase();
  if (lowerBadge.includes('sale')) return 'bg-red-600 text-white';
  if (lowerBadge.includes('prime')) return 'bg-blue-600 text-white';
  if (lowerBadge.includes('new')) return 'bg-emerald-500 text-white';
  if (lowerBadge.includes('best')) return 'bg-amber-500 text-white';
  return 'bg-slate-800 text-white';
};

// Helper to calculate discount percentage
const getDiscountPercentage = (price: number, compareAt?: number) => {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
};

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onResetFilters }) => {
  
  if (!products || products.length === 0) {
    return (
      <div className="w-full py-24 px-6 bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Search size={28} strokeWidth={1.5} />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500">
            We couldn't find any items matching your current filters. Try adjusting your search or category selection.
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all"
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {products.map((product) => {
        // @ts-ignore
        const productId = product._id || product.id; 
        const discount = getDiscountPercentage(product.price, product.compare_at_price);
        const hasSizes = product.sizes && product.sizes.length > 0;
        const hasColors = product.colors && product.colors.length > 0;
        
        return (
          <Link 
            key={productId} 
            to={`/product/${productId}`}
            className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            {/* Image Container */}
            <div className="relative w-full pt-[125%] bg-slate-50 overflow-hidden">
              
              {/* Badges Overlay */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1.5">
                {product.badge && (
                  <span className={`px-2.5 py-1 text-[9px] sm:text-[10px] uppercase font-extrabold tracking-widest rounded shadow-sm ${getBadgeStyles(product.badge)}`}>
                    {product.badge}
                  </span>
                )}
              </div>

              <img 
                src={getProductImageUrl(product)} 
                alt={product.name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = IMAGE_FALLBACK;
                }}
              />
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-5 flex flex-col flex-grow justify-between bg-sky-50 group-hover:bg-sky-100 transition-colors duration-300">
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-[9px] sm:text-[10px] text-sky-600 uppercase tracking-widest font-extrabold block">
                    {product.category || 'Product'}
                  </span>
                  
                  <div className="flex gap-1">
                    {hasColors && <span className="text-[9px] text-slate-500 font-medium">{product.colors?.length} Colors</span>}
                    {hasSizes && hasColors && <span className="text-[9px] text-slate-400">•</span>}
                    {hasSizes && <span className="text-[9px] text-slate-500 font-medium">{product.sizes?.length} Sizes</span>}
                  </div>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {product.name}
                </h3>
              </div>
              
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-sky-200/60">
                <div className="flex flex-col">
                  {discount && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">
                        -{discount}%
                      </span>
                      <span className="text-[10px] text-slate-400 line-through font-medium">
                        {formatPHP(product.compare_at_price!)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    {formatPHP(product.price)}
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider font-bold text-sky-600 group-hover:text-sky-800 transition-colors">
                  Explore &rarr;
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProductGrid;
