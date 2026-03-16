// ============================================================
// API Response Helper
// ============================================================

import { ApiResponse } from '../types';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Creates a standardized API Gateway response.
 */
export function createResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/** 200 OK */
export function success(data: unknown, message = 'Success'): ApiResponse {
  return createResponse(200, { success: true, message, data });
}

/** 201 Created */
export function created(data: unknown, message = 'Created successfully'): ApiResponse {
  return createResponse(201, { success: true, message, data });
}

/** 400 Bad Request */
export function badRequest(message = 'Bad request'): ApiResponse {
  return createResponse(400, { success: false, message });
}

/** 401 Unauthorized */
export function unauthorized(message = 'Unauthorized'): ApiResponse {
  return createResponse(401, { success: false, message });
}

/** 404 Not Found */
export function notFound(message = 'Resource not found'): ApiResponse {
  return createResponse(404, { success: false, message });
}

/** 500 Internal Server Error */
export function serverError(message = 'Internal server error'): ApiResponse {
  return createResponse(500, { success: false, message });
}
