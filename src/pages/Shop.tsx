import React, { useMemo, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import ProductGrid from '../components/product/ProductGrid';

export const Shop: React.FC = () => {
  const { products, isLoading } = useProducts();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Hook into URL search parameters
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract search and focus parameters
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';
  const shouldFocusSearch = searchParams.get('focusSearch') === 'true';

  // Handle input text changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchParams({});
    searchInputRef.current?.focus();
  };

  // Auto-focus shop page search bar on redirect from Navbar Search icon
  useEffect(() => {
    if (shouldFocusSearch || searchQuery) {
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [shouldFocusSearch, searchQuery]);

  // Filter products dynamically
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(searchQuery);
      const categoryMatch = p.category?.toLowerCase().includes(searchQuery);
      const descriptionMatch = p.description?.toLowerCase().includes(searchQuery);
      
      return nameMatch || categoryMatch || descriptionMatch;
    });
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-slate-800 p-6 sm:p-10 font-['Quincy',_serif] selection:bg-[#38bdf8]/20 pb-24">
      <div className="max-w-6xl mx-auto">
        
        {/* =========================================================
            TOP SEARCH BAR ON THE SHOP PAGE
        ========================================================== */}
        <div className="mb-8 font-sans">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              strokeWidth={2}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search products, categories..."
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Header Block & Categories Link */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-6 mb-10 gap-4 font-sans">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'Marketplace'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery 
                ? `Showing ${filteredProducts.length} items matching your search.` 
                : 'Browse our complete collection of premium items.'}
            </p>
          </div>
          
          <Link
            to="/category/all"
            className="group px-6 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>Browse Categories</span>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
          </Link>
        </div>

        {/* Content Body Area */}
        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-10 h-10 border-4 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="animate-fade-in font-sans">
            <ProductGrid products={filteredProducts} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 border border-slate-200 rounded-3xl bg-slate-50 font-sans">
            <span className="text-lg text-slate-900 font-bold mb-2">No matches found.</span>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              We couldn't find any products matching "{searchQuery}". Try checking for typos or searching with different keywords.
            </p>
            <button
              onClick={handleClearSearch}
              className="px-6 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;


  