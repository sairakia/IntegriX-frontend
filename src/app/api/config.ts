import axios from "axios";

axios.defaults.withCredentials = true;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:11000" : "");

export const getApiErrorMessage = (data: unknown, fallback: string) => {
  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const value = data as { message?: unknown; error?: unknown };

    if (typeof value.message === "string" && value.message.trim()) {
      return value.message;
    }

    if (typeof value.error === "string" && value.error.trim()) {
      return value.error;
    }
  }

  return fallback;
};
