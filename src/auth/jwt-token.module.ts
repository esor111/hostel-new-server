import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtTokenService } from './services/jwt-token.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_TOKEN'),
        signOptions: {
          // We don't generate tokens, only verify them
          // These options are for consistency but won't be used for signing
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtTokenService],
  exports: [JwtTokenService, JwtModule],
})
export class JwtTokenModule {}