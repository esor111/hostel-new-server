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

      // Check if businessId exists (Business Token)
      if (!businessId) {
        this.logger.warn(`User ${userId} attempted to access hostel-scoped endpoint without businessId`);
        throw new ForbiddenException('Business token required for hostel-scoped operations');
      }

      this.logger.debug(`Setting up hostel context for businessId: ${businessId}`);

      // Validate and ensure hostel exists
      const hostel = await this.hostelService.ensureHostelExists(businessId);
      
      if (!hostel || !hostel.isActive) {
        this.logger.error(`Invalid or inactive hostel for businessId: ${businessId}`);
        throw new ForbiddenException('Invalid or inactive hostel');
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
      
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Log security violations
      this.logger.error(`Security violation: Hostel context validation failed for user ${req.user?.id}`, {
        userId: req.user?.id,
        businessId: req.user?.businessId,
        error: error.message,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw new ForbiddenException('Hostel access validation failed');
    }
  }
}