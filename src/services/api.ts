/**
 * AGRIFLOW Unified API Client
 * 
 * Provides centralized HTTP communication with the FastAPI backend,
 * automatic JWT bearer token injection, comprehensive error normalization,
 * and network failure resiliency.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Standardized API Error Representation
 */
export class ApiError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public detail?: any;

  constructor(message: string, statusCode: number, errorCode?: string, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.detail = detail;
  }
}

/**
 * Executes an HTTP request against the AgriFlow API v1 endpoints.
 *
 * @param endpoint - API subpath starting with / (e.g. '/auth/login', '/centres')
 * @param method - HTTP verb ('GET', 'POST', 'PATCH', 'DELETE', etc.)
 * @param body - Optional JSON payload
 * @param customToken - Optional explicit token override
 * @returns Parsed JSON response of type T
 * @throws {ApiError} Structured error containing HTTP status code, error code, and user message
 */
export async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  customToken?: string
): Promise<T> {
  const token = customToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('agriflow_token') : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr: any) {
    // Intercept network/connectivity dropouts and CORS connection refusals
    throw new ApiError(
      'Network connection unavailable. Please check your internet connection or verify the backend server is running.',
      0,
      'NETWORK_UNAVAILABLE',
      netErr?.message
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let errorCode: string | undefined = undefined;

    try {
      const errJson = await response.json();
      if (errJson) {
        if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          // FastAPI / Pydantic validation error array
          errorDetail = errJson.detail
            .map((e: any) => `${e.loc?.slice(1).join('.') || 'field'}: ${e.msg}`)
            .join('; ');
          errorCode = 'VALIDATION_ERROR';
        } else if (errJson.message) {
          errorDetail = errJson.message;
        }

        if (errJson.errorCode || errJson.error_code) {
          errorCode = errJson.errorCode || errJson.error_code;
        }
      }
    } catch {
      // Fallback if response is plain text or HTML
      if (response.status === 401) {
        errorDetail = 'Session expired or invalid credentials. Please sign in again.';
        errorCode = 'UNAUTHORIZED';
      } else if (response.status === 403) {
        errorDetail = 'You do not have permission to perform this operation.';
        errorCode = 'FORBIDDEN';
      } else if (response.status === 404) {
        errorDetail = 'The requested resource was not found.';
        errorCode = 'NOT_FOUND';
      } else if (response.status >= 500) {
        errorDetail = 'An internal server error occurred. Please try again later.';
        errorCode = 'SERVER_ERROR';
      }
    }

    // Clean up expired token on 401 Unauthorized
    if (response.status === 401 && typeof localStorage !== 'undefined' && !customToken) {
      localStorage.removeItem('agriflow_token');
      localStorage.removeItem('agriflow_user');
    }

    throw new ApiError(errorDetail, response.status, errorCode);
  }

  // Handle empty 204 No Content responses safely
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
