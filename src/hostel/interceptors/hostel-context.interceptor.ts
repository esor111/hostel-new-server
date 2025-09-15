import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { HostelService } from '../hostel.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    kahaId: string;
    businessId?: string;
  };
  hostelContext?: {
    hostelId: string;
    userId: string;
    kahaId: string;
  };
}

@Injectable()
export class HostelContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HostelContextInterceptor.name);

  constructor(private readonly hostelService: HostelService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      // Only set up hostel context if user is authenticated and has businessId
      if (request.user?.businessId) {
        const { id: userId, kahaId, businessId } = request.user;
        
        this.logger.log(`🏨 Setting up hostel context for businessId: ${businessId}`);

        // Validate and ensure hostel exists
        const hostel = await this.hostelService.ensureHostelExists(businessId);
        
        if (hostel && hostel.isActive) {
          // Set hostel context in request
          request.hostelContext = {
            hostelId: hostel.id, // Use the actual hostel ID, not businessId
            userId,
            kahaId
          };

          this.logger.log(`✅ Hostel context established: hostelId=${hostel.id}, businessId=${businessId}`);
        } else {
          this.logger.warn(`Invalid or inactive hostel for businessId: ${businessId}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error setting up hostel context:', error);
      // Continue without hostel context
    }

    return next.handle();
  }
}