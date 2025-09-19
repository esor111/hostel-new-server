import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from './jwt-token.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    const validPayload: JwtPayload = {
      id: 'user123',
      kahaId: 'kaha456',
      businessId: 'hostel789',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should verify a valid token successfully', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.verify.mockReturnValue(validPayload);

      const result = service.verifyToken('valid-token');

      expect(result).toEqual(validPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
    });

    it('should throw UnauthorizedException when JWT secret is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => service.verifyToken('token')).toThrow(
        new UnauthorizedException('JWT secret not configured'),
      );
    });

    it('should throw UnauthorizedException for invalid payload structure (missing id)', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.verify.mockReturnValue({ kahaId: 'kaha456' });

      expect(() => service.verifyToken('token')).toThrow(
        new UnauthorizedException('Invalid token payload structure'),
      );
    });

    it('should throw UnauthorizedException for invalid payload structure (missing kahaId)', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.verify.mockReturnValue({ id: 'user123' });

      expect(() => service.verifyToken('token')).toThrow(
        new UnauthorizedException('Invalid token payload structure'),
      );
    });

    it('should handle TokenExpiredError', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken('expired-token')).toThrow(
        new UnauthorizedException('Token has expired'),
      );
    });

    it('should handle JsonWebTokenError', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken('invalid-token')).toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should handle NotBeforeError', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      const error = new Error('Token not active');
      error.name = 'NotBeforeError';
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken('not-active-token')).toThrow(
        new UnauthorizedException('Token not active yet'),
      );
    });

    it('should handle generic errors', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Generic error');
      });

      expect(() => service.verifyToken('token')).toThrow(
        new UnauthorizedException('Token verification failed'),
      );
    });
  });

  describe('hasBusinessContext', () => {
    it('should return true when businessId is present', () => {
      const payload: JwtPayload = {
        id: 'user123',
        kahaId: 'kaha456',
        businessId: 'hostel789',
      };

      expect(service.hasBusinessContext(payload)).toBe(true);
    });

    it('should return false when businessId is not present', () => {
      const payload: JwtPayload = {
        id: 'user123',
        kahaId: 'kaha456',
      };

      expect(service.hasBusinessContext(payload)).toBe(false);
    });

    it('should return false when businessId is empty string', () => {
      const payload: JwtPayload = {
        id: 'user123',
        kahaId: 'kaha456',
        businessId: '',
      };

      expect(service.hasBusinessContext(payload)).toBe(false);
    });
  });
});