import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Custom decorator for user authentication
 * In development: extracts user email from header
 * In production: will extract user ID from JWT token
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // For now, get user email from header
    // TODO: Replace with JWT token extraction in production
    const userEmail = request.headers['user-email'];
    
    if (!userEmail) {
      throw new BadRequestException('User identification required. Please ensure you are properly authenticated.');
    }
    
    return {
      email: userEmail,
      // In future: id, name, roles, etc. from JWT
    };
  },
);

// Remove the ApiUserAuth decorator since we don't want it to show in Swagger
// The authentication will be handled internally by the CurrentUser decorator
