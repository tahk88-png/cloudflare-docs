import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * 
 * Extracts the current authenticated user from the request.
 * Can optionally extract a specific property from the user object.
 * 
 * Usage:
 * @CurrentUser() user: User           // Full user object
 * @CurrentUser('id') userId: string   // Just the ID
 * @CurrentUser('role') role: UserRole // Just the role
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
