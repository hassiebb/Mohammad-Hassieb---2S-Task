export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export interface PaginationParams {
  limit?: number;
  offset?: number;
}
