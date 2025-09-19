import { Injectable, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { HostelService } from '../../hostel/hostel.service';

/**
 * Enhanced Hostel authentication guard that also sets up hostel context
 * Combines JWT authentication with hostel context setup
 */
@Injectable()
export class HostelAuthWithContextGuard extends JwtAuthGuard {
  constructor(
    @Inject(HostelService) private readonly hostelService: HostelService
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
    console.log("userrrrrrrr", request.user)
    const user: JwtPayload = request.user;

    // Verify that the token contains businessId (Business Token)
    if (!user.businessId) {
      throw new ForbiddenException(
        'Business token required for this endpoint. Please switch to a hostel profile.',
      );
    }

    try {
      // Set up hostel context
      const hostel = await this.hostelService.ensureHostelExists(user.businessId);
      
      if (!hostel || !hostel.isActive) {
        throw new ForbiddenException(
          `Invalid or inactive hostel for businessId: ${user.businessId}`,
        );
      }

      // Set hostel context in request
      request.hostelContext = {
        hostelId: hostel.id, // Use the actual database hostel ID
        businessId: user.businessId, // Keep businessId for reference
        userId: user.id,
        kahaId: user.kahaId
      };

      console.log(`✅ Hostel context established in guard: hostelId=${hostel.id}, businessId=${user.businessId}, hostelName=${hostel.name}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error setting up hostel context in guard:', error);
      throw new ForbiddenException(
        `Failed to set up hostel context: ${error.message}`,
      );
    }
  }
}