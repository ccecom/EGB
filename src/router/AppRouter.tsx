import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';

// === GLOBAL LAYOUT ===
import Navbar from '../components/layout/Navbar';

// === LAZY LOADED PAGES ===
const Home = lazy(() => import('../pages/Home'));
const Shop = lazy(() => import('../pages/Shop'));
const MiniGame = lazy(() => import('../pages/MiniGame'));
const CategoryPage = lazy(() => import('../pages/CategoryPage'));

const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const CartPage = lazy(() => import('../pages/CartPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const OrderPage = lazy(() => import('../pages/OrderPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const VerifyPage = lazy(() => import('../pages/VerifyPage'));
const About = lazy(() => import('../pages/About'));
const Support = lazy(() => import('../pages/Support'));
const Collab = lazy(() => import('../pages/Collab'));
const Legal = lazy(() => import('../pages/Legal'));
const NotFound = lazy(() => import('../pages/NotFound'));

// HELPER: SCROLL TO TOP ON ROUTE CHANGE
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

// LOADER: THREE DOTS WAVING SPINNER
const ThreeDotsWave: React.FC = () => (
  <div className="w-full min-h-[50vh] flex items-center justify-center bg-transparent">
    <div className="flex items-center space-x-1.5">
      <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
      <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
      <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
    </div>
  </div>
);

// ERROR BOUNDARY
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error('ErrorBoundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-500 text-xs uppercase tracking-widest font-mono font-bold mb-2">
            ⚠️ CORE_RENDER_CRASH
          </p>
          <h2 className="text-xl font-bold mb-2">Interface execution failed</h2>
          <p className="text-gray-500 text-xs mb-6 max-w-sm">
            An unexpected runtime adjustment disconnected the panel view logic.
          </p>
          <button
            onClick={() => (window.location.href = '/login')}
            className="bg-black text-white text-xs uppercase px-6 py-3 font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// MAIN ROUTER SYSTEM
export const AppRouter = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <ThreeDotsWave />
      </div>
    );
  }

  // === UNAUTHENTICATED ROUTES ===
  if (!isAuthenticated || !user) {
    return (
      <ErrorBoundary>
        <ScrollToTop />
        <div className="min-h-screen bg-white text-gray-900 selection:bg-black selection:text-white flex flex-col justify-center">
          <Suspense fallback={<ThreeDotsWave />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  // === AUTHENTICATED ROUTES ===
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-white text-gray-900 selection:bg-black selection:text-white pb-24">
        <Navbar />

        <main className="flex-grow relative w-full">
          <Suspense fallback={<ThreeDotsWave />}>
            <Routes>
              {/* === STATIC / PUBLIC PAGES (still accessible when logged in) === */}
              <Route path="/about" element={<About />} />
              <Route path="/support" element={<Support />} />
              <Route path="/Legal" element={<Legal />} />
              <Route path="/Collab" element={<Collab />} />

              {/* === PROTECTED E-COMMERCE & APP SUITE === */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/mini-game" element={<MiniGame />} />
                <Route path="/category/all" element={<CategoryPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                
          
                
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrderPage />} />
                <Route path="/order/:id" element={<OrderPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* === REDIRECTS FOR LOGGED-IN USERS === */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/verify" element={<Navigate to="/" replace />} />

              {/* === 404 & FALLBACK === */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default AppRouter;
