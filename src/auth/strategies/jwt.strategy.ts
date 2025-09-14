import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_TOKEN'),
    });
  }

  /**
   * Validate JWT payload and return user information
   * This method is called automatically by Passport after token verification
   * @param payload Decoded JWT payload
   * @returns User information to be attached to req.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validate required fields
    if (!payload.id || !payload.kahaId) {
      throw new UnauthorizedException('Invalid token payload structure');
    }

    // Return the payload to be attached to req.user
    return {
      id: payload.id,
      kahaId: payload.kahaId,
      businessId: payload.businessId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}