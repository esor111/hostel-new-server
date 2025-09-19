import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Hostel authentication guard
 * Extends JwtAuthGuard to require Business Token with businessId
 * Used for hostel-specific endpoints that need hostel context
 */
@Injectable()
export class HostelAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First verify the JWT token
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Extract user from request
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // Verify that the token contains businessId (Business Token)
    if (!user.businessId) {
      throw new ForbiddenException(
        'Business token required for this endpoint. Please switch to a hostel profile.',
      );
    }

    return true;
  }
}