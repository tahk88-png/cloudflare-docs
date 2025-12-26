import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return true;
  }
}
