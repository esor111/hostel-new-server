import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verify JWT token from kaha-main-v3 using shared secret
   * @param token JWT token to verify
   * @returns Decoded payload containing user and hostel information
   * @throws UnauthorizedException if token is invalid or expired
   */
  verifyToken(token: string): JwtPayload {
    try {
      const secret = this.configService.get<string>('JWT_SECRET_TOKEN');
      if (!secret) {
        throw new UnauthorizedException('JWT secret not configured');
      }
      
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      
      // Validate required fields
      if (!payload.id || !payload.kahaId) {
        throw new UnauthorizedException('Invalid token payload structure');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Handle JWT-specific errors
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }

      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Check if token has business context (hostelId)
   * @param payload JWT payload
   * @returns true if token contains businessId
   */
  hasBusinessContext(payload: JwtPayload): boolean {
    return !!payload.businessId;
  }
}