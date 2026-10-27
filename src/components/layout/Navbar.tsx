import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Store,
  Search,
  User,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

// Custom Woven Bag / Bayong Icon SVG Component
const WovenBagIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className = "w-5 h-5",
  strokeWidth = 1.8,
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Curved Dual Handles */}
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      {/* Outer Woven Bag Body */}
      <path d="M4 8h16l-1.2 11.4a2 2 0 0 1-2 1.6H7.2a2 2 0 0 1-2-1.6L4 8z" />
      {/* Woven Cross-Hatch Lines */}
      <path d="M4 12h16" strokeDasharray="1.5 1.5" />
      <path d="M4.5 16h15" strokeDasharray="1.5 1.5" />
      <path d="M9 8v13" strokeDasharray="1.5 1.5" />
      <path d="M15 8v13" strokeDasharray="1.5 1.5" />
    </svg>
  );
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { totalItems: cartCount } = useCart() as any;

  // Handle Search Click: Redirect directly to shop page search input
  const handleSearchClick = () => {
    navigate('/shop?focusSearch=true');
  };

  // Hide navbar on authentication pages
  if (['/login', '/register', '/verify'].includes(location.pathname)) {
    return null;
  }

  // Check if search parameter is currently active on shop page
  const isSearchActive = location.pathname === '/shop' && location.search.includes('focusSearch');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-1 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between">

        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-black text-white' : ''
                }`}
              >
                <Home
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? 'font-bold' : ''
                }`}
              >
                Home
              </span>
            </>
          )}
        </NavLink>

        {/* Shop */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive && !isSearchActive
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive && !isSearchActive ? 'bg-black text-white' : ''
                }`}
              >
                <Store
                  className="w-5 h-5"
                  strokeWidth={isActive && !isSearchActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive && !isSearchActive ? 'font-bold' : ''
                }`}
              >
                Shop
              </span>
            </>
          )}
        </NavLink>

        {/* Search Icon Trigger - Redirects to Shop Search Bar */}
        <button
          type="button"
          onClick={handleSearchClick}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors focus:outline-none ${
            isSearchActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              isSearchActive ? 'bg-black text-white' : ''
            }`}
          >
            <Search
              className="w-5 h-5"
              strokeWidth={isSearchActive ? 2.3 : 1.8}
            />
          </div>

          <span
            className={`text-[10px] mt-0.5 font-medium ${
              isSearchActive ? 'font-bold' : ''
            }`}
          >
            Search
          </span>
        </button>

        {/* Cart with Custom Woven Bag Icon */}
        <NavLink
          to="/cart"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors relative ${
              isActive
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-lg transition-all relative ${
                  isActive ? 'bg-black text-white' : ''
                }`}
              >
                <WovenBagIcon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />

                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full border border-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? 'font-bold' : ''
                }`}
              >
                Cart
              </span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-black text-white' : ''
                }`}
              >
                <User
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? 'font-bold' : ''
                }`}
              >
                Profile
              </span>
            </>
          )}
        </NavLink>

      </div>
    </nav>
  );
};

export default Navbar;
