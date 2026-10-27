
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import ProductGrid from '../components/product/ProductGrid';

interface CategoryCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  categoryAliases: string[];
  accent: string;
}

const FIXED_CATEGORIES: CategoryCard[] = [
  {
    id: 'roosters',
    title: 'Rooster Collection',
    subtitle: 'Roosters',
    description:
      'Explore roosters for your backyard flock and breeding needs.',
    image: '/images/rooster.jpeg',
    categoryAliases: ['rooster', 'roosters', 'roaster', 'roasters'],
    accent: '#C77B3B',
  },
  {
    id: 'hens',
    title: 'Hen Collection',
    subtitle: 'Hens & Layers',
    description:
      'Discover hens and laying birds for your backyard farm.',
    image: '/images/hen.jpeg',
    categoryAliases: ['hen', 'hens', 'layer', 'layers'],
    accent: '#526B4E',
  },
  {
    id: 'chicks',
    title: 'Chick Collection',
    subtitle: 'Baby Chicks',
    description:
      'Start or grow your flock with chicks and young chickens.',
    image: '/images/check.jpeg',
    categoryAliases: [
      'chick',
      'chicks',
      'babychick',
      'babychicks',
      'chicken',
      'chickens',
      'babychicken',
      'babychickens',
    ],
    accent: '#B58A32',
  },
];

const normalizeCategory = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');

const CategoryPage: React.FC = () => {
  const { products, isLoading } = useProducts();
  const productList = products ?? [];

  const categoryProducts = useMemo(
    () =>
      FIXED_CATEGORIES.map((category) => ({
        ...category,
        products: productList.filter((product: any) =>
          category.categoryAliases.includes(
            normalizeCategory(product.category)
          )
        ),
      })),
    [productList]
  );

  return (
    <main className="min-h-screen bg-[#FAF8F0] px-4 pb-20 pt-8 text-[#294B35] selection:bg-[#D7A86E] sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-7xl">

        {/* Page header */}
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-[#294B35]/15 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#C77B3B]">
              EGB Backyard · Our Birds Collection
            </p>

            <h1 className="font-serif text-3xl font-black tracking-tight sm:text-5xl">
              Find your flock.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#75816B] sm:text-base">
              Browse our rooster, hen, and chick collections for your
              backyard farm.
            </p>
          </div>

          <div className="w-fit rounded-full border border-[#294B35]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#526B4E]">
            {productList.length} products available
          </div>
        </header>

        {/* Loading state */}
        {isLoading ? (
          <div
            className="flex min-h-40 items-center justify-center gap-3 text-sm font-semibold text-[#526B4E]"
            role="status"
            aria-live="polite"
          >
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#C77B3B]" />
            Loading available birds...
          </div>
        ) : (
          <div className="space-y-10">
            {categoryProducts.map((category) => (
              <section
                key={category.id}
                aria-labelledby={`${category.id}-heading`}
                className="space-y-4"
              >
                {/* Non-clickable category banner */}
                <div
                  className="relative isolate h-44 overflow-hidden rounded-2xl border border-[#294B35]/10 bg-[#294B35] shadow-md sm:h-52 md:h-56"
                  style={
                    {
                      '--category-accent': category.accent,
                    } as React.CSSProperties
                  }
                >
                  <img
                    src={category.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />

                  {/* Readable dark overlay */}
                  <div
                    className="absolute inset-0 -z-10 bg-gradient-to-r from-[#15261A]/95 via-[#15261A]/65 to-[#15261A]/15"
                    aria-hidden="true"
                  />

                  <div className="flex h-full flex-col justify-center p-5 sm:p-8">
                    <span className="mb-2 w-fit rounded-full border border-white/30 bg-black/20 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[10px]">
                      EGB Backyard · {category.subtitle}
                    </span>

                    <h2
                      id={`${category.id}-heading`}
                      className="max-w-xl font-serif text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl"
                    >
                      {category.title}
                    </h2>

                    <p className="mt-2 max-w-lg text-xs leading-5 text-white/90 sm:text-sm">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Category product cards */}
                {category.products.length > 0 ? (
                  <ProductGrid
                    products={category.products.slice(0, 4)}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[#294B35]/20 bg-white/70 px-4 py-7 text-center">
                    <p className="text-sm font-bold text-[#294B35]">
                      No products in this category yet.
                    </p>

                    <Link
                      to="/shop"
                      className="mt-2 inline-block text-xs font-bold text-[#C77B3B] hover:underline"
                    >
                      Browse all birds
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryPage;