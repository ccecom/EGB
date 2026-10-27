import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UploadCloud, ChevronRight, ArrowLeft } from 'lucide-react';

// Reusable Animated Input Component (Floating Labels)
const AnimatedInput = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  error = false,
  maxLength,
  icon = null,
  ...props 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || (value && value.toString().length > 0);

  return (
    <div className="relative mb-4 w-full">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        maxLength={maxLength}
        className={`w-full px-3 pt-[22px] pb-2 border rounded-[4px] outline-none text-[14px] transition-all bg-white
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
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {icon}
        </div>
      )}
    </div>
  );
};

type FormData = {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  birthDate: string;
  gender: string;
  facebook: string;
  password: string;
  confirmPassword: string;
  avatar: string;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    birthDate: '',
    gender: '',
    facebook: '',
    password: '',
    confirmPassword: '',
    avatar: '',
  });

  const [bMonth, setBMonth] = useState('');
  const [bDay, setBDay] = useState('');
  const [bYear, setBYear] = useState('');

  useEffect(() => {
    if (bMonth && bDay && bYear) {
      setFormData(prev => ({ ...prev, birthDate: `${bYear}-${bMonth}-${bDay}` }));
    } else {
      setFormData(prev => ({ ...prev, birthDate: '' }));
    }
  }, [bMonth, bDay, bYear]);

  const daysInMonth = useMemo(() => {
    if (!bMonth) return 31;
    const m = parseInt(bMonth, 10);
    const y = bYear ? parseInt(bYear, 10) : 2000;
    return new Date(y, m, 0).getDate();
  }, [bMonth, bYear]);

  useEffect(() => {
    if (bDay && parseInt(bDay, 10) > daysInMonth) setBDay('');
  }, [daysInMonth, bDay]);
  
  const calculatePasswordStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(5, score);
  };

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'password') setPasswordStrength(calculatePasswordStrength(value));
    if (error) setError(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        update('avatar', reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const isForbiddenMobile = (mobile: string): boolean => {
    const clean = mobile.replace(/[\s-]/g, '');
    const forbiddenPatterns = ['09770074715', '09123456789', '09999999999', '09000000000', '09111111111', '09222222222'];
    return forbiddenPatterns.includes(clean);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!formData.email.trim()) {
      setStep1Error('Enter your email');
      return;
    }

    if (emailRegex.test(formData.email)) {
      setStep(2);
    } else {
      setStep1Error('Enter a valid email address');
    }
  };

  const validateStep2 = (): string | null => {
    if (!formData.fullName.trim() || formData.fullName.trim().length < 7)
      return 'Enter your full name (minimum 7 characters).';
    if (!formData.username.trim() || !/^[a-zA-Z0-9_]{4,20}$/.test(formData.username))
      return 'Username must be 4-20 alphanumeric characters and underscores only.';
    return null;
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      window.scrollTo(0, 0);
    } else {
      setError(null);
      setStep(3);
    }
  };

  const validateStep3 = (): string | null => {
    const phRegex = /^09\d{9}$/;
    const cleanMobile = formData.mobile.replace(/[\s-]/g, '');
    if (!formData.mobile || !phRegex.test(cleanMobile) || isForbiddenMobile(cleanMobile))
      return 'Enter a valid Philippine mobile number.';
    if (formData.facebook && !formData.facebook.includes('facebook.com'))
      return 'Provide a valid Facebook URL or leave it blank.';
    return null;
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep3();
    if (validationError) {
      setError(validationError);
      window.scrollTo(0, 0);
    } else {
      setError(null);
      setStep(4);
    }
  };

  const validateStep4 = (): string | null => {
    if (!bMonth || !bDay || !bYear) return 'Complete your date of birth.';
    const birth = new Date(parseInt(bYear), parseInt(bMonth) - 1, parseInt(bDay));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 13) return 'You must be at least 13 years old to register.';
    if (!formData.gender) return 'Select your gender.';
    return null;
  };

  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep4();
    if (validationError) {
      setError(validationError);
      window.scrollTo(0, 0);
    } else {
      setError(null);
      setStep(5);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsSubmitting(false);
      return;
    }
    if (passwordStrength < 3) {
      setError('Password is too weak. Please include numbers and symbols.');
      setIsSubmitting(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    // Calculate exact age before packing data
    const birth = new Date(formData.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const finalPayload = { 
      ...formData, 
      age
    };

    setSuccess(true);

    // DEFERRED SUBMISSION: Route directly to Verify Page with the raw form data.
    // The verify page will handle the actual database insertion.
    setTimeout(() => {
      navigate('/verify', { state: finalPayload });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-[#111] flex flex-col selection:bg-sky-200">
      
      {/* Header - Amazon Inspired */}
      <div className="w-full bg-[#131921] py-3 px-6 flex items-center justify-between border-b border-white/10 shadow-sm">
        <Link to="/" className="select-none outline-none flex flex-col items-start hover:opacity-90 transition-opacity">
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
            to="/login" 
            className="hover:text-sky-400 font-bold text-[14px] transition-colors flex items-center gap-1"
          >
            Sign in <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[400px] mx-auto px-4 flex-grow py-10">
        
        {/* Error Banner */}
        {error && step > 1 && (
          <div className="mb-6 border-l-4 border-[#c40000] bg-white rounded-r-md pl-4 pr-3 py-4 shadow-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
            <div className="text-[#c40000] shrink-0 mt-0.5">⚠️</div>
            <div>
              <h4 className="text-[#c40000] font-bold text-sm mb-0.5">There was a problem</h4>
              <p className="text-sm text-gray-700">{error}</p>
            </div>
          </div>
        )}

        {success ? (
          <div className="border border-gray-200 rounded-[8px] p-8 bg-white shadow-lg text-center mt-8 animate-pulse">
            <div className="mx-auto w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Profile Configured</h2>
            <p className="text-[15px] text-gray-500 font-medium">Initializing security protocol...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-[8px] shadow-sm overflow-hidden">
            
            {/* Step Progress Bar (Facebook Inspired) */}
            <div className="flex h-1.5 bg-gray-100 w-full">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div 
                  key={idx} 
                  className={`flex-1 transition-all duration-500 ${step >= idx ? 'bg-sky-400' : 'bg-transparent'}`} 
                />
              ))}
            </div>

            <div className="p-7">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-[28px] font-semibold mb-2 text-gray-800">Create Account</h1>
                  <p className="text-[14px] text-gray-500 mb-6">Enter your email to get started.</p>
                  
                  <form onSubmit={handleStep1Submit}>
                    <AnimatedInput 
                      label="Email address"
                      type="email"
                      value={formData.email}
                      onChange={(e: any) => {
                        update('email', e.target.value);
                        setStep1Error(null);
                      }}
                      error={!!step1Error}
                    />
                    
                    {step1Error && (
                      <div className="text-[#c40000] text-sm mb-4 flex items-center gap-1.5 font-medium">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        {step1Error}
                      </div>
                    )}
                    
                    <button 
                      type="submit" 
                      className="w-full bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] hover:border-[#9c7e31] text-[#111] text-[15px] py-2.5 rounded-[4px] shadow-sm font-medium transition-colors"
                    >
                      Continue
                    </button>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-[13px] text-gray-600 font-medium mb-3">Already have an account?</p>
                      <Link to="/login" className="flex items-center text-sky-600 hover:text-sky-800 font-semibold text-[13px] hover:underline">
                        Sign in <ChevronRight size={14} className="ml-0.5" />
                      </Link>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-[24px] font-semibold mb-1 text-gray-800">Identity Details</h1>
                  <p className="text-[13px] text-gray-500 mb-6 font-medium">Step 2 of 5</p>
                  
                  <form onSubmit={handleStep2Submit} className="space-y-4">
                    <AnimatedInput 
                      label="Legal Full Name"
                      value={formData.fullName}
                      onChange={(e: any) => update('fullName', e.target.value)}
                    />

                    <div className="pt-2">
                      <label className="block text-[12px] font-bold text-gray-700 mb-3 uppercase tracking-wider">Profile Avatar & Tag</label>
                      <div className="flex gap-4 items-center">
                        <label className="cursor-pointer group relative shrink-0">
                          <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-300 group-hover:border-sky-400 group-hover:bg-sky-50 flex items-center justify-center overflow-hidden bg-gray-50 transition-all shadow-sm">
                            {formData.avatar ? (
                              <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-sky-500 transition-colors" />
                            )}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                        
                        <div className="flex-1 -mt-4">
                           <AnimatedInput 
                            label="Preferred Username"
                            value={formData.username}
                            onChange={(e: any) => update('username', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button type="button" onClick={() => setStep(1)} className="px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[4px] text-gray-700 transition-colors flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <button type="submit" className="flex-1 bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] text-[#111] py-2.5 rounded-[4px] shadow-sm font-medium transition-colors">
                        Next Step
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-[24px] font-semibold mb-1 text-gray-800">Contact Methods</h1>
                  <p className="text-[13px] text-gray-500 mb-6 font-medium">Step 3 of 5</p>
                  
                  <form onSubmit={handleStep3Submit}>
                    <AnimatedInput 
                      label="Mobile Number (09770074715)"
                      type="tel"
                      maxLength={11}
                      value={formData.mobile}
                      onChange={(e: any) => update('mobile', e.target.value.replace(/\D/g, ''))}
                    />
                    
                    <AnimatedInput 
                      label="Facebook Profile URL (Optional)"
                      value={formData.facebook}
                      onChange={(e: any) => update('facebook', e.target.value)}
                    />

                    <div className="flex gap-3 pt-6">
                      <button type="button" onClick={() => setStep(2)} className="px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[4px] text-gray-700 transition-colors flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <button type="submit" className="flex-1 bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] text-[#111] py-2.5 rounded-[4px] shadow-sm font-medium transition-colors">
                        Next Step
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-[24px] font-semibold mb-1 text-gray-800">Demographics</h1>
                  <p className="text-[13px] text-gray-500 mb-6 font-medium">Step 4 of 5</p>
                  
                  <form onSubmit={handleStep4Submit} className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-800 mb-2">Date of Birth</label>
                      <div className="flex gap-2">
                        <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} className="flex-1 px-3 py-2.5 border border-[#a6a6a6] rounded-[4px] bg-white text-[14px] focus:outline-none focus:border-sky-400 focus:shadow-[0_0_3px_2px_rgba(56,189,248,0.3)] hover:border-gray-400 transition-all">
                          <option value="" disabled>Month</option>
                          {Array.from({ length: 12 }, (_, i) => <option key={i} value={(i + 1).toString().padStart(2, '0')}>{new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}</option>)}
                        </select>
                        <select value={bDay} onChange={(e) => setBDay(e.target.value)} disabled={!bMonth} className="w-[85px] px-3 py-2.5 border border-[#a6a6a6] rounded-[4px] bg-white text-[14px] focus:outline-none focus:border-sky-400 focus:shadow-[0_0_3px_2px_rgba(56,189,248,0.3)] hover:border-gray-400 transition-all disabled:bg-gray-100 disabled:text-gray-400">
                          <option value="" disabled>Day</option>
                          {Array.from({ length: daysInMonth }, (_, i) => <option key={i} value={(i + 1).toString().padStart(2, '0')}>{i + 1}</option>)}
                        </select>
                        <select value={bYear} onChange={(e) => setBYear(e.target.value)} className="w-[90px] px-3 py-2.5 border border-[#a6a6a6] rounded-[4px] bg-white text-[14px] focus:outline-none focus:border-sky-400 focus:shadow-[0_0_3px_2px_rgba(56,189,248,0.3)] hover:border-gray-400 transition-all">
                          <option value="" disabled>Year</option>
                          {Array.from({ length: 100 }, (_, i) => {
                            const year = (new Date().getFullYear() - 13 - i).toString();
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-800 mb-2">Gender Identity</label>
                      <select value={formData.gender} onChange={(e) => update('gender', e.target.value)} className="w-full px-3 py-2.5 border border-[#a6a6a6] rounded-[4px] bg-white text-[14px] focus:outline-none focus:border-sky-400 focus:shadow-[0_0_3px_2px_rgba(56,189,248,0.3)] hover:border-gray-400 transition-all">
                        <option value="" disabled>Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Other">Prefer not to say</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button type="button" onClick={() => setStep(3)} className="px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[4px] text-gray-700 transition-colors flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <button type="submit" className="flex-1 bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] text-[#111] py-2.5 rounded-[4px] shadow-sm font-medium transition-colors">
                        Next Step
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-[24px] font-semibold mb-1 text-gray-800">Security</h1>
                  <p className="text-[13px] text-gray-500 mb-6 font-medium">Final Step</p>
                  
                  <form onSubmit={handleFinalSubmit}>
                    
                    <AnimatedInput 
                      label="Create Password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e: any) => update('password', e.target.value)}
                      icon={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    {formData.password && (
                      <div className="mb-4 -mt-2">
                        <div className="flex gap-1 h-1 w-full rounded overflow-hidden mb-1">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`flex-1 transition-colors duration-300 ${i < passwordStrength ? (passwordStrength < 3 ? 'bg-[#c40000]' : passwordStrength < 5 ? 'bg-[#f0c14b]' : 'bg-green-600') : 'bg-gray-200'}`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {passwordStrength < 3 ? 'Weak - Add numbers and symbols' : passwordStrength < 5 ? 'Good' : 'Strong'}
                        </p>
                      </div>
                    )}

                    <AnimatedInput 
                      label="Confirm Password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e: any) => update('confirmPassword', e.target.value)}
                      icon={
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    <div className="pt-2 pb-4 text-[12px] text-gray-600 leading-relaxed">
                      By creating an account, you agree to CC Ecom's{' '}
                      <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline font-medium">
                        Conditions of Use
                      </a>{' '}
                      and{' '}
                      <a href="https://cc-legal.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline font-medium">
                        Privacy Notice
                      </a>.
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep(4)} className="px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[4px] text-gray-700 transition-colors flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 bg-[#f0c14b] hover:bg-[#f4d078] active:bg-[#e2b442] border border-[#a88734] text-[#111] py-2.5 rounded-[4px] shadow-sm font-medium disabled:opacity-50 transition-colors">
                        {isSubmitting ? 'Verifying...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Amazon Inspired */}
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

export default RegisterPage;
