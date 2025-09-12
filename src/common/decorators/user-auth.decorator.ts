import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

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
      throw new Error('User identification required');
    }
    
    return {
      email: userEmail,
      // In future: id, name, roles, etc. from JWT
    };
  },
);

/**
 * Decorator to document user authentication in Swagger
 * but in a less prominent way
 */
export const ApiUserAuth = () => {
  return ApiHeader({
    name: 'user-email',
    description: '🔒 Development only: User email (will be JWT in production)',
    required: true,
    example: 'user@example.com',
    schema: {
      type: 'string',
      format: 'email'
    }
  });
};
