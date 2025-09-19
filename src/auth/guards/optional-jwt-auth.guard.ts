import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Optional JWT authentication guard
 * Allows both authenticated and unauthenticated requests
 * Sets req.user to null if no valid token is provided
 * Used for public endpoints with optional authentication features
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Override handleRequest to allow requests without authentication
   * @param err Error from authentication
   * @param user User payload from JWT
   * @param info Additional info from passport
   * @returns User payload or null for unauthenticated requests
   */
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, return null (allow unauthenticated)
    if (err || !user) {
      return null;
    }
    
    // Return user for authenticated requests
    return user;
  }
}