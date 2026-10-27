import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Leaf,
  Heart,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import '../index.css';

// ================================================================
// TYPES & INTERFACES (Fully Synchronized with Dashboard Schema)
// ================================================================

interface CategoryCard {
  id: number | string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  path: string;
  fontFamily?: string;
}

interface StatItem {
  number: string;
  label: string;
}

interface HeroConfig {
  badgeText: string;
  badgeFontFamily?: string;
  titleTop: string;
  titleBottom: string;
  titleFontFamily?: string;
  heading: string;
  headingFontFamily?: string;
  narrative: string;
  narrativeFontFamily?: string;
  ctaText: string;
  ctaPath: string;
  background?: { type: string; source: string; fallbackImage: string };
}

interface CarouselConfig {
  eyebrow: string;
  title: string;
  cards: CategoryCard[];
}

interface StatsConfig {
  eyebrow: string;
  heading: string;
  items: StatItem[];
}

interface ContactConfig {
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  messenger?: string;
}

interface HomeContent {
  hero: HeroConfig;
  carousel: CarouselConfig;
  stats: StatsConfig;
  contacts?: ContactConfig;
}

// ================================================================
// ROOSTER LOGO (Custom Inline SVG)
// ================================================================

interface RoosterLogoProps {
  className?: string;
  light?: boolean;
}

const RoosterLogo: React.FC<RoosterLogoProps> = ({
  className = 'w-12 h-12',
  light = false,
}) => {
  const ink = light ? '#FFF8E9' : '#294B35';
  const accent = light ? '#E9BD75' : '#C77B3B';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="EGB Backyard rooster logo"
    >
      <path
        d="M43 19C36 11 39 4 46 8C52 10 53 15 53 18C58 9 66 10 65 17C64 22 59 25 54 27"
        fill={accent}
      />
      <path
        d="M57 44C70 25 83 31 78 42C91 36 95 48 84 53C94 57 87 68 75 64L62 58"
        fill={ink}
      />
      <path
        d="M27 57C26 42 39 28 53 29C67 30 73 42 69 54C66 66 56 75 43 74C31 73 23 66 27 57Z"
        fill={ink}
      />
      <path
        d="M35 53C43 43 57 43 63 53C57 62 46 66 36 62"
        fill={accent}
      />
      <path
        d="M39 36C36 29 39 20 48 20C56 20 60 27 57 35L53 44L40 45Z"
        fill={ink}
      />
      <path d="M55 26L67 31L56 35Z" fill={accent} />
      <circle cx="49" cy="27" r="2.4" fill={accent} />
      <path
        d="M49 36C45 40 49 45 53 41L55 35"
        fill={accent}
      />
      <path
        d="M40 72L39 81M56 71L58 81M34 82H44M53 82H63"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M19 88H81"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ================================================================
// MAIN HOME COMPONENT
// ================================================================

const Home: React.FC = () => {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const dragCurrentX = useRef<number | null>(null);
  const hasDragged = useRef(false);

  const fetchHomeContent = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get('/api/v1/home');
      const raw = response.data?.data ?? response.data?.content ?? response.data;
      if (!raw || typeof raw !== 'object' || !raw.hero || !raw.carousel) {
        throw new Error('The homepage API returned incomplete content.');
      }
      const cards = Array.isArray(raw.carousel.cards) ? raw.carousel.cards : [];
      const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
      setContent({
        hero: raw.hero,
        carousel: { ...raw.carousel, cards },
        stats: { ...stats, items: Array.isArray(stats.items) ? stats.items : [] },
        contacts: raw.contacts && typeof raw.contacts === 'object' ? raw.contacts : {},
      } as HomeContent);
    } catch (err) {
      console.error('[Home] Failed to load live homepage content.', err);
      setContent(null);
      setLoadError('We could not load the live homepage content. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHomeContent();
  }, [fetchHomeContent]);

  const categories = content?.carousel.cards ?? [];
  const totalCards = categories.length;

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(totalCards ? (index + totalCards) % totalCards : 0);
    },
    [totalCards]
  );

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (totalCards ? (prev + 1) % totalCards : 0));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) =>
      totalCards === 0 ? 0 : prev === 0 ? totalCards - 1 : prev - 1
    );
  }, [totalCards]);

  useEffect(() => {
    if (isDragging || isHovering || totalCards === 0) return;
    const interval = window.setInterval(goNext, 6000);
    return () => window.clearInterval(interval);
  }, [goNext, isDragging, isHovering, totalCards]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragCurrentX.current = e.clientX;
    hasDragged.current = false;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartX.current === null) return;
    dragCurrentX.current = e.clientX;
    if (Math.abs(e.clientX - dragStartX.current) > 8) {
      hasDragged.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!isDragging || dragStartX.current === null || dragCurrentX.current === null) {
      setIsDragging(false);
      return;
    }
    const distance = dragStartX.current - dragCurrentX.current;
    if (Math.abs(distance) > 50) {
      if (distance > 0) goNext();
      else goPrev();
    }
    dragStartX.current = null;
    dragCurrentX.current = null;
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    dragStartX.current = null;
    dragCurrentX.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F0] px-6 text-[#294B35]" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#294B35]/15 border-t-[#C77B3B]" />
          <p className="font-serif text-2xl font-bold">Loading EGB Backyard...</p>
          <p className="text-sm text-[#75816B]">Fetching the latest homepage content.</p>
        </div>
      </main>
    );
  }

  if (loadError || !content) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F0] px-6 text-[#294B35]">
        <div className="max-w-md rounded-3xl border border-[#294B35]/10 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-black">Homepage temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#75816B]">{loadError || 'Live homepage content is not available.'}</p>
          <button type="button" onClick={() => void fetchHomeContent()} className="mt-6 rounded-full bg-[#294B35] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#C77B3B]">Try again</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF8F0] text-[#294B35] selection:bg-[#D7A86E] selection:text-[#243B2B]">
      
      {/* ANNOUNCEMENT BAR */}
      <div className="bg-[#294B35] px-4 py-2.5 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-[0.19em] text-[#FFF8E9]">
        <span className="inline-flex items-center justify-center gap-2">
          <Leaf className="h-3.5 w-3.5 text-[#E9BD75]" />
          {content.hero.badgeText}
          <Leaf className="h-3.5 w-3.5 text-[#E9BD75]" />
        </span>
      </div>

      {/* HEADER */}
      <header className="relative z-50 border-b border-[#294B35]/10 bg-[#FAF8F0]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="EGB Backyard home" onClick={() => setMenuOpen(false)}>
            <RoosterLogo className="h-11 w-11 sm:h-14 sm:w-14 transition-transform duration-300 group-hover:-rotate-6" />
            <div className="leading-none">
              <div className="font-serif text-xl font-black tracking-[-0.06em] text-[#294B35] sm:text-2xl">
                EGB <span className="text-[#C77B3B]">Backyard</span>
              </div>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.21em] text-[#75816B] sm:text-[9px]">
                Poultry & Backyard Living
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex lg:gap-9">
            <Link to="/" className="text-xs font-bold text-[#294B35] transition-colors hover:text-[#C77B3B]">Home</Link>
            <Link to="/shop" className="text-xs font-semibold text-[#6E7767] transition-colors hover:text-[#C77B3B]">Shop All</Link>
            <a href="#categories" className="text-xs font-semibold text-[#6E7767] transition-colors hover:text-[#C77B3B]">Our Birds</a>
            <a href="#about" className="text-xs font-semibold text-[#6E7767] transition-colors hover:text-[#C77B3B]">About Us</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/dashboard/home" className="inline-flex items-center gap-1.5 rounded-full border border-[#294B35]/20 bg-transparent px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#294B35] transition-colors hover:bg-[#294B35] hover:text-white">
              Customize
            </Link>
            <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-[#294B35] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-[#C77B3B]">
              Browse Birds <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((prev) => !prev)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#294B35]/15 text-[#294B35] transition-colors hover:bg-[#294B35] hover:text-white md:hidden">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="absolute left-0 right-0 top-full border-b border-[#294B35]/10 bg-[#FAF8F0] px-5 pb-5 pt-2 shadow-lg md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              <Link to="/" onClick={() => setMenuOpen(false)} className="border-b border-[#294B35]/10 py-3.5 text-sm font-semibold">Home</Link>
              <Link to="/shop" onClick={() => setMenuOpen(false)} className="border-b border-[#294B35]/10 py-3.5 text-sm font-semibold">Shop All Birds</Link>
              <a href="#categories" onClick={() => setMenuOpen(false)} className="border-b border-[#294B35]/10 py-3.5 text-sm font-semibold">Our Categories</a>
              <a href="#about" onClick={() => setMenuOpen(false)} className="border-b border-[#294B35]/10 py-3.5 text-sm font-semibold">About EGB Backyard</a>
              <Link to="/dashboard/home" onClick={() => setMenuOpen(false)} className="py-3.5 text-sm font-semibold text-[#C77B3B]">Customize Homepage (Dashboard)</Link>
            </div>
          </nav>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative isolate overflow-hidden bg-[#F0EBDD]">
        <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-[#D9C9A7]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#9CAA85]/20 blur-3xl" />

        <div className="relative mx-auto grid min-h-[590px] max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 md:min-h-[650px] md:grid-cols-[0.92fr_1.08fr] md:gap-8 lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#294B35]/15 bg-white/60 px-3.5 py-2">
              <span className="h-2 w-2 rounded-full bg-[#C77B3B]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#526B4E] sm:text-[10px]" style={{ fontFamily: content.hero.badgeFontFamily || 'inherit' }}>
                {content.hero.badgeText}
              </span>
            </div>

            <h1 className="font-serif text-[clamp(3.3rem,8vw,6.5rem)] font-black leading-[0.91] tracking-[-0.065em] text-[#294B35]" style={{ fontFamily: content.hero.titleFontFamily || 'inherit' }}>
              {content.hero.titleTop}
              <br />
              <span className="relative inline-block text-[#C77B3B]">
                {content.hero.titleBottom}
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 15" fill="none" aria-hidden="true">
                  <path d="M4 10C83 1 208 1 296 7" stroke="#C77B3B" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-md text-sm leading-7 text-[#667260] sm:text-base sm:leading-8" style={{ fontFamily: content.hero.narrativeFontFamily || 'inherit' }}>
              {content.hero.narrative}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={content.hero.ctaPath} className="group inline-flex items-center gap-3 rounded-full bg-[#294B35] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-white shadow-lg shadow-[#294B35]/10 transition-all duration-300 hover:-translate-y-1 hover:bg-[#C77B3B] sm:px-7">
                {content.hero.ctaText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/dashboard/home" className="inline-flex items-center gap-2 px-3 py-3 text-xs font-bold text-[#294B35] transition-colors hover:text-[#C77B3B]">
                <RefreshCw className="h-3.5 w-3.5" /> Customize in Dashboard
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#294B35]/10 pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#71845E]" />
                <span className="text-[10px] font-semibold text-[#667260] sm:text-xs">Quality-Focused Care</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#C77B3B]" />
                <span className="text-[10px] font-semibold text-[#667260] sm:text-xs">For Every Backyard</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px] md:ml-auto">
            <div className="absolute -inset-4 rotate-3 rounded-[2.5rem] border border-[#C77B3B]/25 sm:-inset-5" />
            <div className="relative h-[360px] overflow-hidden rounded-[2rem] bg-[#D7C6A4] shadow-2xl shadow-[#294B35]/15 sm:h-[470px] md:h-[500px] lg:h-[560px]">
              {content.hero.background?.source ? (
                <img src={content.hero.background.source} alt="" className="h-full w-full object-cover" fetchPriority="high" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#E8E2D3] p-6 text-center text-sm text-[#75816B]">No hero image configured.</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#182B1E]/85 via-[#182B1E]/20 to-transparent" />

              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-2xl border border-white/40 bg-[#FAF8F0]/90 px-3 py-2.5 shadow-lg backdrop-blur-md sm:left-7 sm:top-7 sm:px-4 sm:py-3">
                <RoosterLogo className="h-9 w-9" />
                <div>
                  <p className="font-serif text-sm font-black text-[#294B35]">EGB Backyard</p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-[#75816B]">Our little farm</p>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#E9BD75] sm:text-[10px]" style={{ fontFamily: content.hero.headingFontFamily || 'inherit' }}>
                  {content.hero.heading}
                </p>
                <h2 className="mt-2 max-w-sm font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Growing your flock, one bird at a time.
                </h2>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-2 flex h-24 w-24 -rotate-12 flex-col items-center justify-center rounded-full border-4 border-[#FAF8F0] bg-[#C77B3B] text-center text-white shadow-lg sm:-bottom-7 sm:-left-6 sm:h-28 sm:w-28">
              <RoosterLogo className="h-8 w-8" light />
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em]">Backyard</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.15em]">Goodness</span>
            </div>
          </div>
        </div>
        <div className="h-2 bg-[#294B35]" />
      </section>

      {/* CATEGORY INTRODUCTION */}
      <section id="categories" className="scroll-mt-24 bg-[#FAF8F0] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px w-8 bg-[#C77B3B]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C77B3B]">{content.carousel.eyebrow}</span>
              </div>
              <h2 className="font-serif text-4xl font-black leading-tight tracking-[-0.045em] text-[#294B35] sm:text-5xl md:text-6xl">
                {content.carousel.title}
              </h2>
            </div>
            <div className="max-w-md">
              <p className="text-sm leading-7 text-[#75816B]">
                Explore our birds configured via the dashboard and discover which ones fit your home or farm needs.
              </p>
              <Link to="/shop" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#294B35] transition-colors hover:text-[#C77B3B]">
                Browse the shop <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {categories.map((category, index) => (
              <article key={category.id || index} className="group relative overflow-hidden rounded-[1.75rem] border border-[#294B35]/10 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#294B35]/10">
                <Link to={category.path || '/shop'} aria-label={`Explore ${category.title}`} className="relative block h-[260px] overflow-hidden bg-[#E8E2D3] sm:h-[300px]">
                  <img src={category.image} alt={category.title} loading="lazy" draggable={false} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#182B1E]/55 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-[#FAF8F0]/90 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.17em] text-[#294B35] backdrop-blur-md sm:left-5 sm:top-5">
                    {category.subtitle}
                  </span>
                  <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF8F0] text-[#294B35] shadow-md transition-all duration-300 group-hover:rotate-45 group-hover:bg-[#C77B3B] group-hover:text-white sm:bottom-5 sm:right-5">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </Link>
                <div className="p-5 sm:p-6">
                  <span className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#C77B3B]">Category 0{index + 1}</span>
                  <h3 className="mt-1.5 font-serif text-2xl font-black tracking-tight text-[#294B35] sm:text-3xl" style={{ fontFamily: category.fontFamily || 'inherit' }}>
                    {category.title}
                  </h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#75816B]">{category.description}</p>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#294B35]/10 pt-4">
                    <span className="text-[10px] font-semibold text-[#75816B]">Quality birds, honest prices</span>
                    <Link to={category.path || '/shop'} className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#294B35] transition-colors hover:text-[#C77B3B]">
                      Shop <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CATEGORY CAROUSEL */}
      <section className="overflow-hidden bg-[#294B35] px-5 py-16 text-[#FAF8F0] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-8 bg-[#E9BD75]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#E9BD75]">{content.carousel.eyebrow}</span>
              </div>
              <h2 className="font-serif text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                A bird for<br />every<br /><span className="text-[#E9BD75]">backyard.</span>
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#E0E7D9]/80">
                Managed from your dashboard database. Swipe or use controls to browse current selections.
              </p>
              <div className="mt-7 flex items-center gap-3">
                <button type="button" onClick={goPrev} aria-label="Previous category" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-all hover:border-[#E9BD75] hover:bg-[#E9BD75] hover:text-[#294B35]">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={goNext} aria-label="Next category" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-all hover:border-[#E9BD75] hover:bg-[#E9BD75] hover:text-[#294B35]">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="ml-2 text-xs font-semibold tracking-widest text-[#E0E7D9]/70">
                  {String(activeIndex + 1).padStart(2, '0')} <span className="mx-2 text-[#E9BD75]">/</span> {String(totalCards).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-5 flex gap-2">
                {categories.map((category, index) => (
                  <button key={category.id || index} type="button" onClick={() => goTo(index)} aria-label={`Show ${category.title}`} aria-pressed={activeIndex === index} className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === index ? 'w-10 bg-[#E9BD75]' : 'w-3 bg-white/25 hover:bg-white/50'}`} />
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl select-none" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onKeyDown={handleKeyDown} role="region" aria-roledescription="carousel" aria-label="Featured poultry categories" tabIndex={0} style={{ touchAction: 'pan-y' }}>
              <div className="relative h-[400px] sm:h-[470px]">
                {categories.map((category, index) => {
                  const relative = (index - activeIndex + totalCards) % totalCards;
                  const isActive = relative === 0;
                  const isNext = relative === 1;
                  const isPrevious = relative === totalCards - 1;
                  if (!isActive && !isNext && !isPrevious) return null;
                  const translate = isActive ? 'translateX(0%) scale(1)' : isNext ? 'translateX(55%) scale(0.76)' : 'translateX(-55%) scale(0.76)';
                  return (
                    <div key={category.id || index} className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out" style={{ transform: translate, opacity: isActive ? 1 : 0.38, zIndex: isActive ? 20 : 10, pointerEvents: isActive ? 'auto' : 'none' }}>
                      <article className={`relative h-[360px] w-[78%] max-w-[390px] overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#F0EBDD] shadow-2xl shadow-black/20 sm:h-[420px] ${isActive ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                        <img src={category.image} alt={category.title} draggable={false} loading="lazy" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#15261A]/95 via-[#15261A]/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                          <span className="text-[9px] font-bold uppercase tracking-[0.23em] text-[#E9BD75]">{category.subtitle}</span>
                          <h3 className="mt-2 font-serif text-3xl font-black text-white sm:text-4xl" style={{ fontFamily: category.fontFamily || 'inherit' }}>{category.title}</h3>
                          <p className="mt-2 line-clamp-3 text-xs leading-6 text-white/90 sm:text-sm">{category.description}</p>
                          <Link to={category.path || '/shop'} onClick={(e) => { if (hasDragged.current) e.preventDefault(); }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FAF8F0] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#294B35] transition-colors hover:bg-[#E9BD75]">
                            Explore Category <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/50">Swipe or use the arrows to explore</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS & DIFFERENCE SECTION */}
      <section className="bg-[#FAF8F0] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-[#C77B3B]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#C77B3B]">{content.stats.eyebrow}</span>
              <span className="h-px w-8 bg-[#C77B3B]" />
            </div>
            <h2 className="font-serif text-3xl font-black tracking-tight text-[#294B35] sm:text-4xl md:text-5xl">
              {content.stats.heading}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#75816B]">Values configured live through your dashboard content manager.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {(content.stats.items || []).map((stat, index) => (
              <article key={index} className="group rounded-[1.5rem] border border-[#294B35]/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C77B3B]/40 hover:shadow-lg hover:shadow-[#294B35]/5 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8EBDD] text-[#426044] transition-colors duration-300 group-hover:bg-[#294B35] group-hover:text-white font-serif font-black text-lg">
                  {stat.number || `0${index + 1}`}
                </div>
                <span className="mt-6 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#C77B3B]">Metric Value</span>
                <p className="mt-3 text-sm leading-7 text-[#75816B]">{stat.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#C77B3B] px-6 py-12 text-center sm:px-12 sm:py-16 md:py-20">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/15 sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute -bottom-36 -left-16 h-72 w-72 rounded-full border border-white/15 sm:h-96 sm:w-96" />

          <div className="relative z-10 mx-auto max-w-2xl">
            <RoosterLogo className="mx-auto h-16 w-16" light />
            <span className="mt-4 block text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">Your Backyard Journey Starts Here</span>
            <h2 className="mt-4 font-serif text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">
              Ready to find<br />your next flock?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/85 sm:text-base">
              From roasters to hens and baby chickens, explore EGB Backyard and find the birds you have been looking for.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/shop" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#FAF8F0] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-[#294B35] transition-all hover:-translate-y-0.5 hover:bg-white">
                Shop Our Birds <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/dashboard/home" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-white transition-colors hover:bg-white/10">
                Dashboard Customizer <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS CONTACT & SOCIAL LINKS */}
      <section className="bg-[#F0EBDD] px-5 py-14 sm:px-8 sm:py-16 lg:px-12" aria-labelledby="business-contact-heading">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#C77B3B]">Stay connected</p>
              <h2 id="business-contact-heading" className="mt-2 font-serif text-3xl font-black text-[#294B35] sm:text-4xl">Contact EGB Backyard</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#75816B]">Use the business contact details and social platforms configured by the administrator.</p>
            </div>
            <div className="flex gap-2">
              <a href="#business-contact-heading" onClick={(e) => { const el = e.currentTarget.closest('section')?.querySelector('[data-contact-track]'); if (el) el.scrollBy({ left: -280, behavior: 'smooth' }); else e.preventDefault(); }} aria-label="Previous contact links" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#294B35]/20 bg-white text-[#294B35] hover:bg-[#294B35] hover:text-white">‹</a>
              <a href="#business-contact-heading" onClick={(e) => { const el = e.currentTarget.closest('section')?.querySelector('[data-contact-track]'); if (el) el.scrollBy({ left: 280, behavior: 'smooth' }); else e.preventDefault(); }} aria-label="Next contact links" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#294B35]/20 bg-white text-[#294B35] hover:bg-[#294B35] hover:text-white">›</a>
            </div>
          </div>
          <div data-contact-track className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {[
              { label: 'Phone', value: content.contacts?.phone, href: content.contacts?.phone ? `tel:${content.contacts.phone.replace(/\s+/g, '')}` : '', detail: 'Call our business' },
              { label: 'Email', value: content.contacts?.email, href: content.contacts?.email ? `mailto:${content.contacts.email}` : '', detail: 'Send us a message' },
              { label: 'Visit Us', value: content.contacts?.address, href: '', detail: 'Business location' },
              { label: 'Facebook', value: content.contacts?.facebook, href: content.contacts?.facebook || '', detail: 'Follow our updates' },
              { label: 'Instagram', value: content.contacts?.instagram, href: content.contacts?.instagram || '', detail: 'See our photos' },
              { label: 'TikTok', value: content.contacts?.tiktok, href: content.contacts?.tiktok || '', detail: 'Watch our videos' },
              { label: 'Messenger', value: content.contacts?.messenger, href: content.contacts?.messenger || '', detail: 'Chat with us' },
            ].filter((item) => Boolean(item.value)).map((item) => {
              const external = /^https?:\/\//i.test(item.href);
              const card = (
                <div className="h-full min-h-36 rounded-2xl border border-[#294B35]/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#C77B3B]">{item.label}</span>
                  <p className="mt-3 break-words text-sm font-bold text-[#294B35]">{item.value}</p>
                  <p className="mt-2 text-xs text-[#75816B]">{item.detail}</p>
                </div>
              );
              return item.href ? <a key={item.label} href={item.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="min-w-[230px] max-w-[280px] flex-1 snap-start">{card}</a> : <div key={item.label} className="min-w-[230px] max-w-[280px] flex-1 snap-start">{card}</div>;
            })}
            {!['phone','email','address','facebook','instagram','tiktok','messenger'].some((key) => Boolean((content.contacts as any)?.[key])) && (
              <div className="w-full rounded-2xl border border-dashed border-[#294B35]/20 bg-white/70 p-6 text-sm text-[#75816B]">Business contact and social links have not been configured in the dashboard yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#203B2A] px-5 pb-8 pt-12 text-[#FAF8F0] sm:px-8 sm:pt-14 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr] lg:gap-16">
            <div>
              <Link to="/" className="inline-flex items-center gap-3" aria-label="EGB Backyard home">
                <RoosterLogo className="h-14 w-14" light />
                <div>
                  <p className="font-serif text-2xl font-black tracking-tight text-white">EGB Backyard</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E9BD75]">Poultry & Backyard Living</p>
                </div>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
                Your neighborhood poultry shop for roasters, hens, and baby or small chickens. Helping backyard flocks grow, one bird at a time.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-white/75">
                <Leaf className="h-4 w-4 text-[#E9BD75]" /> Good Birds. Honest Care. Backyard Roots.
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E9BD75]">Quick Links</h3>
              <nav className="mt-5 flex flex-col items-start gap-3.5">
                <Link to="/" className="text-sm text-white/70 transition-colors hover:text-white">Home</Link>
                <Link to="/shop" className="text-sm text-white/70 transition-colors hover:text-white">Shop All</Link>
                <Link to="/dashboard/home" className="text-sm text-[#E9BD75] transition-colors hover:text-white">Homepage Dashboard</Link>
                <a href="#categories" className="text-sm text-white/70 transition-colors hover:text-white">Our Categories</a>
              </nav>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E9BD75]">Visit Our Backyard</h3>
              <p className="mt-5 text-sm leading-7 text-white/70">Your Local Poultry Shop</p>
              <p className="mt-2 text-sm leading-7 text-white/70">Contact us via Dashboard or Shop</p>
              <Link to="/shop" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#E9BD75] transition-colors hover:text-white">
                Browse Available Birds <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-[10px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} EGB Backyard. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Made with <Heart className="h-3 w-3 fill-[#C77B3B] text-[#C77B3B]" /> for every backyard flock.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
