import { Injectable, ExecutionContext, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { HostelService } from '../../hostel/hostel.service';

/**
 * Flexible Hostel authentication guard that supports both:
 * 1. Business token authentication (businessId in JWT)
 * 2. Query parameter authentication (businessId in query)
 * 
 * This guard is specifically designed for endpoints that need to support
 * both authenticated users with business tokens AND direct API calls with businessId
 */
@Injectable()
export class FlexibleHostelAuthGuard extends JwtAuthGuard {
  constructor(
    @Inject(forwardRef(() => HostelService)) private readonly hostelService: HostelService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First verify the JWT token
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Extract user and request from context
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // Check if businessId is provided in query parameter as alternative
    const businessIdFromQuery = request.query?.businessId;

    // Verify that either token contains businessId OR businessId is provided in query
    if (!user.businessId && !businessIdFromQuery) {
      throw new ForbiddenException(
        'Either business token or businessId query parameter is required for this endpoint.',
      );
    }

    try {
      // Use businessId from token or query parameter
      const businessId = user.businessId || businessIdFromQuery;
      
      // Set up hostel context
      const hostel = await this.hostelService.ensureHostelExists(businessId);

      if (!hostel || !hostel.isActive) {
        throw new ForbiddenException(
          `Invalid or inactive hostel for businessId: ${businessId}`,
        );
      }

      // Set hostel context in request
      request.hostelContext = {
        hostelId: hostel.id, // Use the actual database hostel ID
        businessId: businessId, // Keep businessId for reference
        userId: user.id,
        kahaId: user.kahaId
      };

      console.log(`✅ Flexible hostel context established: hostelId=${hostel.id}, businessId=${businessId}, hostelName=${hostel.name}`);

      return true;
    } catch (error) {
      console.error('❌ Error setting up flexible hostel context:', error);
      throw new ForbiddenException(
        `Failed to set up hostel context: ${error.message}`,
      );
    }
  }
}
