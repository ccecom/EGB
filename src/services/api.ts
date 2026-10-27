import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Attach a saved authentication token to API requests.
api.interceptors.request.use(
  (config) => {
    // Vite apps run in the browser. Guard the storage access in case this
    // module is ever evaluated in a non-browser environment.
    if (typeof window === "undefined") return config;

    const token =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("access_token");

    if (token) {
      // AxiosHeaders.set() is supported by Axios v1.
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Handle expired or invalid sessions. A 401 does not necessarily mean that
// every request should erase local state in all apps; this preserves the
// session-expired event used by the existing application.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("access_token");
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("admin");

      window.dispatchEvent(new Event("user_session_expired"));
    }

    return Promise.reject(error);
  },
);

// Return a readable message for API request errors.
export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (data && typeof data === "object") {
      const body = data as {
        detail?: unknown;
        message?: unknown;
        error?: unknown;
      };

      if (typeof body.detail === "string" && body.detail.trim()) {
        return body.detail;
      }

      if (typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }

      if (typeof body.error === "string" && body.error.trim()) {
        return body.error;
      }

      if (Array.isArray(body.detail)) {
        return body.detail
          .map((item: unknown) => {
            if (
              item &&
              typeof item === "object" &&
              "msg" in item &&
              typeof item.msg === "string"
            ) {
              return item.msg;
            }

            try {
              return JSON.stringify(item);
            } catch {
              return String(item);
            }
          })
          .join(", ");
      }
    }

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return "The request timed out. Please try again.";
    }

    if (!error.response) {
      return `Unable to connect to the server. Check your connection and API URL (${API_BASE_URL}).`;
    }

    if (error.response.status >= 500) {
      return "The server encountered an error. Please try again later.";
    }

    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// Supports both named and default imports used throughout the project.
export { api };
export default api;
