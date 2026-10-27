import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import api from "../services/api";

// --- Type Definitions ---
interface UserProfileData {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  birthDate: string;
  gender: string;
  facebook: string;
  avatar: string;
  age: number | string;
  status: string;
  isVerified: boolean;
  created_at: string;
}

interface OrderNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// --- Status helpers ---
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  out_for_delivery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

function normalizeStatus(status?: string): string {
  if (!status) return "pending";
  return status.toLowerCase().replace(/\s+/g, "_");
}

function getStatusLabel(status?: string): string {
  const key = normalizeStatus(status);
  return STATUS_LABELS[key] || status || "Unknown";
}

function getStatusColor(status?: string): string {
  const key = normalizeStatus(status);
  return STATUS_COLORS[key] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
}

// --- Reusable Settings Row ---
const SettingsRow = ({
  icon,
  label,
  value,
  badge,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left
      ${disabled ? "opacity-60 cursor-default" : "hover:bg-gray-50 dark:hover:bg-gray-800/80 active:bg-gray-100 dark:active:bg-gray-700/60"}`}
  >
    <div className="flex items-center gap-3">
      <span className="text-gray-500 dark:text-gray-400 text-lg w-6 flex justify-center">
        {icon}
      </span>
      <span className="text-[15px] text-gray-900 dark:text-gray-100 font-medium">
        {label}
      </span>
      {typeof badge === "number" && badge > 0 && (
        <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      {value && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{value}</span>
      )}
      {!disabled && (
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </div>
  </button>
);

// --- Fixed Growth Goals (static) ---
const FIXED_GROWTH_GOALS = [
  {
    id: 1,
    title: "Complete 5 farm orders",
    description: "Support the backyard and reach delivered status",
    current: 2,
    target: 5,
    unit: "orders",
    inverse: false,
  },
  {
    id: 2,
    title: "Try 3 new products",
    description: "Explore clothes, perfume or lifestyle items",
    current: 1,
    target: 3,
    unit: "items",
    inverse: false,
  },
  {
    id: 3,
    title: "Zero cancellations this month",
    description: "Keep your order journey smooth",
    current: 0,
    target: 0,
    unit: "cancellations",
    inverse: true,
  },
  {
    id: 4,
    title: "Share a product with a friend",
    description: "Help the little farm grow",
    current: 0,
    target: 1,
    unit: "shares",
    inverse: false,
  },
];

export const ProfilePage = () => {
  const { user, logout, refreshUser } = useAuth();
  const { orders, fetchUserOrders, isLoading: ordersLoading, error: ordersError } =
    useOrders();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserProfileData>({
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    birthDate: "",
    gender: "",
    facebook: "",
    avatar: "",
    age: "",
    status: "Active",
    isVerified: false,
    created_at: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGrowthGoals, setShowGrowthGoals] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => {
      try {
        const saved = localStorage.getItem("profile_read_notifications");
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
  );

  // Dark mode – sync with document + localStorage
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Keep in sync if theme is changed elsewhere
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("theme");
      if (!saved) setIsDark(e.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = () => setIsDark((v) => !v);

  // Persist read notifications
  useEffect(() => {
    localStorage.setItem(
      "profile_read_notifications",
      JSON.stringify(Array.from(readNotificationIds))
    );
  }, [readNotificationIds]);

  // Helper – map backend data into form shape
  const mapToForm = useCallback((data: any): UserProfileData => {
    const firstName = data.profile?.firstName || data.firstName || "";
    const lastName = data.profile?.lastName || data.lastName || "";
    const computedFullName =
      data.fullName || `${firstName} ${lastName}`.trim() || "";

    return {
      fullName: computedFullName,
      username:
        data.username || (data.email ? data.email.split("@")[0] : "user"),
      email: data.email || "",
      mobile: data.mobile || data.profile?.mobile || "",
      birthDate: data.birthDate || data.profile?.birthDate || "",
      gender: data.gender || data.profile?.gender || "",
      facebook: data.facebook || data.profile?.facebook || "",
      avatar: data.avatar || data.profile?.avatar || "",
      age: data.age ?? data.profile?.age ?? "",
      status: data.status || data.accountStatus || "Active",
      isVerified: Boolean(data.isVerified),
      created_at: data.created_at || data.createdAt || "",
    };
  }, []);

  // --- Live Profile Fetching ---
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get("/api/v1/auth/profile");
        if (cancelled) return;

        setFormData(mapToForm(response.data));
      } catch (err: any) {
        if (cancelled) return;

        console.error("Profile Fetch Error:", err);

        if (user) {
          setFormData(mapToForm(user));
          setError("Could not refresh profile from server. Showing cached data.");
        } else {
          try {
            const cached = localStorage.getItem("userProfileData");
            if (cached) {
              setFormData(mapToForm(JSON.parse(cached)));
              setError("Could not reach server. Showing cached profile.");
            } else {
              if (err.response?.status === 401) {
                logout();
                navigate("/login");
                return;
              }

              if (
                err.code === "ECONNABORTED" ||
                err.message?.includes("timeout")
              ) {
                setError("Server took too long to respond. Please try again.");
              } else if (err.code === "ERR_NETWORK") {
                setError(
                  "Network Error: Cannot establish connection to backend."
                );
              } else {
                setError(
                  err.response?.data?.message || "Failed to load profile data."
                );
              }
            }
          } catch {
            setError("Failed to load profile data.");
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user, logout, navigate, mapToForm]);

  // Refresh orders on mount (for notifications + My Orders badge)
  useEffect(() => {
    if (user) {
      void fetchUserOrders().catch(() => {
        // handled in OrderContext
      });
    }
  }, [user, fetchUserOrders]);

  // --- Order-status notifications (Orders page is source of truth) ---
  const orderNotifications = useMemo((): OrderNotification[] => {
    if (!orders || orders.length === 0) return [];

    return orders
      .map((order) => {
        const id = order._id || order.id || order.order_number || "";
        const orderNumber =
          order.order_number || order.id || order._id || "Unknown";
        const status = normalizeStatus(order.status);
        const created =
          order.created_at ||
          order.createdAt ||
          order.date ||
          new Date().toISOString();

        let message = `Order #${orderNumber} is now ${getStatusLabel(status)}.`;
        if (status === "shipped" || status === "out_for_delivery") {
          message = `Your order #${orderNumber} is on the way!`;
        } else if (status === "delivered") {
          message = `Order #${orderNumber} has been delivered. Enjoy!`;
        } else if (status === "cancelled") {
          message = `Order #${orderNumber} was cancelled.`;
        } else if (status === "pending" || status === "confirmed") {
          message = `Order #${orderNumber} is being prepared.`;
        }

        return {
          id: `\( {id}- \){status}`,
          orderId: String(id),
          orderNumber: String(orderNumber),
          status,
          message,
          createdAt: created,
          read: readNotificationIds.has(`\( {id}- \){status}`),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 12);
  }, [orders, readNotificationIds]);

  const unreadCount = useMemo(
    () => orderNotifications.filter((n) => !n.read).length,
    [orderNotifications]
  );

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      orderNotifications.forEach((n) => next.add(n.id));
      return next;
    });
  };

  // --- Input Handlers ---
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Save Profile Data ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put("/api/v1/auth/profile", formData);

      setSuccess("Your account information has been updated successfully.");
      setIsEditing(false);

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err: any) {
      console.error("Profile Save Error:", err);
      setError(err.response?.data?.message || "Save operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(dateString);
    } catch {
      return "";
    }
  };

  const goToOrder = (orderId: string) => {
    navigate("/orders", { state: { highlightOrderId: orderId } });
  };

  const activeOrdersCount = useMemo(
    () =>
      orders.filter((o) =>
        [
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "out_for_delivery",
        ].includes(normalizeStatus(o.status))
      ).length,
    [orders]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Loading your account...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
      {/* Mobile-style container – no top Settings header for more space */}
      <div className="max-w-md mx-auto bg-gray-100 dark:bg-gray-900 min-h-screen pb-24">
        <div className="px-4 pt-6 pb-5 space-y-5">
          {/* Error / Success banners */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-2xl text-sm">
              {success}
            </div>
          )}
          {ordersError && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-2xl text-sm">
              Could not refresh orders for notifications.{" "}
              <button
                type="button"
                onClick={() => fetchUserOrders()}
                className="underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* ===== Profile Card ===== */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xl overflow-hidden flex-shrink-0">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formData.fullName.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {formData.fullName || "User"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {formData.email}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setShowMoreDetails(true);
                  }}
                  className="mt-1 text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Collapsible extra details */}
            {showMoreDetails && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Mobile
                      </label>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Birth Date
                        </label>
                        <input
                          type="text"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleChange}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">
                          Prefer not to say
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Facebook
                      </label>
                      <input
                        type="text"
                        name="facebook"
                        value={formData.facebook}
                        onChange={handleChange}
                        placeholder="https://facebook.com/..."
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setError(null);
                          setSuccess(null);
                        }}
                        className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl disabled:opacity-60"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Username
                      </span>
                      <span className="font-medium">@{formData.username}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Mobile
                      </span>
                      <span className="font-medium">
                        {formData.mobile || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Status
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          formData.status === "Active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {formData.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Verification
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          formData.isVerified
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {formData.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Member Since
                      </span>
                      <span className="font-medium">
                        {formatDate(formData.created_at)}
                      </span>
                    </div>
                    {(formData.birthDate ||
                      formData.gender ||
                      formData.facebook) && (
                      <>
                        {formData.birthDate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              Birth Date
                            </span>
                            <span className="font-medium">
                              {formData.birthDate}
                            </span>
                          </div>
                        )}
                        {formData.gender && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              Gender
                            </span>
                            <span className="font-medium">
                              {formData.gender}
                            </span>
                          </div>
                        )}
                        {formData.facebook && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              Facebook
                            </span>
                            <span className="font-medium truncate max-w-[140px]">
                              {formData.facebook}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={() => setShowMoreDetails((v) => !v)}
                className="mt-3 w-full text-center text-sm text-indigo-600 dark:text-indigo-400 font-medium py-1"
              >
                {showMoreDetails ? "Show less" : "Show more details"}
              </button>
            )}
          </div>

          {/* ===== Account details ===== */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              Account details
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                }
                label="Account"
                onClick={() => {
                  setIsEditing(true);
                  setShowMoreDetails(true);
                }}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                }
                label="My Orders"
                badge={activeOrdersCount > 0 ? activeOrdersCount : undefined}
                onClick={() => navigate("/orders")}
              />
            </div>
          </div>

          {/* ===== Target ===== */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              Target
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                }
                label="Favorites"
                onClick={() => navigate("/cart")}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                }
                label="Growth Goals"
                onClick={() => setShowGrowthGoals((v) => !v)}
              />
            </div>

            {/* Fixed Growth Goals panel */}
            {showGrowthGoals && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Your Growth Goals
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowGrowthGoals(false)}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    Close
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Small targets to help the farm and your shopping journey grow.
                </p>
                {FIXED_GROWTH_GOALS.map((goal) => {
                  const progress = goal.inverse
                    ? goal.current === 0
                      ? 100
                      : 0
                    : Math.min(
                        100,
                        Math.round((goal.current / Math.max(goal.target, 1)) * 100)
                      );
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {goal.title}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {goal.inverse
                            ? goal.current === 0
                              ? "On track"
                              : `${goal.current} so far`
                            : `\( {goal.current}/ \){goal.target} ${goal.unit}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {goal.description}
                      </p>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            goal.inverse && goal.current > 0
                              ? "bg-red-400"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== General ===== */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              General
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                }
                label="Notifications"
                badge={unreadCount > 0 ? unreadCount : undefined}
                onClick={() => setShowNotifications((v) => !v)}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                }
                label="Language"
                value="English"
                disabled
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                }
                label="Light / Dark Mode"
                value={isDark ? "Dark" : "Light"}
                onClick={toggleTheme}
              />
            </div>

            {/* Notifications panel – order status updates reference Orders page */}
            {showNotifications && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Order Updates
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Status changes from your orders. Tap any item to open the
                      Orders page.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-gray-500 dark:text-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {ordersLoading && orderNotifications.length === 0 ? (
                  <div className="px-4 py-8 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Loading order updates...
                    </span>
                  </div>
                ) : orderNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No order updates yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/orders")}
                      className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium"
                    >
                      Go to My Orders
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                    {orderNotifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            goToOrder(n.orderId);
                          }}
                          className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            !n.read
                              ? "bg-indigo-50/60 dark:bg-indigo-900/20"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                !n.read ? "bg-indigo-500" : "bg-transparent"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Order #{n.orderNumber}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                                    n.status
                                  )}`}
                                >
                                  {getStatusLabel(n.status)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                {formatRelativeTime(n.createdAt)} · View on
                                Orders
                              </p>
                            </div>
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => navigate("/orders")}
                    className="w-full py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"
                  >
                    Open Orders Page
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===== Support & Info ===== */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              Support & Info
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                label="About"
                onClick={() => navigate("/about")}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                label="Games"
                onClick={() => navigate("/mini-game")}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
                label="Legal"
                onClick={() => navigate("/Legal")}
              />
              <SettingsRow
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                label="Help & Support"
                onClick={() => navigate("/support")}
              />
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 font-semibold rounded-2xl shadow-sm text-[15px] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;