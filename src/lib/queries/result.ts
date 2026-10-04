import { GENERIC_ERROR, getErrorMessage } from "@/lib/utils/errors";

export type QueryResult<T> = { data: T; error: string | null };

export function ok<T>(data: T): QueryResult<T> {
  return { data, error: null };
}

export function fail<T>(error: unknown, fallback?: string): QueryResult<T> {
  return {
    data: null as unknown as T,
    error: getErrorMessage(error, fallback ?? GENERIC_ERROR),
  };
}
