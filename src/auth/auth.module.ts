import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtTokenModule } from './jwt-token.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HostelAuthGuard } from './guards/hostel-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtTokenModule,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    HostelAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    JwtTokenModule,
    JwtAuthGuard,
    HostelAuthGuard,
    OptionalJwtAuthGuard,
    PassportModule,
  ],
})
export class AuthModule {}