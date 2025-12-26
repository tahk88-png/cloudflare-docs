import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Interceptor
 * 
 * Ensures every request has a unique ID for tracing.
 * Uses client-provided X-Request-ID or generates one.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Use existing request ID or generate new one
    const requestId = request.headers['x-request-id'] || `req_${uuidv4()}`;
    
    // Attach to request for use in handlers
    request.headers['x-request-id'] = requestId;
    
    // Include in response headers
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}
