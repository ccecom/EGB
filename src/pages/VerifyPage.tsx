
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  LockKeyhole,
  X,
} from 'lucide-react';
import api from '../services/api';

type RegistrationData = Record<string, unknown>;

type ApiError = {
  message?: string;
  detail?: unknown;
  response?: {
    data?: {
      message?: string;
      detail?: unknown;
      error?: string;
    };
  };
};

const BRAND = 'EGB Backyard';

function getErrorMessage(error: unknown): string {
  const apiError = error as ApiError;
  const detail =
    apiError?.response?.data?.detail ?? apiError?.detail;

  if (typeof apiError?.response?.data?.message === 'string') {
    return apiError.response.data.message;
  }

  if (typeof apiError?.response?.data?.error === 'string') {
    return apiError.response.data.error;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;

        if (item && typeof item === 'object') {
          const issue = item as {
            msg?: string;
            loc?: unknown[];
          };

          const location = Array.isArray(issue.loc)
            ? issue.loc.join('.')
            : '';

          return location
            ? `${location}: ${issue.msg || 'Invalid value'}`
            : issue.msg || 'Invalid input';
        }

        return String(item);
      })
      .join(', ');
  }

  if (typeof apiError?.message === 'string' && apiError.message) {
    return apiError.message;
  }

  return 'We could not create your account. Please check your information and try again.';
}

function getRegistrationPayload(
  registrationData: RegistrationData,
): RegistrationData {
  const payload: RegistrationData = { ...registrationData };

  // Remove fields used only by the registration UI.
  const uiOnlyFields = [
    'confirmPassword',
    'confirm_password',
    'password_confirmation',
    'termsAccepted',
    'terms_accepted',
    'captcha',
    'captchaInput',
    'puzzleSolved',
    'verificationCode',
    'verification_code',
  ];

  uiOnlyFields.forEach((field) => {
    delete payload[field];
  });

  // Support common frontend naming conventions.
  if (!payload.full_name && payload.fullName) {
    payload.full_name = payload.fullName;
  }

  if (!payload.fullName && payload.full_name) {
    payload.fullName = payload.full_name;
  }

  if (!payload.username && typeof payload.email === 'string') {
    payload.username = payload.email.split('@')[0];
  }

  if (!payload.mobile && typeof payload.phone === 'string') {
    payload.mobile = payload.phone;
  }

  return payload;
}

export default function VerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const registrationData = useMemo<RegistrationData | null>(() => {
    const state = location.state as
      | { registrationData?: RegistrationData }
      | RegistrationData
      | null;

    if (!state || typeof state !== 'object') {
      return null;
    }

    if (
      'registrationData' in state &&
      state.registrationData &&
      typeof state.registrationData === 'object'
    ) {
      return state.registrationData;
    }

    return state as RegistrationData;
  }, [location.state]);

  const [sliderValue, setSliderValue] = useState(0);
  const [targetValue, setTargetValue] = useState(72);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    'Your account has been created successfully.',
  );

  const email =
    typeof registrationData?.email === 'string'
      ? registrationData.email
      : '';

  useEffect(() => {
    if (!registrationData) {
      navigate('/register', { replace: true });
      return;
    }

    const hasEmail =
      typeof registrationData.email === 'string' &&
      registrationData.email.trim().length > 0;

    const hasPassword =
      typeof registrationData.password === 'string' &&
      registrationData.password.length > 0;

    if (!hasEmail || !hasPassword) {
      navigate('/register', { replace: true });
    }
  }, [registrationData, navigate]);

  function resetPuzzle() {
    setSliderValue(0);
    setTargetValue(Math.floor(Math.random() * 36) + 58);
    setPuzzleSolved(false);
    setErrorMessage('');
  }

  function verifyPuzzle() {
    if (Math.abs(sliderValue - targetValue) <= 4) {
      setPuzzleSolved(true);
      setErrorMessage('');
      return;
    }

    setPuzzleSolved(false);
    setErrorMessage(
      'The rooster is not aligned with the target yet. Try again.',
    );
  }

  async function handleCreateAccount() {
    if (!registrationData) {
      setErrorMessage(
        'Your registration information is missing. Please register again.',
      );
      return;
    }

    if (!puzzleSolved) {
      setErrorMessage(
        'Please complete the rooster puzzle before creating your account.',
      );
      return;
    }

    const password = registrationData.password;
    const accountEmail = registrationData.email;

    if (
      typeof accountEmail !== 'string' ||
      !accountEmail.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      setErrorMessage(
        'Your email or password is missing. Please return to registration and try again.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = getRegistrationPayload(registrationData);

      // Submit registration through the shared Axios API client.
      const response = await api.post(
        '/api/v1/auth/register',
        payload,
      );

      const responseData = response.data as {
        success?: boolean;
        status?: string;
        message?: string;
        detail?: unknown;
      };

      const responseStatus = String(
        responseData?.status ?? '',
      ).toLowerCase();

      if (
        responseData?.success === false ||
        ['error', 'failed', 'failure'].includes(responseStatus)
      ) {
        throw new Error(
          responseData?.message ||
            (typeof responseData?.detail === 'string'
              ? responseData.detail
              : 'The server could not create your account.'),
        );
      }

      // Only show the success popup after the API call succeeds.
      setCreatedEmail(accountEmail.trim());
      setSuccessMessage(
        responseData?.message ||
          'Your account has been created successfully.',
      );
      setShowSuccessPopup(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPuzzleSolved(false);
      setSliderValue(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToLogin() {
    setShowSuccessPopup(false);

    navigate('/login', {
      replace: true,
      state: {
        email: createdEmail,
        message: 'Your account has been created. Please log in.',
      },
    });
  }

  if (!registrationData) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-center text-gray-700">
        <p>Returning to registration...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900 sm:px-6">
      <style>{`
        .egb-verify-range {
          width: 100%;
          accent-color: #b91c1c;
          cursor: pointer;
        }

        .egb-verify-range:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .egb-modal-backdrop {
          animation: egbFadeIn 180ms ease-out;
        }

        .egb-modal-card {
          animation: egbModalIn 220ms ease-out;
        }

        @keyframes egbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes egbModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .egb-modal-backdrop,
          .egb-modal-card {
            animation: none;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-xl">
        {/* Brand */}
        <header className="mb-8 text-center">
          <div
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 text-4xl"
            aria-label={`${BRAND} rooster logo`}
            role="img"
          >
            🐓
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
            EGB <span className="text-red-700">Backyard</span>
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            One last step before joining our backyard.
          </p>
        </header>

        {/* Verification card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <ShieldCheck size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-950">
                Verify your registration
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Align the rooster with the target to continue creating
                your account.
              </p>
            </div>
          </div>

          {/* Account information */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
              Account information
            </p>

            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Name</span>
                <span className="text-right font-semibold text-gray-900">
                  {String(
                    registrationData.fullName ||
                      registrationData.full_name ||
                      registrationData.username ||
                      'New member',
                  )}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Email</span>
                <span className="break-all text-right font-semibold text-gray-900">
                  {email}
                </span>
              </div>
            </div>
          </div>

          {/* Puzzle */}
          <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900">
                  Rooster alignment puzzle
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Move the slider until the rooster reaches the target.
                </p>
              </div>

              <button
                type="button"
                onClick={resetPuzzle}
                disabled={isSubmitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                aria-label="Reset puzzle"
                title="Reset puzzle"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Puzzle track */}
            <div className="relative mb-5 h-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-gray-200" />

              <div
                className="absolute top-0 h-full border-x-2 border-dashed border-red-400 bg-red-100/70"
                style={{
                  left: `${targetValue}%`,
                  width: '8%',
                  transform: 'translateX(-50%)',
                }}
              />

              <div
                className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-2xl shadow-sm transition-colors"
                style={{
                  left: `${sliderValue}%`,
                  borderColor: puzzleSolved ? '#15803d' : '#b91c1c',
                }}
                aria-label="Rooster puzzle piece"
              >
                🐓
              </div>

              <span
                className="absolute bottom-1 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700"
                style={{
                  left: `${Math.min(targetValue, 88)}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                Target
              </span>
            </div>

            <label
              htmlFor="rooster-slider"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Slide to align
            </label>

            <input
              id="rooster-slider"
              className="egb-verify-range"
              type="range"
              min="0"
              max="100"
              step="1"
              value={sliderValue}
              disabled={puzzleSolved || isSubmitting}
              onChange={(event) => {
                setSliderValue(Number(event.target.value));
                setErrorMessage('');
              }}
              aria-valuetext={`${sliderValue} percent`}
            />

            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>Start</span>
              <span>Move the rooster</span>
              <span>End</span>
            </div>

            {puzzleSolved ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
                <CheckCircle2 size={18} />
                Rooster aligned successfully.
              </div>
            ) : (
              <button
                type="button"
                onClick={verifyPuzzle}
                disabled={isSubmitting}
                className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify rooster alignment
              </button>
            )}
          </div>

          {/* Errors */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={!puzzleSolved || isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating your account...
              </>
            ) : (
              <>
                Create my account
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-gray-500">
            <LockKeyhole size={14} />
            Your registration is submitted securely over HTTPS when
            your configured API uses HTTPS.
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {BRAND}
        </p>
      </div>

      {/* SUCCESS POPUP */}
      {showSuccessPopup && (
        <div
          className="egb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-created-title"
            aria-describedby="account-created-description"
            className="egb-modal-card relative w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={goToLogin}
              aria-label="Go to login"
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={48} strokeWidth={1.8} />
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-green-700">
              Registration complete
            </p>

            <h2
              id="account-created-title"
              className="text-2xl font-black text-gray-950"
            >
              Account created!
            </h2>

            <p
              id="account-created-description"
              className="mt-3 text-sm leading-6 text-gray-600"
            >
              {successMessage} You can now log in to your
              {' '}{BRAND} account.
            </p>

            {createdEmail && (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  Registered email
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                  {createdEmail}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={goToLogin}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 font-bold text-white transition hover:bg-red-800"
            >
              Log in to your account
              <ArrowRight size={18} />
            </button>

            <p className="mt-4 text-xs text-gray-400">
              Welcome to the EGB Backyard community!
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
