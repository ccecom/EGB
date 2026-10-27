import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import ProductGrid from '../components/product/ProductGrid';

const BANNER_IMAGE = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80';
const CATEGORY_ALIASES = ['rooster', 'roosters', 'roaster', 'roasters', 'clothes', 'apparel'];

const ClothesPage: React.FC = () => {
  const { products, isLoading: isProductsLoading } = useProducts();

  const categoryProducts = useMemo(() => {
    return (products || []).filter((product: any) => {
      const category = String(product.category || '').trim().toLowerCase();
      return CATEGORY_ALIASES.includes(category);
    });
  }, [products]);

  return (
    <main className="min-h-screen bg-[#FAF8F0] px-4 pb-24 pt-8 font-sans text-[#294B35] selection:bg-[#D7A86E] sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#75816B] sm:text-xs">
          <Link to="/category/all" className="rounded px-1 hover:text-[#C77B3B] focus:outline-none focus:ring-2 focus:ring-[#C77B3B]">
            Categories
          </Link>
          <span aria-hidden="true" className="text-[#B9BBAA]">/</span>
          <span aria-current="page" className="px-1 font-extrabold text-[#294B35]">Rooster Collection</span>
        </nav>

        <header className="relative isolate h-44 w-full overflow-hidden rounded-2xl border border-[#294B35]/15 bg-[#203B2A] shadow-lg sm:h-56 md:h-60">
          <img
            src={BANNER_IMAGE}
            alt={`EGB Backyard ${title}`}
            loading="eager"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#15261A]/90 via-[#15261A]/60 to-[#15261A]/15" />
          <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-8">
            <span className="mb-2 inline-flex w-fit rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[10px]">
              EGB Backyard · Rooster Selection
            </span>
            <h1 className="max-w-2xl font-serif text-2xl font-black leading-tight text-white sm:text-4xl">
              Rooster Collection
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/90 sm:text-sm">
              Explore roosters for your backyard flock, breeding plans, and small farm.
            </p>
          </div>
        </header>

        <section className="space-y-5" aria-label="Rooster Catalog">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#294B35]/15 pb-4">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#526B4E] sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
              Rooster Catalog
            </h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#526B4E]">
              {categoryProducts.length} {categoryProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {isProductsLoading ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm font-semibold text-[#75816B]" role="status" aria-live="polite">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#C77B3B] border-t-transparent" />
              Loading products...
            </div>
          ) : categoryProducts.length > 0 ? (
            <ProductGrid products={categoryProducts} />
          ) : (
            <div className="space-y-2 rounded-2xl border border-dashed border-[#294B35]/20 bg-white px-5 py-12 text-center shadow-sm">
              <p className="text-sm font-bold text-[#294B35]">No products available in this collection yet.</p>
              <p className="text-xs text-[#75816B]">Please check back soon or explore another farm category.</p>
              <Link to="/category/all" className="mt-2 inline-flex rounded-full bg-[#294B35] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#203B2A] focus:outline-none focus:ring-2 focus:ring-[#C77B3B] focus:ring-offset-2">
                Browse all categories
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ClothesPage;
