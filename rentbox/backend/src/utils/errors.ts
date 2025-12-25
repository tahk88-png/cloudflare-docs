export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class AvailabilityError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'AVAILABILITY_ERROR', details);
    this.name = 'AvailabilityError';
  }
}

export class CartExpiredError extends AppError {
  constructor() {
    super('Cart has expired', 410, 'CART_EXPIRED');
    this.name = 'CartExpiredError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, 'PAYMENT_ERROR', details);
    this.name = 'PaymentError';
  }
}
