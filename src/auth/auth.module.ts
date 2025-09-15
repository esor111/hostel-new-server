import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtTokenModule } from './jwt-token.module';
import { HostelModule } from '../hostel/hostel.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HostelAuthGuard } from './guards/hostel-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { HostelAuthWithContextGuard } from './guards/hostel-auth-with-context.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtTokenModule,
    HostelModule,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    HostelAuthGuard,
    OptionalJwtAuthGuard,
    HostelAuthWithContextGuard,
  ],
  exports: [
    JwtTokenModule,
    JwtAuthGuard,
    HostelAuthGuard,
    OptionalJwtAuthGuard,
    HostelAuthWithContextGuard,
    PassportModule,
  ],
})
export class AuthModule {}