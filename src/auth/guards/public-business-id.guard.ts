import { Injectable, ExecutionContext, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { HostelService } from '../../hostel/hostel.service';

/**
 * Public guard that only requires businessId query parameter
 * No JWT token required - completely public endpoint
 */
@Injectable()
export class PublicBusinessIdGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => HostelService)) private readonly hostelService: HostelService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get businessId from query parameter
    const businessId = request.query?.businessId;
    
    if (!businessId) {
      throw new BadRequestException('businessId query parameter is required');
    }

    try {
      // Find or create hostel by businessId
      const hostel = await this.hostelService.ensureHostelExists(businessId);
      
      if (!hostel || !hostel.isActive) {
        throw new NotFoundException(`Hostel not found or inactive for businessId: ${businessId}`);
      }

      // Set minimal hostel context in request (no user info since no token)
      request.hostelContext = {
        hostelId: hostel.id,
        businessId: businessId,
        userId: null, // No user since no token
        kahaId: null  // No user since no token
      };

      console.log(`✅ Public hostel context established: hostelId=${hostel.id}, businessId=${businessId}, hostelName=${hostel.name}`);

      return true;
    } catch (error) {
      console.error('❌ Error in public business ID guard:', error);
      throw new NotFoundException(`Failed to find hostel for businessId: ${businessId}`);
    }
  }
}
