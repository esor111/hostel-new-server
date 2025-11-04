import { Injectable, NestMiddleware, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HostelService } from '../hostel.service';
import { HostelContext } from '../decorators/hostel-context.decorator';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    kahaId: string;
    businessId?: string;
  };
  hostelContext?: HostelContext;
}

@Injectable()
export class HostelContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HostelContextMiddleware.name);

  constructor(private readonly hostelService: HostelService) { }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      this.logger.log(`🔧 Middleware called for ${req.method} ${req.url}`);
      this.logger.log(`🔍 Request headers: ${JSON.stringify(req.headers.authorization?.substring(0, 50))}`);
      this.logger.log(`🔍 req.user exists: ${!!req.user}`);
      this.logger.log(`🔍 req.user value: ${JSON.stringify(req.user)}`);

      // Skip hostel context for non-authenticated requests
      if (!req.user) {
        this.logger.warn('⚠️ No user in request, skipping hostel context - Guards should have set req.user');
        return next();
      }

      const { id: userId, kahaId, businessId } = req.user;
      this.logger.log(`👤 User found: ${userId}, businessId: ${businessId}`);

      // STRICT ENFORCEMENT: Reject requests without businessId
      if (!businessId) {
        this.logger.error(`❌ Hostel context failed: User ${userId} missing businessId in JWT token`);
        throw new ForbiddenException('Business context required. Please authenticate with a valid Business Token.');
      }

      this.logger.log(`🏨 Setting up hostel context for businessId: ${businessId}`);

      // Validate and ensure hostel exists
      const hostel = await this.hostelService.ensureHostelExists(businessId);

      // STRICT ENFORCEMENT: Reject invalid or inactive hostels
      if (!hostel || !hostel.isActive) {
        this.logger.error(`❌ Hostel context failed: Invalid or inactive hostel for businessId: ${businessId}`);
        throw new ForbiddenException('Invalid or inactive hostel. Please contact support.');
      }

      // Set hostel context in request
      req.hostelContext = {
        hostelId: hostel.id, // Use the actual hostel ID, not businessId
        businessId: businessId, // Include businessId for reference
        userId,
        kahaId
      };

      this.logger.log(`✅ Hostel context established: hostelId=${hostel.id}, businessId=${businessId}, userId=${userId}`);

      next();
    } catch (error) {
      this.logger.error(`❌ Error in hostel context middleware: ${error.message}`, error.stack);

      // Re-throw ForbiddenException and BadRequestException to client
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }

      // For unexpected errors, throw a generic error
      throw new BadRequestException('Failed to establish hostel context. Please try again.');
    }
  }
}