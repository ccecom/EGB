import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { OrderProvider } from './context/OrderContext';

// ========== APPLY THEME BEFORE ANYTHING RENDERS ==========
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
// ========================================================

(window as any).useAuth = useAuth;

const AuthenticatedProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? (user as any)?._id ?? null;

  return (
    <CartProvider userId={userId}>
      <CheckoutProvider userId={userId}>
        <OrderProvider userId={userId}>
          {children}
        </OrderProvider>
      </CheckoutProvider>
    </CartProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductProvider>
        <AuthenticatedProviders>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthenticatedProviders>
      </ProductProvider>
    </AuthProvider>
  </React.StrictMode>
);