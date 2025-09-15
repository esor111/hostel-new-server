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

  constructor(private readonly hostelService: HostelService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Skip hostel context for non-authenticated requests
      if (!req.user) {
        this.logger.debug('No user in request, skipping hostel context');
        return next();
      }

      const { id: userId, kahaId, businessId } = req.user;

      // If no businessId, skip hostel context setup (optional hostel filtering)
      if (!businessId) {
        this.logger.debug(`User ${userId} accessing endpoint without businessId - using global data access`);
        return next();
      }

      this.logger.debug(`Setting up hostel context for businessId: ${businessId}`);

      // Validate and ensure hostel exists
      const hostel = await this.hostelService.ensureHostelExists(businessId);
      
      if (!hostel || !hostel.isActive) {
        this.logger.warn(`Invalid or inactive hostel for businessId: ${businessId} - falling back to global access`);
        return next();
      }

      // Set hostel context in request
      req.hostelContext = {
        hostelId: businessId, // businessId = hostelId
        userId,
        kahaId
      };

      this.logger.debug(`Hostel context established: hostelId=${businessId}, userId=${userId}`);
      
      next();
    } catch (error) {
      this.logger.error('Error in hostel context middleware:', error);
      
      // Instead of throwing errors, log them and continue without hostel context
      this.logger.warn(`Hostel context setup failed, continuing with global access: ${error.message}`);
      next();
    }
  }
}