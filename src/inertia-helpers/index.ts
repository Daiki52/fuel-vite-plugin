import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { client } from "laravel-precognition";

/** Default FuelPHP CSRF cookie name. */
const DEFAULT_COOKIE_NAME = "fuel_csrf_token";

/**
 * Read a cookie value by name.
 */
const getCookie = (name: string): string | undefined => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : undefined;
};

/**
 * Determine if the request should carry JSON payload.
 */
const hasJsonBody = (config: AxiosRequestConfig): boolean => {
  const headers = (config.headers ?? {}) as Record<string, unknown>;
  const contentType = headers["Content-Type"] ?? headers["content-type"];
  return !contentType || String(contentType).includes("application/json");
};

export type FuelCsrfOptions = {
  /** Cookie name that stores the FuelPHP CSRF token. */
  cookieName?: string;
  /** Axios instance to attach the interceptor to. */
  axiosInstance?: AxiosInstance;
};

/**
 * Attach FuelPHP CSRF token to an Axios instance and return the interceptor id.
 */
const attachCsrfInterceptor = (
  axiosInstance: AxiosInstance,
  cookieName: string
): number =>
  axiosInstance.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();
    if (!"post put patch delete".split(" ").includes(method)) {
      return config;
    }

    if (!hasJsonBody(config)) {
      return config;
    }

    const token = getCookie(cookieName);
    if (!token) {
      return config;
    }

    const data = config.data;

    if (data == null) {
      config.data = { [cookieName]: token };
      return config;
    }

    if (data instanceof FormData) {
      if (!data.has(cookieName)) {
        data.append(cookieName, token);
      }
      return config;
    }

    if (typeof data === "string") {
      try {
        const obj = JSON.parse(data) as Record<string, unknown>;
        config.data = JSON.stringify({ ...obj, [cookieName]: token });
      } catch {
        // ignore non-JSON strings
      }
      return config;
    }

    if (typeof data === "object") {
      config.data = { ...(data as Record<string, unknown>), [cookieName]: token };
      return config;
    }

    return config;
  });

/** Attach FuelPHP CSRF token to mutating Axios requests. */
export const setupFuelCsrf = ({
  cookieName = DEFAULT_COOKIE_NAME,
  axiosInstance = axios,
}: FuelCsrfOptions = {}): (() => void) => {
  const interceptorId = attachCsrfInterceptor(axiosInstance, cookieName);
  const precognitionAxios = client.axios();
  const precognitionInterceptorId =
    precognitionAxios === axiosInstance
      ? null
      : attachCsrfInterceptor(precognitionAxios, cookieName);

  return () => {
    axiosInstance.interceptors.request.eject(interceptorId);
    if (precognitionInterceptorId !== null) {
      precognitionAxios.interceptors.request.eject(precognitionInterceptorId);
    }
  };
};

/**
 * Resolve Inertia page components from a Vite glob map.
 * Based on: https://github.com/laravel/vite-plugin/blob/2.x/src/inertia-helpers/index.ts
 */
export const resolvePageComponent = async <T>(
  path: string | string[],
  pages: Record<string, Promise<T> | (() => Promise<T>)>
): Promise<T> => {
  for (const p of Array.isArray(path) ? path : [path]) {
    const page = pages[p];

    if (typeof page === "undefined") {
      continue;
    }

    return typeof page === "function" ? page() : page;
  }

  throw new Error(`Page not found: ${path}`);
};
