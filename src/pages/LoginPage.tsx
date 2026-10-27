import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertTriangle, CheckCircle2, ChevronRight, UserPlus, Info, ShieldAlert } from 'lucide-react';

// Email Validation Regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Reusable Animated Input Component (Matching Register Page UI)
const AnimatedInput = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  error = false,
  maxLength,
  icon = null,
  inputRef,
  ...props 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || (value && value.toString().length > 0);

  return (
    <div className="relative mb-4 w-full">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        maxLength={maxLength}
        className={`w-full px-3 pt-[22px] pb-2 border rounded-[4px] outline-none text-[14px] transition-all bg-white text-[#111]
          ${error 
            ? 'border-[#c40000] shadow-[0_0_0_1px_#c40000]' 
            : isFocused 
              ? 'border-sky-400 shadow-[0_0_3px_2px_rgba(56,189,248,0.3)]' 
              : 'border-[#a6a6a6] hover:border-gray-400'
          }`}
        {...props}
      />
      <label
        className={`absolute left-3 transition-all duration-200 pointer-events-none text-gray-500
          ${isActive 
            ? 'top-1.5 text-[11px] font-medium text-sky-600' 
            : 'top-3.5 text-[14px]'
          }`}
      >
        {label}
      </label>
      {icon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {icon}
        </div>
      )}
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const destination = location.state?.from?.pathname || '/profile';
  
  // Flash state from registration / email verification
  const isVerified = location.state?.verified;
  const successMessage = location.state?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom Error & Notice States
  const [error, setError] = useState<string | null>(null);
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [showForgotPasswordNotice, setShowForgotPasswordNotice] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  // Focus email input on mount
  useEffect(() => {
    if (!isAuthenticated && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAccountNotFound(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both your email address and password.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    try {
      const result = await login(cleanEmail, cleanPassword, { rememberMe });

      // Check explicit success flag or existence of user data payload
      if (result && (result.success === true || result.user)) {
        setPassword('');
        navigate(destination, { replace: true });
      } else {
        // Explicitly catch failed responses regardless of object structure
        const errorMessage = result?.message || result?.error || 'Incorrect password or account details. Please try again.';
        const errLower = errorMessage.toLowerCase();

        if (
          result?.code === 'USER_NOT_FOUND' || 
          errLower.includes('not found') || 
          errLower.includes('no account') ||
          errLower.includes('does not exist')
        ) {
          setIsAccountNotFound(true);
          setError(`No CC Ecom account was found with "${cleanEmail}". Check for typos or register a new account.`);
        } else {
          setError(errorMessage);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Incorrect email or password. Please verify your credentials and try again.');
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowForgotPasswordNotice(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-[#111] flex flex-col selection:bg-sky-200">
      
      {/* Amazon-Inspired Header */}
      <header className="w-full bg-[#131921] py-3 px-6 flex items-center justify-between border-b border-white/10 shadow-sm">
        <Link to="/" className="select-none outline-none flex flex-col items-start hover:opacity-90 transition-opacity" aria-label="CC Ecom Home">
          <div className="flex items-center">
            <span className="text-[26px] font-black text-white tracking-tight">CC</span>
            <span className="ml-1 text-[26px] font-light text-sky-400 tracking-tight">Ecom</span>
          </div>
          <p className="text-[10px] tracking-[1.5px] uppercase text-zinc-400 -mt-1 font-medium">
            EGB Backyard
          </p>
        </Link>

        <div className="flex items-center gap-6 text-white text-sm">
          <div className="flex items-center gap-2 cursor-pointer hover:border-white border border-transparent p-1.5 rounded transition-all">
            <span className="text-xl">🇵🇭</span>
            <span className="font-semibold text-[14px] hidden sm:block">PH Marketplace</span>
          </div>
          <Link 
            to="/register" 
            className="hover:text-sky-400 font-bold text-[14px] transition-colors flex items-center gap-1"
          >
            Register <ChevronRight size={16} />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[400px] mx-auto px-4 flex-grow py-10">
        
        {/* Verification Success Notice */}
        {isVerified && !error && (
          <div 
            className="mb-6 border-l-4 border-[#008a00] bg-white rounded-r-md pl-4 pr-3 py-4 shadow-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2"
            role="status"
          >
            <CheckCircle2 className="w-5 h-5 text-[#008a00] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[#008a00] font-bold text-sm mb-0.5">Verification Complete</h4>
              <p className="text-sm text-gray-700">
                {successMessage || 'Account successfully verified! Please log in to continue.'}
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div 
            className="mb-6 border-l-4 border-[#c40000] bg-white rounded-r-md pl-4 pr-3 py-4 shadow-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 text-[#c40000] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-[#c40000] font-bold text-sm mb-0.5">There was a problem</h4>
              <p className="text-sm text-gray-700 leading-snug">{error}</p>
              
              {/* Account Not Found CTA */}
              {isAccountNotFound && (
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Need an account?</span>
                  <Link 
                    to="/register" 
                    state={{ email }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline bg-sky-50 px-2.5 py-1 rounded border border-sky-200 transition-colors"
                  >
                    <UserPlus size={13} />
                    Register with this email
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forgot Password Responsibility Disclaimer Warning */}
        {showForgotPasswordNotice && (
          <div className="mb-6 border-l-4 border-amber-500 bg-amber-50/80 rounded-r-md pl-4 pr-3 py-4 shadow-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-800 font-bold text-sm mb-0.5">Account Security Disclaimer</h4>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Please note: CC Ecom does not store plain-text passwords and is not responsible for recovering lost credentials. You are solely responsible for maintaining access to your account and credentials.
              </p>
            </div>
          </div>
        )}

        {/* Sign In Form Box */}
        <div className="bg-white border border-gray-200 rounded-[8px] shadow-sm overflow-hidden p-7">
          <h1 className="text-[28px] font-semibold mb-2 text-gray-800">Sign in</h1>
          <p className="text-[13px] text-gray-500 mb-6 font-medium">Access your CC Ecom account</p>

          <form onSubmit={handleSubmit} noValidate>
            
            {/* Animated Email Input */}
            <AnimatedInput 
              inputRef={emailInputRef}
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e: any) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              error={!!error}
              disabled={isLoading}
            />

            {/* Animated Password Input */}
            <AnimatedInput 
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e: any) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              error={!!error}
              disabled={isLoading}
              icon={
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {/* Options Row */}
            <div className="flex items-center justify-between mb-6 text-[13px]">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-400 cursor-pointer"
                />
                <span className="font-medium">Keep me signed in</span>
              </label>

              <button 
                type="button"
                onClick={handleForgotPasswordClick}
                className="text-sky-600 hover:text-sky-800 hover:underline font-semibold transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] hover:border-[#9c7e31] text-[#111] text-[15px] py-2.5 rounded-[4px] shadow-sm font-medium transition-all disabled:opacity-60 flex justify-center items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* New to Ecom Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="relative flex justify-center items-center mb-4">
              <span className="bg-white px-3 text-xs text-gray-500 font-medium">New to CC Ecom?</span>
            </div>
            
            <Link 
              to="/register" 
              className="w-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-[#111] text-[13px] py-2.5 rounded-[4px] border border-gray-300 font-semibold shadow-xs transition-colors"
            >
              Create your CC Ecom account
            </Link>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 flex items-start gap-2.5 px-2 text-gray-500 text-xs leading-relaxed">
          <Info size={16} className="shrink-0 text-gray-400 mt-0.5" />
          <p>
            By signing in, you agree to CC Ecom's{' '}
            <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
              Conditions of Use
            </a>{' '}
            and{' '}
            <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
              Privacy Notice
            </a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-gray-200 bg-white pt-8 pb-10">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-8"></div>
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-center gap-x-6 gap-y-3 flex-wrap mb-6 text-[13px] font-medium text-sky-700">
            <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:underline">Conditions of Use</a>
            <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Notice</a>
            <a href="#" className="hover:underline">Help Center</a>
            <a href="#" className="hover:underline">Accessibility</a>
            <a href="#" className="hover:underline">Cookies</a>
          </div>
          
          <div className="text-center text-gray-500 text-[12px] mb-1">
            © {new Date().getFullYear()} CC Ecom Enterprise. All rights reserved.
          </div>
          
          <div className="text-center text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
            Philippine Marketplace • EGB Backyard
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
