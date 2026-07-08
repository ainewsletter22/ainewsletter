export type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as ApiErrorLike;
  return maybeError.response?.data?.message || maybeError.response?.data?.error || maybeError.message || fallback;
}

export function unwrapList<T>(rawData: unknown): T[] {
  if (Array.isArray(rawData)) return rawData as T[];

  if (rawData && typeof rawData === "object") {
    const record = rawData as Record<string, unknown>;
    const candidates = [record.results, record.categories, record.clients, record.leads, record.data];
    const match = candidates.find(Array.isArray);
    if (match) return match as T[];
  }

  return [];
}

export function safeStr(value: unknown, fallback = "@NONE"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (text === "" || text === "null" || text === "undefined" || text === "@NONE") return fallback;
  return text;
}

