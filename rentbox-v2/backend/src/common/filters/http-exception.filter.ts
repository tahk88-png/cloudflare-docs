import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global HTTP Exception Filter
 * 
 * Transforms all exceptions into consistent API responses.
 * Handles Prisma errors, validation errors, and custom exceptions.
 * 
 * PRINCIPLE: Plain language errors with clear next steps.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      action: 'If the problem persists, contact support.',
    };

    // Handle HttpException (NestJS built-in and custom)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          code: (exceptionResponse as any).code || this.getCodeFromStatus(status),
          message: (exceptionResponse as any).message || exception.message,
          action: (exceptionResponse as any).action,
          details: (exceptionResponse as any).details,
          alternatives: (exceptionResponse as any).alternatives,
          fallback: (exceptionResponse as any).fallback,
        };
      } else {
        errorResponse = {
          code: this.getCodeFromStatus(status),
          message: exceptionResponse,
        };
      }
    }

    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status: prismaStatus, response: prismaResponse } = this.handlePrismaError(exception);
      status = prismaStatus;
      errorResponse = prismaResponse;
    }

    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided.',
        action: 'Please check your input and try again.',
      };
    }

    // Log the error (with full details for internal debugging)
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${status}: ${errorResponse.message}`);
    }

    // Clean up undefined fields
    Object.keys(errorResponse).forEach(
      (key) => errorResponse[key] === undefined && delete errorResponse[key]
    );

    response.status(status).json({
      success: false,
      error: errorResponse,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    response: any;
  } {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          response: {
            code: 'DUPLICATE_ENTRY',
            message: 'This record already exists.',
            action: 'Please use different values or update the existing record.',
            details: { fields: error.meta?.target },
          },
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          response: {
            code: 'INVALID_REFERENCE',
            message: 'Referenced record does not exist.',
            action: 'Please verify the referenced ID is correct.',
          },
        };

      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          response: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.',
            action: 'Please verify the ID and try again.',
          },
        };

      case 'P2034':
        // Transaction conflict
        return {
          status: HttpStatus.CONFLICT,
          response: {
            code: 'TRANSACTION_CONFLICT',
            message: 'This operation conflicted with another. Please retry.',
            action: 'Wait a moment and try again.',
          },
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          response: {
            code: 'DATABASE_ERROR',
            message: 'A database error occurred.',
            action: 'Please try again. If the problem persists, contact support.',
          },
        };
    }
  }

  private getCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return statusCodes[status] || 'ERROR';
  }
}
